from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from . import analytics, feedback, jobs, pdf, providers, storage
from .access import (
    assessment_access,
    assignment_access,
    document_access,
    found,
    job_access,
    submission_access,
)
from .auth import course_role, current_user, require_staff
from .config import settings
from .db import get_db
from .grading import (
    add_finding,
    audit,
    check_editable,
    create_rubric,
    finding_view,
    new_assessment,
    replace_results,
    validate_finding,
)
from .models import (
    Assessment,
    Assignment,
    Course,
    CriterionResult,
    Document,
    Finding,
    IssuedFeedback,
    Job,
    Membership,
    Region,
    Rubric,
    Submission,
    User,
)
from .schemas import (
    AssessmentIn,
    AssignmentIn,
    CourseIn,
    DraftIn,
    FeedbackIn,
    FinalizeIn,
    FindingEdit,
    FindingIn,
    JobOut,
    MathCheckIn,
    MemberIn,
    RegionMapIn,
    ResultsEdit,
    RubricSpec,
    SubmissionIn,
    UserIn,
)
from .views import (
    AnalyticsView,
    AssessmentView,
    AssignmentView,
    CourseView,
    DocumentView,
    FeedbackView,
    FindingView,
    RubricView,
    SubmissionView,
    UserView,
)

# TODO: Replace temporary Verity branding before launch.
app = FastAPI(
    title="Verity Math Assessment API",
    version="0.1.0",
    description="PDF homework, rubric-based assessment, and practice feedback.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)
DB = Annotated[Session, Depends(get_db)]
Actor = Annotated[User, Depends(current_user)]
Key = Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)]
Limit = Annotated[int, Query(ge=1, le=100)]
Offset = Annotated[int, Query(ge=0)]
P = "/api/v1"


@app.exception_handler(IntegrityError)
def integrity_error(_, exc):
    return JSONResponse(
        status_code=409,
        content={"detail": "Conflicting record; reload or retry with the same idempotency key"},
    )


@app.exception_handler(StaleDataError)
def stale_error(_, exc):
    return JSONResponse(status_code=409, content={"detail": "Record changed; reload and retry"})


@app.exception_handler(providers.ProviderFailure)
def provider_error(_, exc):
    return JSONResponse(status_code=503, content={"detail": exc.code})


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready")
def ready(db: DB):
    db.execute(text("SELECT 1"))
    # Schema must be migrated; SELECT 1 alone would mask an uninitialized deployment.
    db.execute(select(User.id).limit(1))
    return {"status": "ready"}


def user_view(user):
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}


@app.get(P + "/me", response_model=UserView, response_model_exclude_unset=True)
def me(db: DB, user: Actor):
    memberships = db.scalars(select(Membership).where(Membership.user_id == user.id))
    return {
        **user_view(user),
        "memberships": [{"course_id": m.course_id, "role": m.role} for m in memberships],
    }


@app.post(P + "/users", status_code=201, response_model=UserView, response_model_exclude_unset=True)
def create_user(body: UserIn, db: DB, user: Actor):
    if user.role != "admin":
        raise HTTPException(403, "Administrator permission required")
    target = User(**body.model_dump())
    db.add(target)
    db.flush()
    return user_view(target)


@app.post(
    P + "/courses", status_code=201, response_model=CourseView, response_model_exclude_unset=True
)
def create_course(body: CourseIn, db: DB, user: Actor):
    if user.role not in {"admin", "instructor"}:
        raise HTTPException(403, "Instructor permission required")
    course = Course(title=body.title, owner_id=user.id)
    db.add(course)
    db.flush()
    db.add(Membership(course_id=course.id, user_id=user.id, role="instructor"))
    return {"id": course.id, "title": course.title}


@app.get(P + "/courses", response_model=list[CourseView], response_model_exclude_unset=True)
def courses(db: DB, user: Actor, limit: Limit = 50, offset: Offset = 0):
    query = select(Course)
    if user.role != "admin":
        query = query.join(Membership).where(Membership.user_id == user.id)
    return [
        {"id": c.id, "title": c.title}
        for c in db.scalars(query.order_by(Course.created_at).limit(limit).offset(offset))
    ]


