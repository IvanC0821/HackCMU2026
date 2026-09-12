from types import SimpleNamespace

import pytest
from conftest import pdf_bytes
from fastapi import BackgroundTasks
from test_classroom import classroom as connected_classroom  # noqa: F401
from test_classroom import publish

from verity import classroom_rubrics, providers, rubric_drafting
from verity.classroom import Classroom
from verity.models import Document, User
from verity.schemas import AssignmentIn, RubricSpec

classroom = connected_classroom


def spec_for(questions, documents):
    return RubricSpec.model_validate(
        {
            "criteria": [
                {
                    "id": f"{q['id']}-work",
                    "question_id": q["id"],
                    "requirement": "Check the required graph, including labelled axes and units. Accept equivalent scales that show the requested behavior.",
                    "max_points": q.get("max_points", "10"),
                    "bands": [
                        {
                            "id": "full",
                            "description": "The required graph and labels are present and mathematically correct. Award full credit even if the student's scale differs from the solution.",
                            "points": q.get("max_points", "10"),
                        },
                        {
                            "id": "missing",
                            "description": "The required graph is absent. Award no graph credit, but do not remove separately earned calculation credit.",
                            "points": "0",
                        },
                    ],
                    "concept_ids": [],
                    "source_refs": [{"document_id": documents[0].id, "page_index": 0}],
                }
                for q in questions
            ],
            "patterns": [],
            "standards": [
                "Deduct for a small arithmetic slip once; preserve valid follow-through credit."
            ],
        }
    )


def test_all_reference_pages_are_labelled_and_rendered_over_old_limit(monkeypatch):
    doc = SimpleNamespace(id="reference", kind="standard", storage_key="key", pages=[{}] * 21)
    monkeypatch.setattr(rubric_drafting.storage, "get", lambda _: pdf_bytes(21))
    materials, images = rubric_drafting.reference_materials([doc])
    assert len(materials) == len(images) == 21
    assert materials[-1]["page_index"] == materials[-1]["image_index"] == 20
    assert all(m["document_id"] == "reference" and m["text"] for m in materials)
    assert all(image.startswith(b"\x89PNG") for image in images)


def test_limits_fail_before_reading_or_paying(monkeypatch):
    def forbidden(*args):
        pytest.fail("No PDF read or paid call is permitted after an over-limit preflight")

    monkeypatch.setattr(rubric_drafting.storage, "get", forbidden)
    doc = SimpleNamespace(pages=[{}] * 161)
    with pytest.raises(providers.ProviderFailure, match="rubric_reference_limit"):
        rubric_drafting.reference_materials([doc])
    assert AssignmentIn(
        title="HW",
        questions=[{"id": "q1", "prompt": "x"}],
        material_document_ids=[str(i) for i in range(14)],
    )


def test_readable_prompt_and_one_call_budget(monkeypatch):
    documents = [SimpleNamespace(id="reference", pages=[{}])]
    questions = [{"id": "q1", "max_points": "5.50"}]
    monkeypatch.setattr(rubric_drafting, "reference_materials", lambda docs: ([], [b"png"]))
    calls = []

    def structured(schema, instructions, payload, images, **kwargs):
        calls.append(kwargs)
        for phrase in [
            "2–4 clear sentences",
            "required graph",
            "do not deduct multiple times",
            "harmless spacing",
            "Unpublished",
        ]:
            assert phrase.lower() in instructions.lower()
        assert "hints to []" in instructions
        return spec_for(questions, documents)

    monkeypatch.setattr(providers, "structured", structured)
    result = rubric_drafting.generate(questions, documents, "Professor guidelines")
    assert str(result.criteria[0].max_points) == "5.50"
    assert calls == [{"max_output_tokens": 30000, "timeout": 300, "max_retries": 0}]


@pytest.mark.parametrize(
    "change,code",
    [
        (lambda s: s["criteria"][0].update(question_id="unknown"), "rubric_question_mismatch"),
        (lambda s: s["criteria"][0].update(source_refs=[]), "rubric_invalid_source"),
        (
            lambda s: s["criteria"][0]["source_refs"][0].update(page_index=3),
            "rubric_invalid_source",
        ),
        (
            lambda s: s["criteria"][0]["source_refs"][0].update(document_id="hidden-key"),
            "rubric_invalid_source",
        ),
    ],
)
def test_unsupported_drafts_are_not_importable(change, code):
    documents = [SimpleNamespace(id="reference", pages=[{}])]
    questions = [{"id": "q1", "max_points": "10"}]
    spec = spec_for(questions, documents).model_dump(mode="json")
    change(spec)
    with pytest.raises(providers.ProviderFailure, match=code):
        rubric_drafting.validate_draft(spec, questions, documents)
    with pytest.raises(providers.ProviderFailure, match="rubric_point_mismatch"):
        rubric_drafting.validate_draft(
            spec_for(questions, documents), [{"id": "q1", "max_points": "9"}], documents
        )


