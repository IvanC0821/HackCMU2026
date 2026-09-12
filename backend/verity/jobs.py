import hashlib
import json
import time

from fastapi import HTTPException
from sqlalchemy import select, update

from . import feedback, providers
from .db import SessionLocal
from .grading import add_finding, create_rubric, new_assessment
from .models import Assignment, Document, Job, Region, Rubric, Submission
from .pdf import render
from .schemas import FindingIn, ResultIn


def enqueue(db, actor_id, course_id, kind, payload, key):
    digest = hashlib.sha256(
        json.dumps({"kind": kind, "payload": payload}, sort_keys=True).encode()
    ).hexdigest()
    existing = db.scalar(select(Job).where(Job.actor_id == actor_id, Job.idempotency_key == key))
    if existing:
        if existing.request_hash != digest:
            raise HTTPException(409, "Idempotency key already used for a different request")
        return existing, False
    job = Job(
        actor_id=actor_id,
        course_id=course_id,
        kind=kind,
        payload=payload,
        request_hash=digest,
        idempotency_key=key,
    )
    db.add(job)
    db.flush()
    return job, True


def assess(db, job):
    payload = job.payload
    submission = db.get(Submission, payload["submission_id"])
    assignment = db.get(Assignment, submission.assignment_id)
    rubric = db.get(Rubric, payload["rubric_id"])
    doc = db.get(Document, submission.document_id)
    providers.require_ai(assignment)
    if assignment.data["ocr_enabled"]:
        providers.extract_ocr(db, assignment, doc)
    regions = list(
        db.scalars(
            select(Region)
            .where(Region.document_id == doc.id)
            .order_by(Region.page_index, Region.created_at)
        )
    )
    # Bounded model context; no silent truncation of the student's work.
    if sum(len(r.text) for r in regions) > 180000:
        raise providers.ProviderFailure("submission_context_too_large")
    material_context = []
    for doc_id in assignment.data["material_document_ids"]:
        material = db.get(Document, doc_id)
        text = [
            r.text
            for r in db.scalars(
                select(Region).where(Region.document_id == doc_id, Region.granularity == "step")
            )
        ]
        material_context.append({"kind": material.kind, "text": text})
    material_images = []
    for doc_id in assignment.data["material_document_ids"]:
        material = db.get(Document, doc_id)
        material_images.extend(render(material, i) for i in range(len(material.pages)))
    if len(material_images) > 20:
        raise providers.ProviderFailure("too_many_reference_pages")
    results, findings = [], []
    for question in assignment.data["questions"]:
        allowed = submission.region_map.get(question["id"])
        if len(assignment.data["questions"]) > 1 and not allowed:
            raise providers.ProviderFailure("question_mapping_required")
        selected = [r for r in regions if allowed is None or r.id in allowed]
        page_ids = sorted({r.page_index for r in selected}) or list(range(len(doc.pages)))
        q_spec = {
            "criteria": [c for c in rubric.spec["criteria"] if c["question_id"] == question["id"]],
            "patterns": rubric.spec["patterns"],
            "standards": rubric.spec["standards"],
        }
        response = providers.assess_question(
            assignment,
            question,
            q_spec,
            selected,
            [render(doc, i) for i in page_ids] + material_images,
            material_context,
        )
        question_criteria = {c["id"] for c in q_spec["criteria"]}
        if (
            len(response.results) != len(question_criteria)
            or {r.criterion_id for r in response.results} != question_criteria
        ):
            raise providers.ProviderFailure("invalid_model_criterion_coverage")
        results.extend(
            ResultIn.model_validate(r.model_dump()).model_dump() for r in response.results
        )
        offset = len(findings)
        for i, proposed in enumerate(response.findings):
            if proposed.criterion_id not in question_criteria:
                raise providers.ProviderFailure("invalid_model_finding_criterion")
            if not set(proposed.evidence_region_ids) <= {r.id for r in selected}:
                raise providers.ProviderFailure("invalid_model_evidence")
            if proposed.root_cause_index is not None and not 0 <= proposed.root_cause_index < i:
                raise providers.ProviderFailure("invalid_model_root_cause")
            entry = proposed.model_dump()
            entry["root_cause_index"] = (
                None if proposed.root_cause_index is None else offset + proposed.root_cause_index
            )
            findings.append(entry)
    original = {"results": results, "findings": findings}
    assessment = new_assessment(
        db, submission, rubric, results, job.actor_id, "ai", providers.provenance(), original
    )
    saved = []
    for entry in findings:
        data = dict(entry)
        root_index = data.pop("root_cause_index")
        data["root_cause_id"] = saved[root_index].id if root_index is not None else None
        saved.append(
            add_finding(db, assessment, FindingIn.model_validate(data), job.actor_id, "ai")
        )
    policy = assignment.data["feedback_policy"]
    # Grade proposal remains usable even if optional hint generation is temporarily unavailable.
    feedback.prepare_hints(db, assignment, assessment, policy["max_disclosure_level"], "bank")
    if policy["allow_generated"]:
        try:
            feedback.prepare_hints(db, assignment, assessment, policy["max_disclosure_level"], "ai")
        except providers.ProviderFailure:
            pass  # approved hints remain available; an explicit AI feedback request may retry
    return assessment.id