@app.post(P + "/courses/{course_id}/members", status_code=201)
def enroll(course_id: str, body: MemberIn, db: DB, user: Actor):
    found(db, Course, course_id)
    require_staff(db, user, course_id, instructor=True)
    found(db, User, body.user_id)
    member = Membership(course_id=course_id, **body.model_dump())
    db.add(member)
    db.flush()
    return {"user_id": member.user_id, "course_id": course_id, "role": member.role}


def assignment_view(assignment, role):
    public = {
        "id": assignment.id,
        "course_id": assignment.course_id,
        "title": assignment.title,
        "questions": assignment.data["questions"],
        "feedback_policy": assignment.data["feedback_policy"],
    }
    if role != "student":
        public.update(assignment.data)
    return public


@app.post(
    P + "/courses/{course_id}/assignments",
    status_code=201,
    response_model=AssignmentView,
    response_model_exclude_unset=True,
)
def create_assignment(course_id: str, body: AssignmentIn, db: DB, user: Actor):
    found(db, Course, course_id)
    require_staff(db, user, course_id, instructor=True)
    for doc_id in body.material_document_ids:
        doc = found(db, Document, doc_id)
        if doc.course_id != course_id or doc.kind == "submission":
            raise HTTPException(422, "Material must be an instructor document in this course")
    assignment = Assignment(
        course_id=course_id, title=body.title, data=body.model_dump(mode="json")
    )
    db.add(assignment)
    db.flush()
    return assignment_view(assignment, "instructor")


@app.get(
    P + "/courses/{course_id}/assignments",
    response_model=list[AssignmentView],
    response_model_exclude_unset=True,
)
def assignments(course_id: str, db: DB, user: Actor, limit: Limit = 50, offset: Offset = 0):
    role = course_role(db, user, course_id)
    return [
        assignment_view(a, role)
        for a in db.scalars(
            select(Assignment)
            .where(Assignment.course_id == course_id)
            .order_by(Assignment.created_at)
            .limit(limit)
            .offset(offset)
        )
    ]


@app.get(
    P + "/assignments/{assignment_id}",
    response_model=AssignmentView,
    response_model_exclude_unset=True,
)
def get_assignment(assignment_id: str, db: DB, user: Actor):
    assignment, role = assignment_access(db, user, assignment_id)
    result = assignment_view(assignment, role)
    result["published_rubrics"] = [
        {"id": r.id, "number": r.number}
        for r in db.scalars(
            select(Rubric)
            .where(Rubric.assignment_id == assignment_id, Rubric.status == "published")
            .order_by(Rubric.number)
        )
    ]
    return result


@app.post(
    P + "/documents",
    status_code=201,
    response_model=DocumentView,
    response_model_exclude_unset=True,
)
def upload(
    db: DB,
    user: Actor,
    course_id: str,
    kind: Literal["assignment", "answer_key", "rubric", "standard", "submission"],
    file: UploadFile = File(...),
):
    found(db, Course, course_id)
    role = course_role(db, user, course_id)
    if role == "student" and kind != "submission":
        raise HTTPException(403, "Students may upload submissions only")
    raw = file.file.read(settings().max_upload_bytes + 1)
    doc = pdf.ingest(db, raw, course_id, user.id, kind)
    return {"id": doc.id, "kind": doc.kind, "pages": doc.pages, "byte_size": doc.byte_size}


