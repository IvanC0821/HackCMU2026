"""Public response schemas. Optional staff fields are omitted, never null-filled for students."""

from typing import Any

from pydantic import BaseModel

from .schemas import Anchor, FeedbackPolicy, Question, RubricSpec


class UserView(BaseModel):
    id: str
    email: str
    name: str
    role: str
    memberships: list[dict[str, str]] | None = None


class CourseView(BaseModel):
    id: str
    title: str


class AssignmentView(BaseModel):
    setup_job_id: str | None = None
    id: str
    course_id: str
    title: str
    questions: list[Question]
    feedback_policy: FeedbackPolicy
    published_rubrics: list[dict[str, Any]] | None = None
    material_document_ids: list[str] | None = None
    external_ai_allowed: bool | None = None
    ocr_enabled: bool | None = None


class PageGeometry(BaseModel):
    page_index: int
    width: float
    height: float
    rotation: int
    cropbox: list[float]
    rotation_matrix: list[float]
    derotation_matrix: list[float]
    render_scale: float
    page_to_image: list[float]
    image_to_page: list[float]
    coordinate_space: str


class RegionView(BaseModel):
    id: str
    page_index: int
    text: str
    bbox: list[float]
    granularity: str
    source: str
    evidence: dict[str, Any]


class DocumentView(BaseModel):
    id: str
    kind: str
    pages: list[PageGeometry]
    byte_size: int | None = None
    ocr_complete: bool | None = None
    regions: list[RegionView] | None = None


class RubricView(BaseModel):
    id: str
    assignment_id: str
    number: int
    status: str
    spec: RubricSpec
    provenance: dict[str, Any]


class SubmissionView(BaseModel):
    id: str
    assignment_id: str
    student_id: str
    document_id: str
    revision: int
    created_at: float
    region_map: dict[str, list[str]]
    assessments: list[dict[str, Any]] | None = None


class FindingView(BaseModel):
    id: str
    assessment_id: str
    question_id: str
    criterion_id: str
    pattern_id: str | None
    category: str
    impact: str
    description: str
    evidence_region_ids: list[str]
    anchor: Anchor | None
    root_cause_id: str | None
    source: str
    status: str
    confirmed: bool
    version: int


class ResultView(BaseModel):
    criterion_id: str
    status: str
    band_id: str | None
    points: float | None
    rationale: str


class AssessmentView(BaseModel):
    id: str
    submission_id: str
    rubric_id: str
    status: str
    version: int
    source: str
    score: float | None = None
    provenance: dict[str, Any] | None = None
    original_proposal: dict[str, Any] | None = None
    results: list[ResultView] | None = None
    findings: list[FindingView] | None = None


class FeedbackItemView(BaseModel):
    hint_bank_id: str | None = None
    hint_bank_version: int | None = None
    text: str
    level: int
    source: str
    finding_id: str | None = None
    finding_version: int | None = None
    question_id: str | None = None
    anchor: Anchor | None = None
    assessment_source: str | None = None
    instructor_confirmed: bool | None = None


class FeedbackView(BaseModel):
    id: str
    issued_at: float
    assessment_id: str
    rubric_id: str
    effective_level: int
    items: list[FeedbackItemView]
    grade_status: str
    advisory: bool


class AnalyticsView(BaseModel):
    assignment_id: str
    rubric_version_id: str
    taxonomy_version_id: str
    attempt_policy: str
    as_of: str
    items: list[dict[str, Any]]
