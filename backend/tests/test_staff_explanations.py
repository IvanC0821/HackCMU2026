import json
from types import SimpleNamespace

from fastapi.testclient import TestClient

from verity import classroom_pilot, providers
from verity.classroom import app
from verity.classroom_dataset import MAXIMA
from verity.staff_explanations import STAFF_EXPLANATION_STYLE


def test_explanation_assets_are_served_without_external_dependencies():
    with TestClient(app) as client:
        for path in ["review-explanation.mjs", "vendor/katex.mjs"]:
            response = client.get(f"/connected/{path}")
            assert response.status_code == 200
            assert "javascript" in response.headers["content-type"]
        assert "renderAssessmentExplanation" in client.get("/staff/view.mjs").text


def test_native_grading_receives_concise_private_notation_guidance(monkeypatch):
    seen = {}
    monkeypatch.setattr(providers, "require_ai", lambda *_: None)

    def fake_structured(schema, instructions, payload, images):
        seen.update(instructions=instructions, payload=payload)
        return "test result"

    monkeypatch.setattr(providers, "structured", fake_structured)
    assert providers.assess_question(None, {}, {}, [], [], []) == "test result"
    assert STAFF_EXPLANATION_STYLE in seen["instructions"]
    for required in ["45 words", "Reason:", "Check:", "Rule:", r"\mathbf", r"\subseteq"]:
        assert required in seen["instructions"]
    assert "mathematically valid alternative methods" in seen["instructions"]
    assert "uncertain" in seen["instructions"]
    assert "Never return student-facing feedback here" in seen["instructions"]


def test_pilot_uses_same_guidance_without_changing_scoring_or_making_api_call(
    tmp_path, monkeypatch
):
    seen = {}
    folder = tmp_path / "target"
    folder.mkdir()
    (folder / "submission.pdf").write_bytes(b"fake local test only")
    (folder / "page_map.json").write_text(
        json.dumps(
            {
                "student_id": "test",
                "name": "Test student",
                "question_to_pages": {"q1": [0]},
            }
        )
    )
    assessment = classroom_pilot.PilotAssessment(
        parts=[
            classroom_pilot.PartAssessment(
                part_id=pid,
                points=maximum,
                category="logic",
                staff_reason="Reason: The work meets the rubric.",
                page_index=None,
                evidence_quote=None,
            )
            for pid, maximum in MAXIMA.items()
        ],
        staff_summary="Test double",
    )

    class FakePDF:
        def __enter__(self):
            return []

        def __exit__(self, *_):
            pass

    class FakeClient:
        def __init__(self, **_):
            self.responses = self

        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

        def parse(self, **kwargs):
            seen.update(kwargs)
            return SimpleNamespace(
                output_parsed=assessment,
                usage=None,
                model_dump_json=lambda **_: '{"testDouble":true}',
            )

    monkeypatch.setattr(classroom_pilot, "OpenAI", FakeClient)
    monkeypatch.setattr(classroom_pilot.pymupdf, "open", lambda *_: FakePDF())
    monkeypatch.setattr(classroom_pilot, "pdf_text", lambda *_: "test content")
    monkeypatch.setattr(
        classroom_pilot,
        "settings",
        lambda: SimpleNamespace(
            openai_api_key="test-only",
            openai_model="test-model",
            openai_reasoning_effort="high",
        ),
    )
    result = classroom_pilot.assess(tmp_path, folder, [], tmp_path / "out")
    assert result["score"] == sum(MAXIMA.values())
    assert seen["model"] == "test-model"
    assert seen["store"] is False
    assert STAFF_EXPLANATION_STYLE in seen["instructions"]
    assert "per-problem deduction caps" in seen["instructions"]
    assert "Inspect all mapped pages" in seen["instructions"]
    assert result["assessment"] == assessment.model_dump()
