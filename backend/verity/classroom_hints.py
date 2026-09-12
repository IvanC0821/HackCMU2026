"""Bind classroom drafts and immutable published standards to reviewed hint banks."""

from fastapi import HTTPException

from . import hint_banks
from .models import Document


def context(db, room, state):
    questions = state.get("draft", [])
    documents = state.get("documents", {})
    refs = []
    for kind, docs in (
        ("assignment", [documents.get("blank")]),
        ("answer_key", [documents.get("solution")]),
        ("graded_example", documents.get("examples", [])),
    ):
        for ref in filter(None, docs):
            did = ref.get("remoteId")
            doc = db.get(Document, did) if did else None
            if not doc or doc.course_id != room.course_id or doc.kind == "submission":
                raise HTTPException(422, "Attach course reference PDFs before preparing hints")
            refs.append({"document_id": doc.id, "kind": kind})
    targets = [
        {
            "key": f"{q['id']}:{c['id']}",
            "question_id": q["id"],
            "criterion_id": c["id"],
            "pattern_id": None,
            "definition": c["label"],
        }
        for q in questions
        for c in q.get("criteria", [])
    ]
    if len({t["key"] for t in targets}) != len(targets):
        raise HTTPException(422, "Question and criterion IDs must be unique")
    return {
        "questions": questions,
        "targets": targets,
        "documents": refs,
        "instructor_brief": state.get("instructions", ""),
        "max_level": 2,
        "max_words": 80,
        # Runtime permission is checked separately, not included in the fingerprint.
        "external_ai_allowed": True,
    }


def prepare(db, room, state, actor_id):
    if not state.get("draft") or not any(q.get("criteria") for q in state["draft"]):
        return None
    return hint_banks.ensure(
        db, room.course_id, f"classroom:{room.course_id}", context(db, room, state), actor_id
    )


def current(db, room):
    return hint_banks.lookup(db, f"classroom:{room.course_id}", context(db, room, room.state))


def bind_published(db, room, state):
    for version in state["versions"][len(room.state["versions"]) :]:
        snapshot = {
            "draft": version["questions"],
            "documents": version["documents"],
            "instructions": version.get("instructions", ""),
        }
        bank = hint_banks.lookup(db, f"classroom:{room.course_id}", context(db, room, snapshot))
        if not bank or bank.status not in {"approved", "published"}:
            raise HTTPException(
                409,
                "Save the assignment draft, then review and approve its hints before finalizing",
            )
        bank.status = "published"
        bank.version += 1
        db.flush()
        version["hintBank"] = {"id": bank.id, "version": bank.version, "entries": bank.entries}


def require_editable(room, bank):
    if any(v.get("hintBank", {}).get("id") == bank.id for v in room.state["versions"]):
        raise HTTPException(
            409, "Published hints are immutable. Change the assignment draft first."
        )