def test_connected_draft_opt_in_privacy_idempotency_and_unchanged_grades(classroom, monkeypatch):
    call, env, _ = classroom
    state = publish(call)
    body = {
        "expectedRevision": state["revision"],
        "consent": True,
        "requestId": "rubric-request-001",
    }
    call("POST", "/classroom/rubric-drafts", expected=409, json=body)
    monkeypatch.setattr(env["config"], "external_ai_enabled", True)
    call("POST", "/classroom/rubric-drafts", expected=422, json={**body, "consent": False})
    for role in ["student", "ta"]:
        call("POST", "/classroom/rubric-drafts", role, 403, json=body)
    call("POST", "/classroom/rubric-drafts", expected=409, json={**body, "expectedRevision": 0})
    calls = []

    def generate(questions, documents, instructions):
        assert all(doc.kind == "reference" for doc in documents)
        assert len(documents) == 3
        calls.append(True)
        return spec_for(questions, documents)

    monkeypatch.setattr(classroom_rubrics, "generate", generate)
    started = call("POST", "/classroom/rubric-drafts", expected=202, json=body)
    result = call("GET", f"/classroom/rubric-drafts/{started['id']}")
    assert result["status"] == "succeeded" and result["spec"]["criteria"]
    assert result["coverage"] == {"documents": 3, "pages": 6}
    call("POST", "/classroom/rubric-drafts", expected=202, json=body)
    assert len(calls) == 1
    call("GET", f"/classroom/rubric-drafts/{started['id']}", "student", 403)
    assert call("GET", "/classroom/workspace") == state
    assert "required graph" not in str(call("GET", "/classroom/student", "student"))


def test_failed_provider_is_scrubbed_and_submissions_cannot_be_references(classroom, monkeypatch):
    call, env, _ = classroom
    state = publish(call)
    monkeypatch.setattr(env["config"], "external_ai_enabled", True)

    def failed(*args):
        raise RuntimeError("private-key-student-content")

    monkeypatch.setattr(classroom_rubrics, "generate", failed)
    body = {
        "expectedRevision": state["revision"],
        "consent": True,
        "requestId": "rubric-failure-001",
    }
    job = call("POST", "/classroom/rubric-drafts", expected=202, json=body)
    result = call("GET", f"/classroom/rubric-drafts/{job['id']}")
    assert result["status"] == "failed" and "private-key" not in str(result)
    assert result["spec"] is None
    with env["factory"]() as db:
        room = db.get(Classroom, "classroom")
        doc = db.get(Document, room.state["documents"]["blank"]["remoteId"])
        doc.kind = "submission"
        db.commit()
    call(
        "POST",
        "/classroom/rubric-drafts",
        expected=422,
        json={**body, "requestId": "rubric-failure-002"},
    )


def test_concurrent_request_cannot_double_spend(classroom, monkeypatch):
    call, env, _ = classroom
    state = publish(call)
    monkeypatch.setattr(env["config"], "external_ai_enabled", True)
    with env["factory"]() as db:
        actor = db.get(User, env["actors"]["instructor"]["id"])
        body = classroom_rubrics.DraftRequest(
            expectedRevision=state["revision"], consent=True, requestId="rubric-concurrent-001"
        )
        background = BackgroundTasks()
        first = classroom_rubrics.create_draft(db, actor, body, background)
        assert first["status"] == "running" and len(background.tasks) == 1
    call(
        "POST",
        "/classroom/rubric-drafts",
        expected=409,
        json={**body.model_dump(), "requestId": "rubric-concurrent-002"},
    )


def test_workspace_can_change_while_model_works_without_overwrite(classroom, monkeypatch):
    call, env, _ = classroom
    state = publish(call)
    monkeypatch.setattr(env["config"], "external_ai_enabled", True)

    def concurrent(questions, documents, instructions):
        assert [d.rubric_role for d in documents] == ["assignment", "answer_key", "standard"]
        with env["factory"]() as db:
            room = db.get(Classroom, "classroom")
            next_state = {
                **room.state,
                "revision": room.revision + 1,
                "announcement": "Another staff edit",
            }
            room.state, room.revision = next_state, next_state["revision"]
            db.commit()
        return spec_for(questions, documents)

    monkeypatch.setattr(classroom_rubrics, "generate", concurrent)
    job = call(
        "POST",
        "/classroom/rubric-drafts",
        expected=202,
        json={
            "expectedRevision": state["revision"],
            "consent": True,
            "requestId": "rubric-snapshot-001",
        },
    )
    result = call("GET", f"/classroom/rubric-drafts/{job['id']}")
    assert result["status"] == "succeeded"
    assert result["revision"] == state["revision"]
    fresh = call("GET", "/classroom/workspace")
    assert fresh["announcement"] == "Another staff edit"
    assert fresh["versions"] == state["versions"]
    assert fresh["submissions"] == state["submissions"]