@app.get(
    P + "/documents/{document_id}", response_model=DocumentView, response_model_exclude_unset=True
)
def get_document(
    document_id: str,
    db: DB,
    user: Actor,
    limit: Annotated[int, Query(ge=1, le=5000)] = 1000,
    offset: Offset = 0,
    granularity: Literal["step", "symbol", "all"] = "step",
):
    doc = document_access(db, user, document_id)
    query = select(Region).where(Region.document_id == doc.id)
    if granularity != "all":
        query = query.where(Region.granularity == granularity)
    regions = db.scalars(
        query.order_by(Region.page_index, Region.created_at, Region.id).limit(limit).offset(offset)
    )
    return {
        "id": doc.id,
        "kind": doc.kind,
        "pages": doc.pages,
        "ocr_complete": doc.ocr_complete,
        "regions": [
            {
                "id": r.id,
                "page_index": r.page_index,
                "text": r.text,
                "bbox": r.bbox,
                "granularity": r.granularity,
                "source": r.source,
                "evidence": r.evidence,
            }
            for r in regions
        ],
    }


@app.get(P + "/documents/{document_id}/file")
def download(document_id: str, db: DB, user: Actor):
    doc = document_access(db, user, document_id)
    return Response(
        storage.get(doc.storage_key),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{doc.id}.pdf"',
            "Cache-Control": "private, no-store",
        },
    )


@app.get(P + "/documents/{document_id}/pages/{page_index}/image")
def page_image(document_id: str, page_index: int, db: DB, user: Actor):
    return Response(
        pdf.render(document_access(db, user, document_id), page_index),
        media_type="image/png",
        headers={"Cache-Control": "private, no-store"},
    )


def rubric_view(rubric):
    return {
        "id": rubric.id,
        "assignment_id": rubric.assignment_id,
        "number": rubric.number,
        "status": rubric.status,
        "spec": rubric.spec,
        "provenance": rubric.provenance,
    }


@app.post(
    P + "/assignments/{assignment_id}/rubric-versions",
    status_code=201,
    response_model=RubricView,
    response_model_exclude_unset=True,
)
def manual_rubric(assignment_id: str, body: RubricSpec, db: DB, user: Actor):
    assignment, _ = assignment_access(db, user, assignment_id)
    require_staff(db, user, assignment.course_id, instructor=True)
    return rubric_view(create_rubric(db, assignment, body, user.id))


@app.get(
    P + "/rubric-versions/{rubric_id}", response_model=RubricView, response_model_exclude_unset=True
)
def get_rubric(rubric_id: str, db: DB, user: Actor):
    rubric = found(db, Rubric, rubric_id)
    assignment, role = assignment_access(db, user, rubric.assignment_id)
    if role == "student":
        raise HTTPException(404, "Rubric not found")
    return rubric_view(rubric)


@app.post(
    P + "/rubric-versions/{rubric_id}:publish",
    response_model=RubricView,
    response_model_exclude_unset=True,
)
def publish_rubric(rubric_id: str, db: DB, user: Actor):
    rubric = found(db, Rubric, rubric_id)
    assignment, _ = assignment_access(db, user, rubric.assignment_id)
    require_staff(db, user, assignment.course_id, instructor=True)
    if rubric.status == "draft":
        rubric.status = "published"
        audit(db, user.id, rubric, "rubric.published", {"number": rubric.number})
    return rubric_view(rubric)


@app.post(
    P + "/assignments/{assignment_id}/rubric-drafts:generate",
    response_model=JobOut,
    status_code=202,
)
def ai_rubric(assignment_id: str, body: DraftIn, key: Key, db: DB, user: Actor):
    assignment, _ = assignment_access(db, user, assignment_id)
    require_staff(db, user, assignment.course_id, instructor=True)
    providers.require_ai(assignment)
    job, _ = jobs.enqueue(
        db,
        user.id,
        assignment.course_id,
        "rubric_draft",
        {"assignment_id": assignment_id, **body.model_dump()},
        key,
    )
    return job


def submission_view(submission):
    return {
        "id": submission.id,
        "assignment_id": submission.assignment_id,
        "student_id": submission.student_id,
        "document_id": submission.document_id,
        "revision": submission.revision,
        "created_at": submission.created_at,
        "region_map": submission.region_map,
    }


