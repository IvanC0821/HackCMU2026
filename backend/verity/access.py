from fastapi import HTTPException
from sqlalchemy import select

from .auth import course_role
from .models import Assessment, Assignment, Document, Job, Submission


def found(db, model, object_id):
    obj = db.get(model, object_id)
    if not obj:
        raise HTTPException(404, "Resource not found")
    return obj


def assignment_access(db, user, assignment_id):
    assignment = found(db, Assignment, assignment_id)
    role = course_role(db, user, assignment.course_id)
    return assignment, role


def submission_access(db, user, submission_id):
    submission = found(db, Submission, submission_id)
    assignment, role = assignment_access(db, user, submission.assignment_id)
    if role == "student" and submission.student_id != user.id:
        raise HTTPException(404, "Submission not found")
    return submission, assignment, role


def assessment_access(db, user, assessment_id):
    assessment = found(db, Assessment, assessment_id)
    submission, assignment, role = submission_access(db, user, assessment.submission_id)
    return assessment, submission, assignment, role


def document_access(db, user, document_id):
    doc = found(db, Document, document_id)
    role = course_role(db, user, doc.course_id)
    if role == "student":
        if doc.kind == "submission":
            submission = db.scalar(select(Submission).where(Submission.document_id == doc.id))
            if doc.owner_id != user.id or (submission and submission.student_id != user.id):
                raise HTTPException(404, "Document not found")
        elif doc.kind != "assignment":
            raise HTTPException(404, "Document not found")
    return doc


def job_access(db, user, job_id):
    job = found(db, Job, job_id)
    role = course_role(db, user, job.course_id)
    if role == "student" and (job.actor_id != user.id or job.kind == "rubric_draft"):
        raise HTTPException(404, "Job not found")
    return job
