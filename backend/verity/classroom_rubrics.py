"""Opt-in rubric jobs for the connected classroom, separate from grading jobs."""

import time
from decimal import Decimal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictBool
from sqlalchemy import JSON, Float, String, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column, sessionmaker

from .auth import require_staff
from .config import settings
from .db import Base
from .models import Document
from .providers import ProviderFailure
from .rubric_drafting import MAX_REFERENCE_PAGES, PROMPT_VERSION, generate


class DraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedRevision: int = Field(ge=0)
    consent: StrictBool
    requestId: str = Field(min_length=16, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")


class ClassroomRubricDraft(Base):
    __tablename__ = "classroom_rubric_drafts"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    course_id: Mapped[str] = mapped_column(String(36), index=True)
    # A DB uniqueness constraint prevents two concurrent paid requests for one classroom.
    active_course: Mapped[str | None] = mapped_column(String(36), unique=True)
    created_at: Mapped[float] = mapped_column(Float, default=time.time)
    status: Mapped[str] = mapped_column(String(20), default="running")
    inputs: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict] = mapped_column(JSON, default=dict)


ERRORS = {
    "rubric_reference_limit": "Too many reference pages or too much PDF content. Use up to 30 PDFs / 160 pages, with smaller images.",
    "rubric_reference_changed": "A reference changed. Reattach it and generate a new draft.",
    "rubric_question_mismatch": "The model missed a question. No draft was applied; review the question prompts before retrying.",
    "rubric_point_mismatch": "The model changed the point allocation. No draft was applied; clarify the allocation before retrying.",
    "rubric_invalid_source": "The model returned an unsupported source page. No draft was applied.",
    "model_refused_or_incomplete": "The model did not finish a valid rubric. Nothing was applied. You can explicitly try again.",
    "model_request_failed": "The model request failed or timed out. Nothing was applied; a retry may incur another charge.",
    "interrupted": "Draft generation was interrupted. Nothing was applied. A new request may incur another charge.",
}


def view(job):
    return {
        "id": job.id,
        "status": job.status,
        "revision": job.inputs["revision"],
        "spec": job.result.get("spec"),
        "coverage": job.inputs["coverage"],
        "provenance": job.result.get("provenance"),
        "error": job.result.get("error"),
    }


def staff_room(db, actor):
    from .classroom import room_for

    room = room_for(db, actor)
    require_staff(db, actor, room.course_id, instructor=True)
    return room


def get_draft(db, actor, draft_id):
    room = staff_room(db, actor)
    job = db.get(ClassroomRubricDraft, draft_id)
    if not job or job.course_id != room.course_id:
        raise HTTPException(404, "Rubric draft not found")
    if job.status == "running" and time.time() - job.created_at > 660:
        job.status, job.active_course = "failed", None
        job.result = {"error": ERRORS["interrupted"]}
    return view(job)


