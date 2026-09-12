"""Local connected classroom adapter; private staff state, allowlisted student views.

Intentionally separate from the independently developed assessment/job pipeline.
Uses its authentication, PDF validation and private file store, never public uploads.
"""

from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, ForeignKey, Integer, String, update
from sqlalchemy.orm import Mapped, Session, mapped_column

from . import pdf, storage
from .auth import bearer, course_role, current_user, require_staff
from .config import settings
from .db import Base, get_db
from .models import Document, User


class Classroom(Base):
    __tablename__ = "classroom_workspaces"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), unique=True)
    revision: Mapped[int] = mapped_column(Integer, default=0)
    state: Mapped[dict] = mapped_column(JSON)


DB = Annotated[Session, Depends(get_db)]
app = FastAPI(title="Verity connected classroom")
app.state.open_demo = False
ROOT = Path(__file__).resolve().parents[2] / "frontend"


async def classroom_actor(request: Request, db: DB):
    if request.app.state.open_demo:
        role = request.headers.get("X-Verity-Demo-Role", "student")
        if role not in {"student", "teacher"}:
            raise HTTPException(422, "Choose the student or teacher demo perspective")
        if request.method not in {"GET", "HEAD"} and "X-Verity-Demo-Role" not in request.headers:
            raise HTTPException(403, "Demo writes require an explicit perspective header")
        actor_id = getattr(request.app.state, "demo_users", {}).get(role)
        if role == "student":
            room = db.get(Classroom, "classroom")
            roster = room.state.get("demoStudents", []) if room else []
            if roster:
                actor_id = request.headers.get("X-Verity-Demo-Student", roster[0]["id"])
                if actor_id not in {s["id"] for s in roster}:
                    raise HTTPException(403, "Choose a student from the synthetic demo roster")
        actor = db.get(User, actor_id) if actor_id else None
        if not actor:
            raise HTTPException(503, "Start the classroom using run_classroom.py")
        return actor
    return current_user(await bearer(request), db)


Actor = Annotated[User, Depends(classroom_actor)]


@app.get("/classroom/demo")
def demo_mode(db: DB):
    result = {"enabled": app.state.open_demo}
    if app.state.open_demo:
        room = db.get(Classroom, "classroom")
        roster = room.state.get("demoStudents", []) if room else []
        if roster:
            result["students"] = [
                {"id": s["id"], "name": s["name"], "new": s["new"]} for s in roster
            ]
    return result


def now():
    return datetime.now(timezone.utc).isoformat()


def room_for(db, actor):
    room = db.get(Classroom, "classroom")
    if room is None:
        raise HTTPException(503, "Classroom has not been provisioned")
    course_role(db, actor, room.course_id)
    return room


def mutate(db, room, state, expected, revision=None):
    revision = revision or expected + 1
    state["revision"] = revision
    state["updatedAt"] = now()
    changed = db.execute(
        update(Classroom)
        .where(Classroom.id == room.id, Classroom.revision == expected)
        .values(state=state, revision=revision),
        execution_options={"synchronize_session": False},
    ).rowcount
    if changed != 1:
        raise HTTPException(409, "Workspace changed. Reload to preserve the other person's work.")
    return state


def active(state):
    return state.get("versions", [])[-1] if state.get("versions") else None


def public_assignment(state, version=None):
    version = version or active(state)
    if not version:
        return None
    return {
        "id": "classroom",
        "version": version["id"],
        "title": version.get("title", state["title"]),
        "course": state["course"],
        "code": "Connected course",
        "subtitle": f"Published standard v{version['id']}",
        "blank": version.get("documents", {}).get("blank", {}).get("remoteId"),
        "questions": [
            {
                "id": q["id"],
                "number": i + 1,
                "title": q["title"],
                "prompt": q["prompt"],
                "points": round(sum(c["max"] for c in q["criteria"]), 2),
            }
            for i, q in enumerate(version["questions"])
        ],
    }