def process(db, job):
    if job.kind == "assessment":
        return assess(db, job)
    if job.kind == "rubric_draft":
        assignment = db.get(Assignment, job.payload["assignment_id"])
        spec = providers.draft_rubric(db, assignment, job.payload["instructions"])
        from .rubric_drafting import PROMPT_VERSION as rubric_prompt

        return create_rubric(
            db, assignment, spec, job.actor_id, "ai", providers.provenance(rubric_prompt)
        ).id
    if job.kind == "feedback":
        from .models import Assessment

        assessment = db.get(Assessment, job.payload["assessment_id"])
        submission = db.get(Submission, assessment.submission_id)
        assignment = db.get(Assignment, submission.assignment_id)
        feedback.prepare_hints(db, assignment, assessment, job.payload["requested_level"], "ai")
        return feedback.issue(
            db, assignment, assessment, job.actor_id, job.payload["requested_level"], "ai"
        ).id
    raise providers.ProviderFailure("unsupported_job")


def run_once(session_factory=SessionLocal):
    now = time.time()
    with session_factory() as db:
        db.execute(
            update(Job)
            .where(Job.status == "running", Job.lease_until < now)
            .values(status="failed", error_code="worker_lease_expired", lease_until=None)
        )
        candidate = db.scalar(
            select(Job.id).where(Job.status == "queued").order_by(Job.created_at).limit(1)
        )
        if not candidate:
            db.commit()
            return False
        claimed = db.execute(
            update(Job)
            .where(Job.id == candidate, Job.status == "queued")
            .values(status="running", attempts=Job.attempts + 1, lease_until=now + 1800)
        )
        db.commit()
        if claimed.rowcount != 1:
            return True
    try:
        with session_factory() as db:
            job = db.get(Job, candidate)
            result_id = process(db, job)
            # Completion is conditional on still owning this lease. Late work rolls back.
            completed = db.execute(
                update(Job)
                .where(Job.id == candidate, Job.status == "running", Job.lease_until == now + 1800)
                .values(status="succeeded", result_id=result_id, error_code=None, lease_until=None)
            )
            if completed.rowcount != 1:
                db.rollback()
                return True
            db.commit()
    except Exception as exc:
        code = exc.code if isinstance(exc, providers.ProviderFailure) else "processing_failed"
        with session_factory() as db:
            db.execute(
                update(Job)
                .where(Job.id == candidate, Job.status == "running", Job.lease_until == now + 1800)
                .values(status="failed", error_code=code, lease_until=None)
            )
            db.commit()
    return True


def main():
    from .config import settings

    while True:
        if not run_once():
            time.sleep(settings().worker_poll_seconds)


if __name__ == "__main__":
    main()
