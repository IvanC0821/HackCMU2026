from fastapi import HTTPException
from sqlalchemy import select

from . import hint_banks
from .models import Finding, Hint, IssuedFeedback, Rubric


def effective_level(assignment, requested):
    policy = assignment.data["feedback_policy"]
    return min(requested, policy["max_disclosure_level"], policy["release_level"])


def active_findings(db, assessment, limit):
    return list(
        db.scalars(
            select(Finding)
            .where(Finding.assessment_id == assessment.id, Finding.status != "dismissed")
            .order_by(Finding.created_at, Finding.id)
            .limit(limit)
        )
    )


def cached_hint(db, finding, level, source):
    return db.scalar(
        select(Hint).where(
            Hint.finding_id == finding.id,
            Hint.finding_version == finding.version,
            Hint.level == level,
            Hint.source == source,
        )
    )


def prepare_hints(db, assignment, assessment, level, source):
    policy = assignment.data["feedback_policy"]
    level = effective_level(assignment, level)
    rubric = db.get(Rubric, assessment.rubric_id)
    bank = hint_banks.core_bank(db, assignment, rubric)
    if bank and bank.status not in {"approved", "published"}:
        raise HTTPException(409, "The professor has not approved the assignment hints")
    patterns = {p["id"]: p for p in rubric.spec["patterns"]}
    for finding in active_findings(db, assessment, policy["max_findings"]):
        selected = hint_banks.select_hint(
            bank, finding.question_id, finding.criterion_id, finding.pattern_id, level
        )
        text, actual_level = hint_banks.GENERIC, 0
        if finding.category == "uncertain":
            text = "Clarify the writing or ask your instructor before continuing."
        elif selected:
            text, actual_level = selected["text"], selected["level"]
        elif bank is None:  # Already-published legacy rubrics contain instructor-approved hints.
            candidates = [
                h
                for h in patterns.get(finding.pattern_id, {}).get("hints", [])
                if h["level"] <= level and len(h["text"].split()) <= policy["max_words"]
            ]
            if candidates:
                selected = max(candidates, key=lambda h: h["level"])
                text, actual_level = selected["text"], selected["level"]
        if len(text.split()) > policy["max_words"]:
            text, actual_level = "Check your assumptions before continuing.", 0
        provenance = {
            "actual_level": actual_level,
            "source": "approved_assignment_bank",
            "bank_id": bank.id if bank else None,
            "bank_version": bank.version if bank else None,
        }
        hint = cached_hint(db, finding, level, source)
        if hint is None:
            hint = Hint(
                finding_id=finding.id,
                finding_version=finding.version,
                level=level,
                source=source,
                text=text,
                provenance=provenance,
            )
            db.add(hint)
        else:
            # Never reuse a historical on-demand AI hint; refresh from the approved bank.
            hint.text, hint.provenance = text, provenance
    db.flush()


def filter_location(item, visibility):
    if visibility != "point":
        item.pop("anchor", None)
    if visibility == "hidden":
        item.pop("question_id", None)
    return item


def issue(db, assignment, assessment, actor_id, level, source, manual_items=()):
    policy = assignment.data["feedback_policy"]
    level = effective_level(assignment, level)
    items = []
    if source == "manual":
        if not manual_items or len(manual_items) > policy["max_findings"]:
            raise HTTPException(422, "Provide manual feedback within the configured item limit")
        for item in manual_items:
            if item["level"] > level or len(item["text"].split()) > policy["max_words"]:
                raise HTTPException(422, "Manual feedback exceeds the disclosure or word policy")
            items.append({"text": item["text"], "level": item["level"], "source": "manual"})
    else:
        for finding in active_findings(db, assessment, policy["max_findings"]):
            hint = cached_hint(db, finding, level, source)
            if not hint:
                raise HTTPException(409, "Feedback is still processing")
            item = {
                "finding_id": finding.id,
                "finding_version": finding.version,
                "question_id": finding.question_id,
                "anchor": finding.data.get("anchor"),
                "text": hint.text,
                "level": hint.provenance["actual_level"],
                "source": "bank",
                "hint_bank_id": hint.provenance.get("bank_id"),
                "hint_bank_version": hint.provenance.get("bank_version"),
                "assessment_source": assessment.source,
                "instructor_confirmed": finding.confirmed,
            }
            items.append(filter_location(item, policy["location_visibility"]))
    payload = {
        "assessment_id": assessment.id,
        "rubric_id": assessment.rubric_id,
        "effective_level": level,
        "items": items,
        "grade_status": assessment.status,
        "advisory": assessment.source == "ai" and assessment.status != "finalized",
    }
    record = IssuedFeedback(assessment_id=assessment.id, issued_by=actor_id, payload=payload)
    db.add(record)
    db.flush()
    return record


def issued_view(record):
    return {"id": record.id, "issued_at": record.created_at, **record.payload}