CATEGORIES = {
    "logic": ("Logic error", "One step in your reasoning may need another look."),
    "conceptual": ("Concept error", "Revisit the concept used in this question."),
    "notation": ("Notation error", "Some notation may be incomplete or ambiguous."),
    "formatting": ("Formatting error", "Check the course's presentation requirements."),
    "missing": ("Missing work", "Some supporting work may be missing."),
    "missing work": ("Missing work", "Some supporting work may be missing."),
    "missing-work": ("Missing work", "Some supporting work may be missing."),
    "presentation": ("Presentation", "Check how you present and label your work."),
    "method": ("Method", "Check the method requested for this question."),
    "arithmetic": ("Calculation error", "Check the calculations in this question."),
}


def student_attempt(state, attempt):
    version = next(v for v in state["versions"] if v["id"] == attempt["version"])
    questions, findings = [], []
    for q in version["questions"]:
        review = attempt["questions"].get(q["id"], {})
        score, resolved = 0, True
        for criterion in q["criteria"]:
            result = review.get("results", {}).get(criterion["id"], {})
            band = next((b for b in criterion["bands"] if b["id"] == result.get("band")), None)
            if band is None:
                resolved = False
                continue
            score += band["points"]
            if band["points"] < criterion["max"]:
                category, message = CATEGORIES.get(
                    result.get("category", criterion.get("category", ""))
                    .lower()
                    .replace(" error", ""),
                    ("Work to revisit", "Review your work on this question with your TA."),
                )
                # No private rubric labels, rationales, expected answers or invented PDF coordinates.
                findings.append(
                    {
                        "id": f"{q['id']}:finding-{len(findings) + 1}",
                        "questionId": q["id"],
                        "category": category,
                        "message": message,
                        "pageIndex": review.get("pages", [1])[0] - 1,
                        "scope": "question",
                    }
                )
                anchor = result.get("anchor")
                if (
                    isinstance(anchor, dict)
                    and type(anchor.get("pageIndex")) is int
                    and anchor.get("pageIndex", -1) + 1 in review.get("pages", [])
                    and all(
                        isinstance(anchor.get(k), (int, float)) and 0 <= anchor[k] <= 1
                        for k in ("x", "y")
                    )
                ):
                    findings[-1].update({k: anchor[k] for k in ("pageIndex", "x", "y")})
                    findings[-1]["scope"] = "location"
        questions.append({"id": q["id"], "score": round(score, 2) if resolved else None})
    complete = all(q["score"] is not None for q in questions)
    assessed = any(
        r.get("band") for q in attempt["questions"].values() for r in q["results"].values()
    )
    result = {
        "source": attempt.get("assessmentSource", "staff"),
        "estimatedScore": round(sum(q["score"] for q in questions), 2) if complete else None,
        "maxScore": sum(q["points"] for q in public_assignment(state, version)["questions"]),
        "questions": questions,
        "findings": findings,
        "reviewed": bool(attempt.get("reviewedAt")),
    }
    return {
        "id": attempt["id"],
        "number": attempt["revision"],
        "createdAt": attempt["at"],
        "fileName": attempt["pdf"]["name"],
        "documentId": attempt["pdf"]["remoteId"],
        "mapping": {qid: [p - 1 for p in q["pages"]] for qid, q in attempt["questions"].items()},
        "final": attempt["final"],
        "sample": False,
        "assignment": public_assignment(state, version),
        "result": result if assessed else None,
    }


@app.middleware("http")
async def security_headers(request: Request, call_next):
    # Bearer-only mutation routes: cookies and origin-supplied role flags grant nothing.
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


@app.get("/classroom/me")
def me(db: DB, actor: Actor):
    room = room_for(db, actor)
    return {"name": actor.name, "role": course_role(db, actor, room.course_id)}


@app.get("/classroom/workspace")
def workspace(db: DB, actor: Actor):
    room = room_for(db, actor)
    require_staff(db, actor, room.course_id)
    return room.state