@app.post(
    P + "/assignments/{assignment_id}/submissions",
    status_code=201,
    response_model=SubmissionView,
    response_model_exclude_unset=True,
)
def submit(assignment_id: str, body: SubmissionIn, db: DB, user: Actor):
    assignment, role = assignment_access(db, user, assignment_id)
    student_id = body.student_id or user.id
    if role == "student" and student_id != user.id:
        raise HTTPException(403, "Submit only your own work")
    member = db.scalar(
        select(Membership).where(
            Membership.course_id == assignment.course_id,
            Membership.user_id == student_id,
            Membership.role == "student",
        )
    )
    if not member:
        raise HTTPException(422, "Submission owner must be enrolled as a student")
    doc = document_access(db, user, body.document_id)
    if doc.course_id != assignment.course_id or doc.kind != "submission":
        raise HTTPException(422, "Select a submission PDF from this course")
    revision = (
        db.scalar(
            select(func.max(Submission.revision)).where(
                Submission.assignment_id == assignment_id, Submission.student_id == student_id
            )
        )
        or 0
    ) + 1
    submission = Submission(
        assignment_id=assignment_id,
        student_id=student_id,
        document_id=doc.id,
        revision=revision,
        region_map={},
    )
    # Ownership follows the enrolled student when an instructor uploads on their behalf.
    doc.owner_id = student_id
    db.add(submission)
    db.flush()
    return submission_view(submission)


@app.get(
    P + "/assignments/{assignment_id}/submissions",
    response_model=list[SubmissionView],
    response_model_exclude_unset=True,
)
def submissions(assignment_id: str, db: DB, user: Actor, limit: Limit = 50, offset: Offset = 0):
    _, role = assignment_access(db, user, assignment_id)
    query = select(Submission).where(Submission.assignment_id == assignment_id)
    if role == "student":
        query = query.where(Submission.student_id == user.id)
    return [
        submission_view(s)
        for s in db.scalars(
            query.order_by(Submission.created_at.desc()).limit(limit).offset(offset)
        )
    ]


@app.get(
    P + "/submissions/{submission_id}",
    response_model=SubmissionView,
    response_model_exclude_unset=True,
)
def get_submission(submission_id: str, db: DB, user: Actor):
    submission, _, _ = submission_access(db, user, submission_id)
    return {
        **submission_view(submission),
        "assessments": [
            {"id": a.id, "status": a.status, "rubric_id": a.rubric_id}
            for a in db.scalars(
                select(Assessment)
                .where(Assessment.submission_id == submission_id)
                .order_by(Assessment.created_at)
            )
        ],
    }


@app.put(
    P + "/submissions/{submission_id}/regions",
    response_model=SubmissionView,
    response_model_exclude_unset=True,
)
def map_regions(submission_id: str, body: RegionMapIn, db: DB, user: Actor):
    submission, assignment, _ = submission_access(db, user, submission_id)
    require_staff(db, user, assignment.course_id)
    has_assessment = db.scalar(
        select(Assessment.id).where(Assessment.submission_id == submission_id).limit(1)
    )
    pending = any(
        j.payload.get("submission_id") == submission_id
        for j in db.scalars(
            select(Job).where(Job.course_id == assignment.course_id, Job.kind == "assessment")
        )
    )
    if has_assessment or pending:
        raise HTTPException(
            409, "Evidence is pinned after assessment begins; submit a new revision"
        )
    doc = db.get(Document, submission.document_id)
    question_ids = {q["id"] for q in assignment.data["questions"]}
    mapping = {qid: list(ids) for qid, ids in body.question_regions.items()}
    if not set(mapping) <= question_ids:
        raise HTTPException(422, "Unknown question")
    for ids in mapping.values():
        for region_id in ids:
            region = db.get(Region, region_id)
            if not region or region.document_id != doc.id:
                raise HTTPException(422, "Mapped evidence must belong to this document")
    for r in body.manual_regions:
        if (
            r.question_id not in question_ids
            or r.page_index >= len(doc.pages)
            or not pdf.valid_bbox(r.bbox, doc.pages[r.page_index])
        ):
            raise HTTPException(422, "Invalid manual region")
        region = Region(
            document_id=doc.id,
            page_index=r.page_index,
            text=r.text,
            bbox=list(r.bbox),
            granularity="step",
            source="manual",
            evidence={"actor_id": user.id},
        )
        db.add(region)
        db.flush()
        mapping.setdefault(r.question_id, []).append(region.id)
    submission.region_map = mapping
    audit(db, user.id, submission, "submission.regions_mapped", {"mapping": mapping})
    return submission_view(submission)


