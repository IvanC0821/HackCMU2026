from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import delete, func, select

from .models import (
    Assessment,
    AuditEvent,
    CriterionResult,
    Document,
    Finding,
    Region,
    Rubric,
    Submission,
)
from .pdf import point_from_region, validate_anchor
from .schemas import Anchor, FindingIn, ResultIn, RubricSpec


def audit(db, actor_id, obj, action, detail):
    db.add(AuditEvent(actor_id=actor_id, object_id=obj.id, action=action, detail=detail))


def create_rubric(db, assignment, spec, actor_id, source="manual", provenance=None):
    spec = RubricSpec.model_validate(spec)
    question_ids = {q["id"] for q in assignment.data["questions"]}
    if {c.question_id for c in spec.criteria} != question_ids:
        raise HTTPException(422, "Rubric must cover every assignment question and no others")
    for c in spec.criteria:
        for ref in c.source_refs:
            doc = db.get(Document, ref.document_id)
            if (
                not doc
                or doc.id not in assignment.data["material_document_ids"]
                or ref.page_index >= len(doc.pages)
            ):
                raise HTTPException(
                    422, "Rubric source reference is not an assignment material page"
                )
    number = (
        db.scalar(select(func.max(Rubric.number)).where(Rubric.assignment_id == assignment.id)) or 0
    ) + 1
    rubric = Rubric(
        assignment_id=assignment.id,
        number=number,
        spec=spec.model_dump(mode="json"),
        provenance={"source": source, "actor_id": actor_id, **(provenance or {})},
    )
    db.add(rubric)
    db.flush()
    audit(db, actor_id, rubric, "rubric.created", rubric.provenance)
    return rubric


def replace_results(db, assessment, results):
    spec = RubricSpec.model_validate(db.get(Rubric, assessment.rubric_id).spec)
    results = [ResultIn.model_validate(r) for r in results]
    criteria = {c.id: c for c in spec.criteria}
    if len(results) != len(criteria) or {r.criterion_id for r in results} != set(criteria):
        raise HTTPException(422, "Exactly one outcome is required for every rubric criterion")
    rows, total = [], Decimal(0)
    unresolved = False
    for result in results:
        criterion = criteria[result.criterion_id]
        bands = {b.id: b for b in criterion.bands}
        points = None
        if result.status == "assessed":
            if result.band_id not in bands:
                raise HTTPException(422, "Unknown performance band")
            points = bands[result.band_id].points
            total += points
        if result.status == "uncertain":
            unresolved = True
        rows.append(
            CriterionResult(
                assessment_id=assessment.id,
                criterion_id=criterion.id,
                question_id=criterion.question_id,
                status=result.status,
                band_id=result.band_id,
                points=points,
                rationale=result.rationale,
            )
        )
    db.execute(delete(CriterionResult).where(CriterionResult.assessment_id == assessment.id))
    db.add_all(rows)
    assessment.score = None if unresolved else total
    db.flush()


def new_assessment(
    db, submission, rubric, results, actor_id, source, provenance=None, original=None
):
    if rubric.assignment_id != submission.assignment_id or rubric.status != "published":
        raise HTTPException(422, "Select a published rubric for this assignment")
    assessment = Assessment(
        submission_id=submission.id,
        rubric_id=rubric.id,
        source=source,
        provenance={"actor_id": actor_id, "source": source, **(provenance or {})},
        original_proposal=original,
    )
    db.add(assessment)
    db.flush()
    replace_results(db, assessment, results)
    audit(db, actor_id, assessment, "assessment.created", assessment.provenance)
    return assessment


def validate_finding(db, assessment, body, exclude_id=None):
    body = FindingIn.model_validate(body)
    submission = db.get(Submission, assessment.submission_id)
    doc = db.get(Document, submission.document_id)
    spec = RubricSpec.model_validate(db.get(Rubric, assessment.rubric_id).spec)
    criterion = next((c for c in spec.criteria if c.id == body.criterion_id), None)
    if not criterion:
        raise HTTPException(422, "Unknown criterion")
    if body.pattern_id:
        pattern = next((p for p in spec.patterns if p.id == body.pattern_id), None)
        if (
            not pattern
            or body.criterion_id not in pattern.criterion_ids
            or body.category != pattern.category
        ):
            raise HTTPException(
                422, "Pattern, category and criterion must match the approved taxonomy"
            )
    regions = []
    for region_id in body.evidence_region_ids:
        region = db.get(Region, region_id)
        if not region or region.document_id != doc.id:
            raise HTTPException(422, "Evidence must belong to the assessed submission")
        allowed = submission.region_map.get(criterion.question_id)
        if allowed is not None and region.id not in allowed:
            raise HTTPException(422, "Evidence belongs to another question")
        regions.append(region)
    anchor = body.anchor
    if anchor:
        validate_anchor(anchor, doc)
    elif regions:
        anchor = Anchor.model_validate(point_from_region(doc, regions[0]))
    if body.root_cause_id:
        root = db.get(Finding, body.root_cause_id)
        if not root or root.assessment_id != assessment.id:
            raise HTTPException(422, "Root cause must belong to this assessment")
        visited = {exclude_id} if exclude_id else set()
        while root:
            if root.id in visited:
                raise HTTPException(422, "Root cause dependencies must not contain cycles")
            visited.add(root.id)
            root = (
                db.get(Finding, root.data["root_cause_id"])
                if root.data.get("root_cause_id")
                else None
            )
    data = body.model_dump(mode="json")
    data["anchor"] = anchor.model_dump() if anchor else None
    return criterion.question_id, data


def add_finding(db, assessment, body, actor_id, source="manual"):
    question_id, data = validate_finding(db, assessment, body)
    finding = Finding(
        assessment_id=assessment.id,
        question_id=question_id,
        criterion_id=data["criterion_id"],
        pattern_id=data["pattern_id"],
        category=data["category"],
        data=data,
        source=source,
        status="active" if data["anchor"] else "pending_anchor",
        confirmed=source == "manual",
    )
    db.add(finding)
    db.flush()
    audit(db, actor_id, finding, "finding.created", {"source": source, "data": data})
    return finding


def finding_view(finding):
    return {
        "id": finding.id,
        "assessment_id": finding.assessment_id,
        "question_id": finding.question_id,
        **finding.data,
        "source": finding.source,
        "status": finding.status,
        "confirmed": finding.confirmed,
        "version": finding.version,
    }


def check_editable(assessment, expected_version=None):
    if assessment.status == "finalized":
        raise HTTPException(409, "Finalized assessments are immutable; create a new assessment")
    if expected_version is not None and assessment.version != expected_version:
        raise HTTPException(409, "Assessment changed; reload and retry")