class WorkspaceSave(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedRevision: int = Field(ge=0)
    state: dict


@app.put("/classroom/workspace")
def save_workspace(body: WorkspaceSave, db: DB, actor: Actor):
    room = room_for(db, actor)
    require_staff(db, actor, room.course_id)
    state = body.state
    if body.expectedRevision != room.revision:
        raise HTTPException(409, "Another user changed the workspace. Reload before saving.")
    if state.get("schema") != 1 or not all(
        k in state for k in ("versions", "documents", "draft", "submissions")
    ):
        raise HTTPException(422, "Invalid staff workspace")
    # Existing published standards are immutable; revisions need a new version.
    prior_versions = room.state["versions"]
    if state["versions"][: len(prior_versions)] != prior_versions:
        raise HTTPException(422, "Published standards cannot be replaced. Publish a new version.")
    # UI demo/reset controls may not erase actual student records or edit their source work.
    attempts = {a["id"]: a for s in state["submissions"] for a in s["attempts"]}
    for student in room.state["submissions"]:
        for before in student["attempts"]:
            if before.get("source") != "upload":
                continue
            after = attempts.get(before["id"])
            if not after or any(
                after.get(k) != before.get(k) for k in ("pdf", "at", "version", "revision", "final")
            ):
                raise HTTPException(422, "Student uploads and hand-ins cannot be overwritten.")
            for qid, q in before["questions"].items():
                if any(
                    after["questions"].get(qid, {}).get(k) != q.get(k) for k in ("pages", "work")
                ):
                    raise HTTPException(
                        422, "Student page mappings and original work are immutable."
                    )
    if not isinstance(state.get("revision"), int) or state["revision"] <= body.expectedRevision:
        raise HTTPException(422, "Workspace revision must increase")
    return mutate(db, room, state, body.expectedRevision, state["revision"])


@app.get("/classroom/student")
def student_workspace(db: DB, actor: Actor):
    room = room_for(db, actor)
    if course_role(db, actor, room.course_id) != "student":
        raise HTTPException(403, "Student account required")
    student = next((s for s in room.state["submissions"] if s["id"] == actor.id), None)
    return {
        "revision": room.revision,
        "assignment": public_assignment(room.state),
        "attempts": [
            student_attempt(room.state, a)
            for a in reversed(student["attempts"])
            if a.get("source") == "upload"
        ]
        if student
        else [],
    }


@app.post("/classroom/files", status_code=201)
async def upload_file(file: UploadFile, db: DB, actor: Actor):
    room = room_for(db, actor)
    kind = "submission" if course_role(db, actor, room.course_id) == "student" else "reference"
    raw = await file.read(settings().max_upload_bytes + 1)
    doc = pdf.ingest(db, raw, room.course_id, actor.id, kind)
    return {
        "id": doc.id,
        "remoteId": doc.id,
        "name": Path(file.filename or "work.pdf").name,
        "pageCount": len(doc.pages),
        "sample": False,
    }


@app.get("/classroom/files/{document_id}")
def document_file(document_id: str, db: DB, actor: Actor):
    room = room_for(db, actor)
    doc = db.get(Document, document_id)
    if doc is None or doc.course_id != room.course_id:
        raise HTTPException(404, "PDF not found")
    role = course_role(db, actor, room.course_id)
    published_blanks = {
        v.get("documents", {}).get("blank", {}).get("remoteId") for v in room.state["versions"]
    }
    if role == "student" and not (
        doc.kind == "submission" and doc.owner_id == actor.id or doc.id in published_blanks
    ):
        raise HTTPException(404, "PDF not found")
    return Response(storage.get(doc.storage_key), media_type="application/pdf")


class AttemptCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=16, max_length=80)
    documentId: str
    version: int
    mapping: dict[str, list[int]]
    fileName: str = Field(max_length=200)


