"""Exercise uploaded-attempt grading without a network or paid model request."""

from types import SimpleNamespace

import pytest
from test_classroom import classroom as shared_classroom
from test_classroom import publish, upload_attempt

from verity import classroom_assess
from verity.config import settings


@pytest.fixture
def classroom(env):
    yield from shared_classroom.__wrapped__(env)


def fake_model(monkeypatch, questions, calls, *, fail=False):
    results = [
        classroom_assess.CriterionResult(
            question_id=q["id"],
            criterion_id=c["id"],
            band_id=max(c["bands"], key=lambda b: b["points"])["id"],
            category="notation",
            staff_reason="PRIVATE verified grading rationale",
            page_index=None,
            evidence_quote=None,
        )
        for q in questions
        for c in q["criteria"]
    ]

    class Client:
        def __init__(self, **kwargs):
            self.responses = self

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def parse(self, **kwargs):
            calls.append(kwargs)
            if fail:
                raise RuntimeError("simulated unavailable provider")
            return SimpleNamespace(
                output_parsed=classroom_assess.AttemptAssessment(
                    results=results, staff_summary="PRIVATE test summary"
                ),
                usage=SimpleNamespace(
                    model_dump=lambda: {"input_tokens": 100, "output_tokens": 50}
                ),
                model_dump_json=lambda: '{"test":true}',
            )

    monkeypatch.setattr(classroom_assess, "OpenAI", Client)
    monkeypatch.setattr(settings(), "external_ai_enabled", True)
    monkeypatch.setattr(settings(), "openai_api_key", "test-key-not-a-credential")


def test_upload_assesses_once_and_keeps_staff_details_private(classroom, monkeypatch):
    call, _, _ = classroom
    published = publish(call)
    calls = []
    fake_model(monkeypatch, published["versions"][-1]["questions"], calls)
    attempt, body = upload_attempt(call)
    public = call("GET", "/classroom/student", "student")["attempts"][0]
    assert public["result"]["source"] == "ai"
    assert public["result"]["estimatedScore"] == 10
    assert public["result"]["reviewed"] is False
    assert "PRIVATE" not in str(public)
    call("POST", "/classroom/attempts", "student", 201, json=body)
    assert len(calls) == 1
    assert calls[0]["max_output_tokens"] == 16000
    content = calls[0]["input"][0]["content"]
    assert sum(item["type"] == "input_image" for item in content) == 2
    saved = call("GET", "/classroom/workspace")["submissions"][0]["attempts"][0]
    assert saved["id"] == attempt["id"]
    assert saved["assessmentMeta"]["usage"]["input_tokens"] == 100
    assert saved["reviewedAt"] is None
    assert all(not q["skimmed"] for q in saved["questions"].values())


def test_provider_failure_stays_ungraded_and_does_not_fake_success(classroom, monkeypatch):
    call, _, _ = classroom
    published = publish(call)
    calls = []
    fake_model(monkeypatch, published["versions"][-1]["questions"], calls, fail=True)
    upload_attempt(call)
    saved = call("GET", "/classroom/workspace")["submissions"][0]["attempts"][0]
    assert saved["assessmentSource"] == "failed"
    assert saved["reviewedAt"] is None
    assert call("GET", "/classroom/student", "student")["attempts"][0]["result"] is None
    assert len(calls) == 1
