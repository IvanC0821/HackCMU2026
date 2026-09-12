from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Identifier = Annotated[str, Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")]
Short = Annotated[str, Field(min_length=1, max_length=160)]
Text = Annotated[str, Field(min_length=1, max_length=10000)]
Points = Annotated[Decimal, Field(ge=0, le=10000, max_digits=8, decimal_places=2)]
Category = Literal["conceptual", "procedural", "execution", "notation", "incomplete", "uncertain"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class UserIn(Strict):
    email: Annotated[
        str, Field(min_length=3, max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    ]
    name: Short
    role: Literal["admin", "instructor", "student"] = "student"
    external_subject: Annotated[str, Field(max_length=255)] | None = None


class CourseIn(Strict):
    title: Short


class MemberIn(Strict):
    user_id: str
    role: Literal["instructor", "ta", "student"]


class Question(Strict):
    id: Identifier
    prompt: Text


class FeedbackPolicy(Strict):
    max_disclosure_level: int = Field(default=2, ge=0, le=4)
    release_level: int = Field(default=2, ge=0, le=4)
    location_visibility: Literal["point", "question", "hidden"] = "point"
    max_findings: int = Field(default=3, ge=1, le=10)
    max_words: int = Field(default=80, ge=10, le=300)
    allow_generated: bool = False
    show_scores: bool = True


class AssignmentIn(Strict):
    title: Short
    questions: list[Question] = Field(min_length=1, max_length=30)
    material_document_ids: list[str] = Field(default_factory=list, max_length=10)
    external_ai_allowed: bool = False
    ocr_enabled: bool = False
    feedback_policy: FeedbackPolicy = Field(default_factory=FeedbackPolicy)

    @model_validator(mode="after")
    def unique_questions(self):
        if len({q.id for q in self.questions}) != len(self.questions):
            raise ValueError("Question IDs must be unique")
        if self.ocr_enabled and not self.external_ai_allowed:
            raise ValueError("OCR requires external AI permission")
        return self


class SourceRef(Strict):
    document_id: str
    page_index: int = Field(ge=0)


class Band(Strict):
    id: Identifier
    description: Text
    points: Points


class Criterion(Strict):
    id: Identifier
    question_id: Identifier
    requirement: Text
    max_points: Points
    bands: list[Band] = Field(min_length=1, max_length=20)
    concept_ids: list[Identifier] = Field(default_factory=list, max_length=20)
    source_refs: list[SourceRef] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def valid_bands(self):
        if len({b.id for b in self.bands}) != len(self.bands):
            raise ValueError("Band IDs must be unique within a criterion")
        if any(b.points > self.max_points for b in self.bands):
            raise ValueError("Band points exceed criterion maximum")
        if max(b.points for b in self.bands) != self.max_points:
            raise ValueError("At least one band must award the criterion maximum")
        return self


class ApprovedHint(Strict):
    level: int = Field(ge=0, le=4)
    text: Annotated[str, Field(min_length=1, max_length=3000)]


class Pattern(Strict):
    id: Identifier
    concept_id: Identifier
    criterion_ids: list[Identifier] = Field(min_length=1, max_length=100)
    category: Category
    definition: Text
    exclusions: str = Field(default="", max_length=10000)
    hints: list[ApprovedHint] = Field(default_factory=list, max_length=5)

    @model_validator(mode="after")
    def unique_levels(self):
        if len({h.level for h in self.hints}) != len(self.hints):
            raise ValueError("Only one approved hint per disclosure level")
        return self


class RubricSpec(Strict):
    criteria: list[Criterion] = Field(min_length=1, max_length=100)
    patterns: list[Pattern] = Field(default_factory=list, max_length=100)
    standards: list[Text] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def validate_ids(self):
        ids = {c.id for c in self.criteria}
        if len(ids) != len(self.criteria) or len({p.id for p in self.patterns}) != len(
            self.patterns
        ):
            raise ValueError("Criterion and pattern IDs must be unique")
        for pattern in self.patterns:
            if not set(pattern.criterion_ids) <= ids:
                raise ValueError("Pattern references unknown criteria")
            for c in self.criteria:
                if c.id in pattern.criterion_ids and pattern.concept_id not in c.concept_ids:
                    raise ValueError("Pattern concept must belong to its criteria")
        return self


class SubmissionIn(Strict):
    document_id: str
    student_id: str | None = None


class ManualRegion(Strict):
    question_id: Identifier
    page_index: int = Field(ge=0)
    bbox: tuple[float, float, float, float]
    text: str = Field(default="", max_length=10000)


class RegionMapIn(Strict):
    question_regions: dict[str, list[str]] = Field(default_factory=dict)
    manual_regions: list[ManualRegion] = Field(default_factory=list, max_length=100)


class ResultIn(Strict):
    criterion_id: Identifier
    status: Literal["assessed", "uncertain", "not_applicable"]
    band_id: Identifier | None = None
    rationale: str = Field(default="", max_length=5000)

    @model_validator(mode="after")
    def band_required(self):
        if (self.status == "assessed") != (self.band_id is not None):
            raise ValueError("Only assessed results must have a band_id")
        return self


class AssessmentIn(Strict):
    rubric_id: str
    source: Literal["manual", "ai"] = "ai"
    results: list[ResultIn] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def result_source(self):
        if self.source == "ai" and self.results:
            raise ValueError("AI requests cannot supply grading outcomes")
        if self.source == "manual" and not self.results:
            raise ValueError("Manual assessment requires complete outcomes")
        return self


class Anchor(Strict):
    document_revision_id: str
    page_index: int = Field(ge=0)
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    units: Literal["pt"] = "pt"
    coordinate_space: Literal["pymupdf_unrotated"] = "pymupdf_unrotated"
    target_granularity: Literal["symbol", "term", "step"] = "step"
    relationship: Literal["at", "after_step"] = "at"
    placement_source: Literal["instructor", "evidence"] = "instructor"


class FindingIn(Strict):
    criterion_id: Identifier
    pattern_id: Identifier | None = None
    category: Category
    impact: Literal["local", "propagated", "solution_invalidating"] = "local"
    description: Text
    evidence_region_ids: list[str] = Field(default_factory=list, max_length=30)
    anchor: Anchor | None = None
    root_cause_id: str | None = None


class FindingEdit(FindingIn):
    expected_version: int = Field(ge=1)
    dismissed: bool = False
    confirmed: bool = False


class ResultsEdit(Strict):
    expected_version: int = Field(ge=1)
    results: list[ResultIn] = Field(min_length=1, max_length=100)


class FinalizeIn(Strict):
    expected_version: int = Field(ge=1)
    acknowledge_review: Literal[True]


class FeedbackIn(Strict):
    requested_level: int = Field(default=2, ge=0, le=4)
    source: Literal["bank", "ai", "manual"] = "bank"
    manual_items: list[ApprovedHint] = Field(default_factory=list, max_length=10)


class DraftIn(Strict):
    instructions: str = Field(default="", max_length=2000)


# Model-output schemas intentionally provide no model-controlled scores or coordinates.
class AIFinding(Strict):
    criterion_id: str
    pattern_id: str | None
    category: Category
    impact: Literal["local", "propagated", "solution_invalidating"]
    description: str
    evidence_region_ids: list[str]
    root_cause_index: int | None


class AIResult(Strict):
    criterion_id: str
    status: Literal["assessed", "uncertain", "not_applicable"]
    band_id: str | None
    rationale: str


class AIJudgment(Strict):
    results: list[AIResult]
    findings: list[AIFinding]


class AIHint(Strict):
    text: str


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    kind: str
    status: str
    result_id: str | None
    error_code: str | None
    attempts: int


class MathCheckIn(Strict):
    lhs: Annotated[str, Field(min_length=1, max_length=300)]
    rhs: Annotated[str, Field(min_length=1, max_length=300)]
