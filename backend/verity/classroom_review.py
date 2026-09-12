"""Whole-submission ownership and final-only human review; no model calls."""

from copy import deepcopy
from datetime import datetime, timezone

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field


class ClaimRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedRevision: int = Field(ge=0)
    release: bool = False


class Decision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    band: str
    reason: str = Field(default="", max_length=4000)
    resolution: str | None = None


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    attemptId: str
    expectedQuestionRevision: int = Field(ge=0)
    checkedWork: bool
    decisions: dict[str, Decision]


class ReopenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedRevision: int = Field(ge=0)
    reason: str = Field(min_length=1, max_length=1000)


def question_context(state, qid):
    version = state.get("versions", [])[-1] if state.get("versions") else None
    question = next((q for q in version["questions"] if q["id"] == qid), None) if version else None
    if not question:
        raise HTTPException(404, "Question is not in the published standard")
    return version, question, f"{version['id']}:{qid}"


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def final_attempt(state, attempt_id):
    version = state.get("versions", [])[-1] if state.get("versions") else None
    student = next(
        (s for s in state["submissions"] if any(a["id"] == attempt_id for a in s["attempts"])), None
    )
    attempt = latest_final(student, version["id"]) if student and version else None
    if not attempt or attempt["id"] != attempt_id:
        raise HTTPException(409, "Review the latest handed-in version for this standard.")
    return student, attempt


def claim_submission(state, attempt_id, actor, release=False):
    student, attempt = final_attempt(state, attempt_id)
    owners = state.setdefault("reviewAssignments", {})
    owner = owners.get(attempt_id)
    if owner and owner["userId"] != actor.id:
        raise HTTPException(409, f"This submission is assigned to {owner['name']}.")
    if release:
        owners.pop(attempt_id, None)
    else:
        owners[attempt_id] = {"userId": actor.id, "name": actor.name, "at": timestamp()}
    state["log"].append(
        {
            "at": timestamp(),
            "actor": actor.name,
            "action": "Submission released" if release else "Submission assigned",
            "detail": f"{student['name']}, submitted version {attempt['revision']}",
        }
    )


def latest_final(student, version):
    return next(
        (a for a in reversed(student["attempts"]) if a["version"] == version and a.get("final")),
        None,
    )


def reopen_submission(state, attempt_id, actor, reason):
    student, attempt = final_attempt(state, attempt_id)
    if not reason.strip():
        raise HTTPException(422, "Explain why you are reopening this review.")
    if not attempt.get("reviewedAt"):
        raise HTTPException(409, "This submission is already open for review.")
    claim_submission(state, attempt_id, actor)
    attempt.setdefault("completedReviews", []).append(
        {
            "reviewedAt": attempt["reviewedAt"],
            "questions": deepcopy(attempt["questions"]),
            "reopenedBy": actor.id,
            "reason": reason.strip(),
            "at": timestamp(),
        }
    )
    attempt["reviewedAt"] = None
    for review in attempt["questions"].values():
        review["skimmed"] = False
        metadata = review.setdefault("questionReview", {})
        metadata["revision"] = metadata.get("revision", 0) + 1
    state["log"].append(
        {
            "at": timestamp(),
            "actor": actor.name,
            "action": "Submission review reopened",
            "detail": f"{student['name']}: {reason.strip()}",
        }
    )


def review_question(state, qid, actor, body):
    version, question, _ = question_context(state, qid)
    student, attempt = final_attempt(state, body.attemptId)
    if state.get("reviewAssignments", {}).get(body.attemptId, {}).get("userId") != actor.id:
        raise HTTPException(403, "Start this submission's review before saving decisions.")
    current = attempt["questions"].get(qid)
    if not current or not current.get("pages") or not current.get("work", "").strip():
        raise HTTPException(422, "Mapped student work is required before review.")
    if current.get("questionReview", {}).get("revision", 0) != body.expectedQuestionRevision:
        raise HTTPException(409, "This answer was reviewed in another tab. Reload before saving.")
    if attempt.get("reviewedAt"):
        raise HTTPException(409, "This answer is already reviewed. Its review is preserved.")
    if not body.checkedWork:
        raise HTTPException(422, "Inspect the full answer before completing the review.")
    if set(body.decisions) != {c["id"] for c in question["criteria"]}:
        raise HTTPException(422, "Choose a score for every rubric item.")
    previous = deepcopy(current)
    for criterion in question["criteria"]:
        decision = body.decisions[criterion["id"]]
        band = next((b for b in criterion["bands"] if b["id"] == decision.band), None)
        if band is None:
            raise HTTPException(422, "Choose a published scoring outcome.")
        result = current["results"][criterion["id"]]
        dispute = result.get("dispute") or {}
        reason = decision.reason.strip()
        needs_reason = (
            (result.get("band") is not None and decision.band != result.get("band"))
            or (result.get("band") is None and band["points"] < criterion["max"])
            or result.get("unclear")
            or dispute.get("status") == "open"
        )
        if needs_reason and not reason:
            raise HTTPException(
                422, "Explain changed scores, unclear work, and disputed judgments."
            )
        if dispute.get("status") == "open":
            if decision.resolution not in {"upheld", "overturned"}:
                raise HTTPException(422, "Resolve the open student dispute.")
            dispute.update(status=decision.resolution, resolution=reason)
        result.update(band=decision.band, reason=reason, confirmed=True, unclear=False)
    current.setdefault("reviewHistory", []).append(
        {
            "at": timestamp(),
            "reviewerId": actor.id,
            "previous": {k: v for k, v in previous.items() if k != "reviewHistory"},
        }
    )
    current["skimmed"] = True
    current["questionReview"] = {
        "revision": body.expectedQuestionRevision + 1,
        "reviewerId": actor.id,
        "name": actor.name,
        "at": timestamp(),
    }
    if all(attempt["questions"].get(q["id"], {}).get("skimmed") for q in version["questions"]):
        attempt["reviewedAt"] = timestamp()
    state["log"].append(
        {
            "at": timestamp(),
            "actor": actor.name,
            "action": "Final question reviewed",
            "detail": f"{student['name']}, {qid}, submitted version {attempt['revision']}",
        }
    )


def guard_bulk_review(before, after):
    """Legacy workspace saves must not bypass ownership or forge review metadata."""
    owners = before.get("reviewAssignments", {})
    if owners != after.get("reviewAssignments", {}):
        raise HTTPException(422, "Use the submission assignment action to change ownership.")
    originals = {a["id"]: a for s in before["submissions"] for a in s["attempts"]}
    for student in after["submissions"]:
        for attempt in student["attempts"]:
            old = originals.get(attempt["id"], {})
            if old.get("completedReviews", []) != attempt.get("completedReviews", []):
                raise HTTPException(422, "Reviewed snapshots cannot be overwritten.")
            if old.get("helpRequests", []) != attempt.get("helpRequests", []):
                raise HTTPException(422, "Use the help-request action to update student requests.")
            for qid, question in attempt.get("questions", {}).items():
                prior = old.get("questions", {}).get(qid, {})
                protected = attempt["id"] in owners
                if (
                    (protected and question != prior)
                    or question.get("questionReview") != prior.get("questionReview")
                    or question.get("reviewHistory") != prior.get("reviewHistory")
                ):
                    raise HTTPException(422, "Save assigned submissions in the Grade workspace.")