@app.post("/classroom/attempts", status_code=201)
def submit_attempt(body: AttemptCreate, db: DB, actor: Actor):
    room = room_for(db, actor)
    if course_role(db, actor, room.course_id) != "student":
        raise HTTPException(403, "Student account required")
    state = deepcopy(room.state)
    student = next((s for s in state["submissions"] if s["id"] == actor.id), None)
    if student:
        previous = next((a for a in student["attempts"] if a["id"] == body.id), None)
        if previous:
            projected = student_attempt(state, previous)
            if (
                projected["documentId"] != body.documentId
                or projected["mapping"] != body.mapping
                or previous["version"] != body.version
            ):
                raise HTTPException(409, "Submission ID already used for different work")
            return projected
    version = active(state)
    if not version or version["id"] != body.version:
        raise HTTPException(
            409, "The assignment changed. Reload and assign your pages to the latest questions."
        )
    doc = db.get(Document, body.documentId)
    if (
        not doc
        or doc.owner_id != actor.id
        or doc.kind != "submission"
        or doc.course_id != room.course_id
    ):
        raise HTTPException(404, "Your PDF was not found")
    if set(body.mapping) != {q["id"] for q in version["questions"]} or any(
        not pages
        or len(set(pages)) != len(pages)
        or any(p < 0 or p >= len(doc.pages) for p in pages)
        for pages in body.mapping.values()
    ):
        raise HTTPException(422, "Assign valid PDF pages to every question")
    if student is None:
        student = {"id": actor.id, "name": actor.name, "attempts": []}
        state["submissions"].append(student)
    attempt = {
        "id": body.id,
        "revision": len(student["attempts"]) + 1,
        "version": version["id"],
        "source": "upload",
        "final": False,
        "reviewedAt": None,
        "at": now(),
        "pdf": {
            "id": doc.id,
            "remoteId": doc.id,
            "name": body.fileName,
            "pageCount": len(doc.pages),
        },
        "questions": {
            q["id"]: {
                "pages": [p + 1 for p in body.mapping[q["id"]]],
                "work": "Original uploaded PDF. Review the mapped pages.",
                "skimmed": False,
                "results": {
                    c["id"]: {
                        "band": None,
                        "proposed": None,
                        "reason": "",
                        "evidence": "",
                        "unclear": False,
                        "dispute": None,
                    }
                    for c in q["criteria"]
                },
            }
            for q in version["questions"]
        },
    }
    student["attempts"].append(attempt)
    state["log"].append(
        {
            "at": now(),
            "actor": actor.name,
            "action": "Student practice uploaded",
            "detail": f"Revision {attempt['revision']}",
        }
    )
    mutate(db, room, state, room.revision)
    return student_attempt(state, attempt)


@app.post("/classroom/attempts/{attempt_id}/final")
def hand_in(attempt_id: str, db: DB, actor: Actor):
    room = room_for(db, actor)
    if course_role(db, actor, room.course_id) != "student":
        raise HTTPException(403, "Student account required")
    state = deepcopy(room.state)
    student = next((s for s in state["submissions"] if s["id"] == actor.id), None)
    attempt = (
        next((a for a in student["attempts"] if a["id"] == attempt_id), None) if student else None
    )
    if not attempt:
        raise HTTPException(404, "Submission not found")
    if attempt != student["attempts"][-1] or attempt["version"] != active(state)["id"]:
        raise HTTPException(
            409, "Only the latest attempt under the current standard can be handed in"
        )
    if not attempt["final"]:
        attempt["final"] = True
        state["log"].append(
            {
                "at": now(),
                "actor": actor.name,
                "action": "Final submission handed in",
                "detail": f"Revision {attempt['revision']}",
            }
        )
        mutate(db, room, state, room.revision)
    return student_attempt(state, attempt)


# Serve only known UI assets. Private PDFs, source fixtures, databases and .env files
# are not inside any public static mount. The staff's sample references require auth.
@app.get("/classroom/sample/{name}")
def sample_reference(name: str, db: DB, actor: Actor):
    room = room_for(db, actor)
    require_staff(db, actor, room.course_id)
    if name not in {"questions", "solution", "past-graded"}:
        raise HTTPException(404, "Sample not found")
    return FileResponse(ROOT / "output/pdf/row-case" / f"{name}.pdf")


@app.get("/")
@app.get("/teacher/")
@app.get("/student/")
def page(request: Request):
    if request.url.path == "/" and request.app.state.open_demo:
        return RedirectResponse("/student/", status_code=307)
    name = (
        "teacher.html"
        if request.url.path == "/teacher/"
        else "student.html"
        if request.url.path == "/student/"
        else "login.html"
    )
    return FileResponse(ROOT / "connected" / name)


@app.get("/staff/{name}")
def staff_asset(name: str):
    if name not in {
        "app.mjs",
        "model.mjs",
        "view.mjs",
        "storage.mjs",
        "api.mjs",
        "case.mjs",
        "case-view.mjs",
        "row-check.mjs",
        "styles.css",
    }:
        raise HTTPException(404)
    return FileResponse(
        ROOT / "staff" / name, media_type="text/javascript" if name.endswith(".mjs") else "text/css"
    )


app.mount("/connected", StaticFiles(directory=ROOT / "connected"), name="connected")
app.mount("/student-assets", StaticFiles(directory=ROOT / "student"), name="student-assets")