@app.post(P + "/submissions/{submission_id}/assessments", response_model=JobOut, status_code=202)
def start_assessment(submission_id: str, body: AssessmentIn, key: Key, db: DB, user: Actor):
    submission, assignment, role = submission_access(db, user, submission_id)
    rubric = found(db, Rubric, body.rubric_id)
    if rubric.assignment_id != assignment.id or rubric.status != "published":
        raise HTTPException(422, "Select a published rubric for this assignment")
    if body.source == "manual" and role == "student":
        raise HTTPException(403, "Students cannot write grading outcomes")
    if body.source == "ai":
        providers.require_ai(assignment)
        if assignment.data["ocr_enabled"]:
            providers.require_ai(assignment, ocr=True)
        if len(assignment.data["questions"]) > 1 and any(
            not submission.region_map.get(q["id"]) for q in assignment.data["questions"]
        ):
            raise HTTPException(422, "Map each question to submission regions before AI assessment")
    job, created = jobs.enqueue(
        db,
        user.id,
        assignment.course_id,
        "assessment",
        {"submission_id": submission_id, **body.model_dump(mode="json")},
        key,
    )
    if created and body.source == "manual":
        assessment = new_assessment(db, submission, rubric, body.results, user.id, "manual")
        job.status, job.result_id = "succeeded", assessment.id
    return job


@app.get(
    P + "/assessments/{assessment_id}",
    response_model=AssessmentView,
    response_model_exclude_unset=True,
)
def get_assessment(assessment_id: str, db: DB, user: Actor):
    assessment, _, assignment, role = assessment_access(db, user, assessment_id)
    result = {
        "id": assessment.id,
        "submission_id": assessment.submission_id,
        "rubric_id": assessment.rubric_id,
        "status": assessment.status,
        "version": assessment.version,
        "source": assessment.source,
    }
    if role != "student" or (
        assessment.status == "finalized" and assignment.data["feedback_policy"]["show_scores"]
    ):
        result["score"] = float(assessment.score) if assessment.score is not None else None
    if role != "student":
        result.update(
            {
                "provenance": assessment.provenance,
                "original_proposal": assessment.original_proposal,
                "results": [
                    {
                        "criterion_id": r.criterion_id,
                        "status": r.status,
                        "band_id": r.band_id,
                        "points": float(r.points) if r.points is not None else None,
                        "rationale": r.rationale,
                    }
                    for r in db.scalars(
                        select(CriterionResult).where(
                            CriterionResult.assessment_id == assessment_id
                        )
                    )
                ],
                "findings": [
                    finding_view(f)
                    for f in db.scalars(
                        select(Finding).where(Finding.assessment_id == assessment_id)
                    )
                ],
            }
        )
    return result


@app.put(P + "/assessments/{assessment_id}/results")
def edit_results(assessment_id: str, body: ResultsEdit, db: DB, user: Actor):
    assessment, _, assignment, _ = assessment_access(db, user, assessment_id)
    require_staff(db, user, assignment.course_id)
    check_editable(assessment, body.expected_version)
    previous = [
        {
            "criterion_id": r.criterion_id,
            "band_id": r.band_id,
            "status": r.status,
            "rationale": r.rationale,
        }
        for r in db.scalars(
            select(CriterionResult).where(CriterionResult.assessment_id == assessment_id)
        )
    ]
    replace_results(db, assessment, body.results)
    assessment.version += 1
    audit(
        db,
        user.id,
        assessment,
        "assessment.results_edited",
        {"before": previous, "after": body.model_dump(mode="json")},
    )
    db.flush()
    return {"id": assessment.id, "version": assessment.version}


