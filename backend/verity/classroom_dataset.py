"""Explicit, repeatable import of the user-supplied synthetic Homework 1 dataset."""

import hashlib
import json
import re
from copy import deepcopy
from pathlib import Path

import pymupdf
from sqlalchemy import select

from . import pdf
from .classroom import Classroom, mutate, now
from .models import Course, Document, Membership, User, uid

MAXIMA = {
    f"{n}{chr(97 + i)}": m
    for n, values in enumerate(
        [[1, 1, 3], [1, 1, 1, 1, 1, 1], [3, 3], [3, 1, 4], [2, 1, 4], [4, 4]], 1
    )
    for i, m in enumerate(values)
}
TITLES = [
    "Vectors",
    "Matrix operations",
    "Gaussian elimination",
    "Alloy mixture",
    "RREF, rank and solution counts",
    "Span and independence",
]
DATASET_ID = "homework-1-castellano-v1"


def band_id(points):
    return f"points-{float(points):g}"


def pdf_text(path):
    with pymupdf.open(path) as doc:
        return "\n".join(f"[Page {i + 1}]\n{p.get_text()}" for i, p in enumerate(doc))


def problem_sections(text):
    matches = list(re.finditer(r"(?m)^(?:## )?Problem ([1-6])[^\n]*\n", text))
    return {
        int(m[1]): text[m.end() : matches[i + 1].start() if i + 1 < len(matches) else len(text)]
        .split("\n## Part ")[0]
        .split("\n## Feedback category")[0]
        .strip()
        for i, m in enumerate(matches)
    }


def problem_pages(path):
    with pymupdf.open(path) as doc:
        starts = {}
        for i, page in enumerate(doc):
            for n in re.findall(r"(?m)^Problem ([1-6])\b", page.get_text()):
                starts.setdefault(int(n), i + 1)
        if set(starts) != set(range(1, 7)):
            raise ValueError(f"Cannot locate six problem headings in {path.name}")
        return {n: list(range(starts[n], starts.get(n + 1, len(doc)) + 1)) for n in starts}


def source_paths(root):
    """Allowlist, deliberately not a recursive scan of the dataset root."""
    return (
        sorted((root / "01_assignment").glob("*.pdf"))
        + sorted((root / "02_professor_answer_key").glob("*.pdf"))
        + sorted((root / "03_graded_past_submissions").glob("*/graded_submission.pdf"))
    )


def grade_parts(grade):
    parts = grade["parts"]
    if set(parts) != set(MAXIMA) or grade["max"] != 40:
        raise ValueError("Professor grade does not match the 19-part, 40-point assignment")
    for pid, maximum in MAXIMA.items():
        points = parts[pid]["points"]
        if parts[pid]["max"] != maximum or not 0 <= points <= maximum or points * 2 % 1:
            raise ValueError(f"Invalid imported score for {pid}")
    if sum(p["points"] for p in parts.values()) != grade["total"]:
        raise ValueError("Professor total differs from its parts")
    return parts


