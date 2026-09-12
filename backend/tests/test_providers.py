import json

import httpx
from conftest import call
from openai import OpenAI

from verity import providers
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
