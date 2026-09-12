import time
import uuid
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def uid():
    return str(uuid.uuid4())


class Record:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    created_at: Mapped[float] = mapped_column(Float, default=time.time, index=True)


class User(Record, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(320), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(20))
    external_subject: Mapped[str | None] = mapped_column(String(255), unique=True)


class Token(Record, Base):
    __tablename__ = "tokens"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    digest: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[float] = mapped_column(Float)


class Course(Record, Base):
    __tablename__ = "courses"
    title: Mapped[str] = mapped_column(String(160))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))


class Membership(Record, Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("course_id", "user_id"),)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))


class Assignment(Record, Base):
    __tablename__ = "assignments"
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    data: Mapped[dict] = mapped_column(JSON)


class Document(Record, Base):
    __tablename__ = "documents"
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    storage_key: Mapped[str] = mapped_column(String(200), unique=True)
    sha256: Mapped[str] = mapped_column(String(64))
    byte_size: Mapped[int] = mapped_column(Integer)
    pages: Mapped[list] = mapped_column(JSON)
    ocr_complete: Mapped[bool] = mapped_column(Boolean, default=False)


class Region(Record, Base):
    __tablename__ = "regions"
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    page_index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    bbox: Mapped[list] = mapped_column(JSON)
    granularity: Mapped[str] = mapped_column(String(20))
    source: Mapped[str] = mapped_column(String(20))
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)


class Rubric(Record, Base):
    __tablename__ = "rubrics"
    __table_args__ = (UniqueConstraint("assignment_id", "number"),)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    spec: Mapped[dict] = mapped_column(JSON)
    provenance: Mapped[dict] = mapped_column(JSON)


class Submission(Record, Base):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("assignment_id", "student_id", "revision"),)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), unique=True)
    revision: Mapped[int] = mapped_column(Integer)
    region_map: Mapped[dict] = mapped_column(JSON, default=dict)


class Assessment(Record, Base):
    __tablename__ = "assessments"
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"), index=True)
    rubric_id: Mapped[str] = mapped_column(ForeignKey("rubrics.id"), index=True)
    source: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), default="review_required")
    score: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    original_proposal: Mapped[dict | None] = mapped_column(JSON)
    provenance: Mapped[dict] = mapped_column(JSON)
    finalized_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    __mapper_args__ = {"version_id_col": version}


class CriterionResult(Record, Base):
    __tablename__ = "criterion_results"
    __table_args__ = (UniqueConstraint("assessment_id", "criterion_id"),)
    assessment_id: Mapped[str] = mapped_column(ForeignKey("assessments.id"), index=True)
    criterion_id: Mapped[str] = mapped_column(String(100))
    question_id: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(30))
    band_id: Mapped[str | None] = mapped_column(String(100))
    points: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    rationale: Mapped[str] = mapped_column(Text)


class Finding(Record, Base):
    __tablename__ = "findings"
    assessment_id: Mapped[str] = mapped_column(ForeignKey("assessments.id"), index=True)
    question_id: Mapped[str] = mapped_column(String(100), index=True)
    criterion_id: Mapped[str] = mapped_column(String(100))
    pattern_id: Mapped[str | None] = mapped_column(String(100), index=True)
    category: Mapped[str] = mapped_column(String(30), index=True)
    status: Mapped[str] = mapped_column(String(30))
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    data: Mapped[dict] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(20))
    version: Mapped[int] = mapped_column(Integer, default=1)
    __mapper_args__ = {"version_id_col": version}


class Hint(Record, Base):
    __tablename__ = "hints"
    __table_args__ = (UniqueConstraint("finding_id", "finding_version", "level", "source"),)
    finding_id: Mapped[str] = mapped_column(ForeignKey("findings.id"), index=True)
    finding_version: Mapped[int] = mapped_column(Integer)
    level: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(20))
    text: Mapped[str] = mapped_column(Text)
    provenance: Mapped[dict] = mapped_column(JSON)


class IssuedFeedback(Record, Base):
    __tablename__ = "issued_feedback"
    assessment_id: Mapped[str] = mapped_column(ForeignKey("assessments.id"), index=True)
    issued_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    payload: Mapped[dict] = mapped_column(JSON)


class Job(Record, Base):
    __tablename__ = "jobs"
    __table_args__ = (UniqueConstraint("actor_id", "idempotency_key"),)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    idempotency_key: Mapped[str] = mapped_column(String(128))
    request_hash: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON)
    result_id: Mapped[str | None] = mapped_column(String(36))
    error_code: Mapped[str | None] = mapped_column(String(80))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    lease_until: Mapped[float | None] = mapped_column(Float)


class AuditEvent(Record, Base):
    __tablename__ = "audit_events"
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    object_id: Mapped[str] = mapped_column(String(36), index=True)
    action: Mapped[str] = mapped_column(String(80))
    detail: Mapped[dict] = mapped_column(JSON)


class MathCheck(Record, Base):
    __tablename__ = "math_checks"
    assessment_id: Mapped[str] = mapped_column(ForeignKey("assessments.id"), index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    lhs: Mapped[str] = mapped_column(Text)
    rhs: Mapped[str] = mapped_column(Text)
    result: Mapped[str] = mapped_column(String(30))


class HintBank(Record, Base):
    __tablename__ = "assignment_hint_banks"
    __table_args__ = (UniqueConstraint("scope", "fingerprint"),)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    scope: Mapped[str] = mapped_column(String(80), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    context: Mapped[dict] = mapped_column(JSON)
    entries: Mapped[list] = mapped_column(JSON)
    original: Mapped[dict] = mapped_column(JSON, default=dict)
    provenance: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    approved_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    __mapper_args__ = {"version_id_col": version}
