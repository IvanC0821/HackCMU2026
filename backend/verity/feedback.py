from fastapi import HTTPException
from sqlalchemy import select

from . import providers
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
    spec = db.get(Rubric, assessment.rubric_id).spec
    patterns = {p["id"]: p for p in spec["patterns"]}
    if source == "ai" and not policy["allow_generated"]:
        raise HTTPException(403, "Generated feedback is disabled for this assignment")
    for finding in active_findings(db, assessment, policy["max_findings"]):
        if cached_hint(db, finding, level, source):
            continue
        pattern = patterns.get(finding.pattern_id)
        actual_level = 0
        text = "Revisit the marked step and check that each claim follows from your assumptions."
        if finding.status == "pending_anchor":
            text = "Revisit this question and check that each claim follows from your assumptions."
        if finding.category == "uncertain":
            text = "This part could not be assessed confidently. Clarify the writing or ask your instructor."
        elif source == "ai" and level > 0:
            text = providers.generate_hint(assignment, finding, pattern, level, policy["max_words"])
            actual_level = level
        elif pattern:
            candidates = [
                h
                for h in pattern["hints"]
                if h["level"] <= level and len(h["text"].split()) <= policy["max_words"]
            ]
            if candidates:
                hint = max(candidates, key=lambda h: h["level"])
                text, actual_level = hint["text"], hint["level"]
        # Generic fallback is always within the smallest allowed word budget.
        if len(text.split()) > policy["max_words"]:
            text = "Revisit this step and check your assumptions."
        db.add(
            Hint(
                finding_id=finding.id,
                finding_version=finding.version,
                level=level,
                source=source,
                text=text,
                provenance={
                    "actual_level": actual_level,
                    **(
                        providers.provenance(providers.FEEDBACK_PROMPT_VERSION)
                        if source == "ai" and actual_level > 0
                        else {"source": "approved_or_template"}
                    ),
                },
            )
        )
    db.flush()


def hints_ready(db, assignment, assessment, level, source):
    return all(
        cached_hint(db, f, level, source)
        for f in active_findings(db, assessment, assignment.data["feedback_policy"]["max_findings"])
    )


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
                "source": hint.source,
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