def create_draft(db, actor, body, background):
    room = staff_room(db, actor)
    if not body.consent:
        raise HTTPException(
            422, "Confirm permission to send the reference PDFs to the AI provider."
        )
    existing = db.get(ClassroomRubricDraft, body.requestId)
    if existing:
        if (
            existing.course_id != room.course_id
            or existing.inputs["revision"] != body.expectedRevision
        ):
            raise HTTPException(409, "This request ID belongs to a different draft.")
        return get_draft(db, actor, existing.id)
    if room.revision != body.expectedRevision:
        raise HTTPException(409, "Workspace changed. Reload before generating a draft.")
    cfg = settings()
    if not cfg.external_ai_enabled:
        raise HTTPException(
            409,
            "AI drafting is off. Restart the local server with --allow-ai to enable consented requests.",
        )
    if not cfg.openai_api_key:
        raise HTTPException(
            409, "Configure OPENAI_API_KEY on the server before generating a draft."
        )
    db.execute(
        update(ClassroomRubricDraft)
        .where(
            ClassroomRubricDraft.active_course == room.course_id,
            ClassroomRubricDraft.created_at < time.time() - 660,
        )
        .values(status="failed", active_course=None, result={"error": ERRORS["interrupted"]})
    )
    state = room.state
    documents = state["documents"]
    refs = [documents.get("blank"), documents.get("solution"), *documents.get("examples", [])]
    if not all(refs) or not 2 <= len(refs) <= 30:
        raise HTTPException(
            422, "Attach the blank assignment and professor solution (up to 30 references total)."
        )
    ids, pages = [], 0
    for ref in refs:
        doc = db.get(Document, ref.get("remoteId", ""))
        if (
            not doc
            or doc.course_id != room.course_id
            or doc.kind not in {"reference", "assignment", "answer_key", "standard"}
        ):
            raise HTTPException(
                422, "Use saved instructor reference PDFs, not student submissions."
            )
        if doc.id not in ids:
            ids.append(doc.id)
            pages += len(doc.pages)
    if pages > MAX_REFERENCE_PAGES:
        raise HTTPException(422, ERRORS["rubric_reference_limit"])
    questions = []
    for q in state["draft"]:
        if not q.get("prompt", "").strip():
            raise HTTPException(422, "Add each question prompt before generating a rubric.")
        question = {
            k: q.get(k)
            for k in (
                "id",
                "prompt",
                "expected",
                "alternatives",
                "assignmentPages",
                "solutionPages",
            )
        }
        if q.get("criteria"):
            try:
                points = [Decimal(str(c["max"])) for c in q["criteria"]]
                if any(not p.is_finite() or p <= 0 or p > 10000 for p in points):
                    raise ValueError("Invalid point maximum")
                question["max_points"] = str(sum(points))
            except (ValueError, ArithmeticError, KeyError):
                raise HTTPException(
                    422, "Fix invalid criterion point values before generating a draft."
                ) from None
        questions.append(question)
    if not 1 <= len(questions) <= 30:
        raise HTTPException(422, "Add between 1 and 30 question prompts first.")
    job = ClassroomRubricDraft(
        id=body.requestId,
        course_id=room.course_id,
        active_course=room.course_id,
        inputs={
            "revision": room.revision,
            "questions": questions,
            "document_ids": ids,
            "reference_roles": {
                ref["remoteId"]: "assignment" if i == 0 else "answer_key" if i == 1 else "standard"
                for i, ref in enumerate(refs)
            },
            "instructions": state["instructions"],
            "coverage": {"documents": len(ids), "pages": pages},
        },
        result={},
    )
    db.add(job)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "A rubric draft is already running. Wait for it to finish before starting another."
        ) from None
    background.add_task(run_draft, job.id, sessionmaker(bind=db.get_bind(), expire_on_commit=False))
    return view(job)


def run_draft(draft_id, factory):
    # An isolated snapshot, never the mutable workspace or its student/hidden-key records.
    with factory() as db:
        job = db.get(ClassroomRubricDraft, draft_id)
        if not job or job.status != "running":
            return
        inputs = job.inputs
        documents = [db.get(Document, id) for id in inputs["document_ids"]]
        db.expunge_all()
    # Close the read transaction before the long provider request so students can keep saving.
    try:
        for doc in documents:
            doc.rubric_role = inputs["reference_roles"].get(doc.id, doc.kind)
        spec = generate(inputs["questions"], documents, inputs["instructions"])
        result = {
            "spec": spec.model_dump(mode="json"),
            "provenance": {"model": settings().openai_model, "prompt_version": PROMPT_VERSION},
        }
        status = "succeeded"
    except Exception as error:
        code = error.code if isinstance(error, ProviderFailure) else "model_request_failed"
        result, status = {"error": ERRORS.get(code, ERRORS["model_request_failed"])}, "failed"
    with factory() as db:
        db.execute(
            update(ClassroomRubricDraft)
            .where(ClassroomRubricDraft.id == draft_id, ClassroomRubricDraft.status == "running")
            .values(result=result, status=status, active_course=None)
        )
        db.commit()