def import_dataset(db, root: Path, archive_dir: Path):
    room = db.get(Classroom, "classroom")
    if not room:
        raise ValueError("Provision the classroom first")
    if room.state.get("dataset", {}).get("id") == DATASET_ID:
        if not room.state["dataset"].get("metadataVersion"):
            state = deepcopy(room.state)
            for questions in [state["draft"], *[v["questions"] for v in state["versions"]]]:
                for q in questions:
                    for c in q["criteria"]:
                        c["category"] = "Course rubric"
            for student in state["submissions"]:
                for attempt in student["attempts"]:
                    if attempt.get("assessmentSource") == "professor-import":
                        for q in attempt["questions"].values():
                            for r in q["results"].values():
                                if not r.get("reason"):
                                    r["confirmed"] = True
            state["dataset"]["metadataVersion"] = 1
            return mutate(db, room, state, room.revision)
        return room.state
    # Snapshot BEFORE changing the active room; original private PDFs remain intact.
    archive_dir.mkdir(parents=True, exist_ok=True)
    archive = archive_dir / f"workspace-before-dataset-{uid()}.json"
    with archive.open("x") as handle:
        json.dump(room.state, handle, indent=2)
    archive.chmod(0o600)
    teacher = db.get(Course, room.course_id).owner_id
    manifest = []

    def ingest(path, owner, kind):
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        doc = db.scalar(
            select(Document).where(
                Document.course_id == room.course_id,
                Document.owner_id == owner,
                Document.kind == kind,
                Document.sha256 == digest,
            )
        )
        doc = doc or pdf.ingest(db, raw, room.course_id, owner, kind)
        manifest.append(
            {
                "path": str(path.relative_to(root)),
                "sha256": digest,
                "documentId": doc.id,
                "pages": len(doc.pages),
            }
        )
        return {
            "id": doc.id,
            "remoteId": doc.id,
            "name": path.name,
            "pageCount": len(doc.pages),
            "sample": False,
        }

    blank_path = root / "01_assignment/Homework 1 Blank.pdf"
    solution_path = root / "02_professor_answer_key/Homework 1 Solutions.pdf"
    guidelines = (root / "02_professor_answer_key/Grading Guidelines.md").read_text()
    persona = (root / "02_professor_answer_key/Professor Persona.md").read_text()
    prompts = problem_sections(blank_path.with_suffix(".md").read_text())
    expected = problem_sections(guidelines)
    blank_pages, solution_pages = problem_pages(blank_path), problem_pages(solution_path)
    documents = {
        "blank": ingest(blank_path, teacher, "reference"),
        "solution": ingest(solution_path, teacher, "reference"),
        "examples": [],
    }
    questions = []
    for n, title in enumerate(TITLES, 1):
        criteria = [
            {
                "id": pid,
                "label": f"Part ({pid[1:]})",
                "max": maximum,
                "category": "Course rubric",
                "bands": [
                    {
                        "id": band_id(p / 2),
                        "points": p / 2,
                        "label": f"{p / 2:g} / {maximum} points",
                    }
                    for p in range(maximum * 2, -1, -1)
                ],
            }
            for pid, maximum in MAXIMA.items()
            if pid.startswith(str(n))
        ]
        questions.append(
            {
                "id": f"q{n}",
                "title": title,
                "prompt": prompts[n],
                "expected": expected[n],
                "alternatives": "Apply E9 and S5.",
                "assignmentPages": blank_pages[n],
                "solutionPages": solution_pages[n],
                "owner": "TA 1" if n % 2 else "TA 2",
                "criteria": criteria,
            }
        )
    records, roster = [], []
    for group in ["03_graded_past_submissions", "04_ungraded_new_submissions"]:
        for folder in sorted((root / group).iterdir()):
            if not folder.is_dir():
                continue
            mapping = json.loads((folder / "page_map.json").read_text())
            sid = mapping["student_id"]
            email = f"{sid}@homework1.verity.local"
            user = db.scalar(select(User).where(User.email == email))
            if not user:
                user = User(email=email, name=mapping["name"], role="student")
                db.add(user)
                db.flush()
            if not db.scalar(
                select(Membership).where(
                    Membership.course_id == room.course_id, Membership.user_id == user.id
                )
            ):
                db.add(Membership(course_id=room.course_id, user_id=user.id, role="student"))
            graded = group.startswith("03")
            source = folder / ("original_submission.pdf" if graded else "submission.pdf")
            doc = ingest(source, user.id, "submission")
            if doc["pageCount"] != mapping["pages"]:
                raise ValueError(f"Page count mismatch: {sid}")
            if set(mapping["question_to_pages"]) != {f"Q{i}" for i in range(1, 7)}:
                raise ValueError(f"Missing question mapping: {sid}")
            scores = (
                grade_parts(json.loads((folder / "professor_grade.json").read_text()))
                if graded
                else {}
            )
            if graded:
                ref = ingest(folder / "graded_submission.pdf", teacher, "reference")
                ref["name"] = f"{mapping['name']} — graded example.pdf"
                documents["examples"].append(ref)
            review = {}
            for q in questions:
                pages = mapping["question_to_pages"][q["id"].upper()]
                if (
                    not pages
                    or len(set(pages)) != len(pages)
                    or any(type(p) is not int or not 1 <= p <= doc["pageCount"] for p in pages)
                ):
                    raise ValueError(f"Invalid mapped pages: {sid}/{q['id']}")
                results = {}
                for c in q["criteria"]:
                    part = scores.get(c["id"])
                    results[c["id"]] = {
                        "band": band_id(part["points"]) if part else None,
                        "proposed": None,
                        "reason": "",
                        "evidence": part["comment"]
                        if part
                        else "Awaiting the explicit live dataset assessment.",
                        "unclear": not graded,
                        "confirmed": graded,
                        "dispute": None,
                    }
                review[q["id"]] = {
                    "pages": pages,
                    "work": "Original uploaded PDF; see the document viewer.",
                    "skimmed": graded,
                    "results": results,
                }
            attempt = {
                "id": uid(),
                "revision": 1,
                "version": 1,
                "source": "upload",
                "assessmentSource": "professor-import" if graded else "pending",
                "final": True,
                "at": now(),
                "pdf": doc,
                "questions": review,
                "reviewedAt": now() if graded else None,
            }
            records.append(
                {"id": user.id, "name": user.name, "datasetId": sid, "attempts": [attempt]}
            )
            roster.append({"id": user.id, "name": user.name, "datasetId": sid, "new": not graded})
    for filename in ["Grading Guidelines.pdf", "Professor Persona.pdf"]:
        documents["examples"].append(
            ingest(root / "02_professor_answer_key" / filename, teacher, "reference")
        )
    if len(manifest) != 26 or len(records) != 12:
        raise ValueError("Expected 26 PDFs and 12 synthetic students")
    instructions = guidelines + "\n\n" + persona
    version = {
        "id": 1,
        "title": "Homework 1",
        "questions": questions,
        "instructions": instructions,
        "documents": deepcopy(documents),
        "source": "dataset",
        "at": now(),
        "sampleCompatible": False,
        "caseCompatible": False,
    }
    state = {
        "schema": 1,
        "role": "Professor",
        "title": "Homework 1",
        "course": "Linear Algebra · Synthetic classroom",
        "source": "dataset",
        "documents": documents,
        "draft": deepcopy(questions),
        "instructions": instructions,
        "dirty": False,
        "versions": [version],
        "submissions": records,
        "announcement": "",
        "demoLoaded": False,
        "demoStudents": sorted(roster, key=lambda r: (not r["new"], r["datasetId"])),
        "dataset": {"id": DATASET_ID, "files": manifest, "importedAt": now(), "metadataVersion": 1},
        "log": [
            {
                "at": now(),
                "actor": "Dataset importer",
                "action": "Dataset imported",
                "detail": "26 PDFs; ten professor-reviewed records; two pending live tests. Prior workspace archived.",
            }
        ],
    }
    return mutate(db, room, state, room.revision)
