import json

import httpx
import pytest
from conftest import call
from openai import OpenAI
from sqlalchemy import select

from verity import providers
from verity.models import Assignment, Document, Region
from verity.schemas import AIHint


def test_openai_adapter_uses_structured_outputs_images_and_no_storage(env, monkeypatch):
    requests = []

    def handle(request):
        body = json.loads(request.content)
        requests.append(body)
        assert body["store"] is False
        assert body["text"]["format"]["type"] == "json_schema"
        assert body["text"]["format"]["strict"] is True
        assert body["input"][0]["content"][1]["image_url"].startswith("data:image/png;base64,")
        return httpx.Response(
            200,
            json={
                "id": "resp_test",
                "object": "response",
                "created_at": 1,
                "model": "test-model",
                "status": "completed",
                "output": [
                    {
                        "type": "message",
                        "id": "msg_test",
                        "role": "assistant",
                        "status": "completed",
                        "content": [
                            {
                                "type": "output_text",
                                "text": json.dumps({"text": "Check the inductive hypothesis."}),
                                "annotations": [],
                            }
                        ],
                    }
                ],
            },
        )

    monkeypatch.setattr(
        providers,
        "OpenAI",
        lambda **kwargs: OpenAI(
            **kwargs, http_client=httpx.Client(transport=httpx.MockTransport(handle))
        ),
    )
    result = providers.structured(AIHint, "Give a hint", {"concept": "induction"}, [b"png"])
    assert result.text == "Check the inductive hypothesis."
    assert len(requests) == 1


def test_mathpix_preserves_geometry_and_no_ai_switch(env, homework, monkeypatch):
    env["config"].external_ai_enabled = True
    env["config"].mathpix_app_id = "test-id"
    env["config"].mathpix_app_key = "test-key"

    def post(url, **kwargs):
        assert url == "https://api.mathpix.com/v3/text"
        assert kwargs["json"]["auto_rotate_confidence_threshold"] == 1
        assert kwargs["json"]["improve_mathpix"] is False
        assert kwargs["json"]["include_line_data"] is True
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={
                "line_data": [
                    {
                        "id": "line-1",
                        "text": "x = -1",
                        "cnt": [[120, 150], [240, 150], [240, 180], [120, 180]],
                        "confidence": 0.75,
                        "conversion_output": True,
                    }
                ]
            },
        )

    monkeypatch.setattr(providers.httpx, "post", post)
    with env["factory"]() as db:
        assignment = db.get(Assignment, homework["assignment"]["id"])
        doc = db.get(Document, homework["doc"]["id"])
        providers.extract_ocr(db, assignment, doc)
        region = db.scalar(
            select(Region).where(Region.document_id == doc.id, Region.source == "mathpix")
        )
        assert region.bbox == [80, 100, 160, 120]
        assert region.text == "x = -1" and region.granularity == "step"
        assert region.evidence["confidence"] == 0.75
        env["config"].external_ai_enabled = False
        with pytest.raises(providers.ProviderFailure, match="external_ai_disabled"):
            providers.extract_ocr(db, assignment, doc)


def test_pdf_original_is_byte_preserved(env, homework):
    from conftest import pdf_bytes

    raw = pdf_bytes()
    uploaded = call(
        env,
        "POST",
        f"/documents?course_id={homework['course']['id']}&kind=answer_key",
        files={"file": ("key.pdf", raw, "application/pdf")},
        expected=201,
    )
    response = env["client"].get(
        f"/api/v1/documents/{uploaded['id']}/file", headers=env["actors"]["instructor"]["headers"]
    )
    assert response.content == raw and response.headers["cache-control"] == "private, no-store"