@app.post(
    P + "/assessments/{assessment_id}/findings",
    status_code=201,
    response_model=FindingView,
    response_model_exclude_unset=True,
)
def manual_finding(assessment_id: str, body: FindingIn, db: DB, user: Actor):
    assessment, _, assignment, _ = assessment_access(db, user, assessment_id)
    require_staff(db, user, assignment.course_id)
    check_editable(assessment)
    finding = add_finding(db, assessment, body, user.id)
    finding.confirmed = course_role(db, user, assignment.course_id) == "instructor"
    assessment.version += 1
    db.flush()
    return finding_view(finding)


@app.patch(
    P + "/findings/{finding_id}", response_model=FindingView, response_model_exclude_unset=True
)
def edit_finding(finding_id: str, body: FindingEdit, db: DB, user: Actor):
    finding = found(db, Finding, finding_id)
    assessment, _, assignment, role = assessment_access(db, user, finding.assessment_id)
    require_staff(db, user, assignment.course_id)
    check_editable(assessment)
    if finding.version != body.expected_version:
        raise HTTPException(409, "Finding changed; reload and retry")
    if body.confirmed and role != "instructor":
        raise HTTPException(403, "Only instructors can confirm findings")
    previous = finding_view(finding)
    qid, data = validate_finding(
        db,
        assessment,
        body.model_dump(exclude={"expected_version", "dismissed", "confirmed"}),
        finding.id,
    )
    finding.question_id, finding.data = qid, data
    finding.criterion_id, finding.pattern_id, finding.category = (
        data["criterion_id"],
        data["pattern_id"],
        data["category"],
    )
    finding.status = (
        "dismissed" if body.dismissed else ("active" if data["anchor"] else "pending_anchor")
    )
    finding.confirmed = body.confirmed
    finding.version += 1
    assessment.version += 1
    audit(
        db,
        user.id,
        finding,
        "finding.edited",
        {"before": previous, "after": body.model_dump(mode="json")},
    )
    db.flush()
    return finding_view(finding)


@app.post(P + "/assessments/{assessment_id}:finalize")
def finalize(assessment_id: str, body: FinalizeIn, db: DB, user: Actor):
    assessment, _, assignment, _ = assessment_access(db, user, assessment_id)
    require_staff(db, user, assignment.course_id, instructor=True)
    check_editable(assessment, body.expected_version)
    if assessment.score is None:
        raise HTTPException(409, "Resolve uncertain criterion outcomes before finalizing")
    findings = list(
        db.scalars(
            select(Finding).where(
                Finding.assessment_id == assessment_id, Finding.status != "dismissed"
            )
        )
    )
    if any(f.status == "pending_anchor" or f.category == "uncertain" for f in findings):
        raise HTTPException(
            409, "Resolve or dismiss uncertain/unpositioned findings before finalizing"
        )
    assessment.status, assessment.finalized_by = "finalized", user.id
    for f in findings:
        f.confirmed = True
    audit(db, user.id, assessment, "assessment.finalized", {"review_acknowledged": True})
    db.flush()
    return {
        "id": assessment.id,
        "status": assessment.status,
        "version": assessment.version,
        "score": float(assessment.score),
    }


@app.post(
    P + "/assessments/{assessment_id}/feedback",
    response_model=FeedbackView | JobOut,
    response_model_exclude_unset=True,
)
def issue_feedback(
    assessment_id: str, body: FeedbackIn, key: Key, db: DB, user: Actor, response: Response
):
    assessment, _, assignment, role = assessment_access(db, user, assessment_id)
    if body.source == "manual" and role == "student":
        raise HTTPException(403, "Students cannot author official feedback")
    if body.source != "manual" and body.manual_items:
        raise HTTPException(422, "Manual text is only allowed with manual source")
    level = feedback.effective_level(assignment, body.requested_level)
    payload = {"assessment_id": assessment_id, **body.model_dump(mode="json")}
    if body.source == "ai":
        providers.require_ai(assignment)
        if not assignment.data["feedback_policy"]["allow_generated"]:
            raise HTTPException(403, "Generated feedback is disabled")
    job, created = jobs.enqueue(db, user.id, assignment.course_id, "feedback", payload, key)
    if not created:
        if job.status == "succeeded":
            return feedback.issued_view(found(db, IssuedFeedback, job.result_id))
        response.status_code = 202
        return JobOut.model_validate(job)
    if body.source == "ai" and not feedback.hints_ready(db, assignment, assessment, level, "ai"):
        response.status_code = 202
        return JobOut.model_validate(job)
    if body.source == "bank":
        feedback.prepare_hints(db, assignment, assessment, level, "bank")
    record = feedback.issue(
        db,
        assignment,
        assessment,
        user.id,
        level,
        body.source,
        [i.model_dump() for i in body.manual_items],
    )
    job.status, job.result_id = "succeeded", record.id
    return feedback.issued_view(record)


@app.get(
    P + "/submissions/{submission_id}/feedback",
    response_model=list[FeedbackView],
    response_model_exclude_unset=True,
)
def get_feedback(submission_id: str, db: DB, user: Actor, limit: Limit = 50, offset: Offset = 0):
    submission_access(db, user, submission_id)
    records = db.scalars(
        select(IssuedFeedback)
        .join(Assessment)
        .where(Assessment.submission_id == submission_id)
        .order_by(IssuedFeedback.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [feedback.issued_view(f) for f in records]


@app.get(P + "/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: DB, user: Actor):
    return job_access(db, user, job_id)


@app.post(P + "/jobs/{job_id}:retry", response_model=JobOut, status_code=202)
def retry_job(job_id: str, db: DB, user: Actor):
    job = job_access(db, user, job_id)
    if job.status != "failed" or job.attempts >= 3:
        raise HTTPException(409, "Only failed jobs with fewer than three attempts may retry")
    job.status, job.error_code, job.lease_until = "queued", None, None
    return job


def analytics_access(db, user, assignment_id, rubric_id):
    assignment, _ = assignment_access(db, user, assignment_id)
    require_staff(db, user, assignment.course_id)
    rubric = found(db, Rubric, rubric_id)
    if rubric.assignment_id != assignment.id or rubric.status != "published":
        raise HTTPException(422, "Select a published rubric for this assignment")
    return assignment


@app.get(
    P + "/assignments/{assignment_id}/analytics/questions",
    response_model=AnalyticsView,
    response_model_exclude_unset=True,
)
def question_analytics(
    assignment_id: str,
    rubric_id: str,
    db: DB,
    user: Actor,
    attempt_policy: Literal["latest_assessed", "first_submitted"] = "latest_assessed",
):
    assignment = analytics_access(db, user, assignment_id, rubric_id)
    return analytics.report(db, assignment, rubric_id, attempt_policy)


@app.get(
    P + "/assignments/{assignment_id}/analytics/patterns",
    response_model=AnalyticsView,
    response_model_exclude_unset=True,
)
def pattern_analytics(
    assignment_id: str,
    rubric_id: str,
    db: DB,
    user: Actor,
    attempt_policy: Literal["latest_assessed", "first_submitted"] = "latest_assessed",
):
    assignment = analytics_access(db, user, assignment_id, rubric_id)
    return analytics.report(db, assignment, rubric_id, attempt_policy, patterns=True)


@app.post(P + "/assessments/{assessment_id}/math-checks", status_code=201)
def add_math_check(assessment_id: str, body: MathCheckIn, db: DB, user: Actor):
    from .math_checks import polynomial_identity
    from .models import MathCheck

    assessment, _, assignment, _ = assessment_access(db, user, assessment_id)
    require_staff(db, user, assignment.course_id)
    check_editable(assessment)
    check = MathCheck(
        assessment_id=assessment_id,
        actor_id=user.id,
        lhs=body.lhs,
        rhs=body.rhs,
        result=polynomial_identity(body.lhs, body.rhs),
    )
    db.add(check)
    db.flush()
    return {
        "id": check.id,
        "result": check.result,
        "scope": "polynomial_identity_only",
        "assessment_verified": False,
    }
