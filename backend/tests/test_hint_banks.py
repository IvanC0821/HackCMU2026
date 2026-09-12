from copy import deepcopy

import pytest
from conftest import approve_hints, call, finding_body, manual_assessment, pdf_bytes
from sqlalchemy import func, select

from verity import hint_banks, jobs, providers
from verity.models import Assignment, HintBank, Job


def draft(env, homework):
    return call(
        env,
        "POST",
        f"/assignments/{homework['assignment']['id']}/rubric-versions",
        body=homework["spec"],
        expected=201,
    )


def test_review_edits_and_approval_gate_with_immediate_offline_feedback(env, homework, monkeypatch):
    rubric = draft(env, homework)
    path = f"/rubric-versions/{rubric['id']}/hint-bank"
    bank = call(env, "GET", path)
    call(env, "POST", f"/rubric-versions/{rubric['id']}:publish", expected=409)
    call(env, "GET", path, role="student", expected=403)
    call(
        env,
        "POST",
        path + ":approve",
        role="ta",
        body={"expected_version": bank["version"]},
        expected=403,
    )
    edited = deepcopy(bank["entries"])
    for entry in edited:
        if entry["pattern_id"] == "circular_induction" and entry["level"] == 2:
            entry["text"] = "List what is assumed for k before working on the next case."
    saved = call(env, "PUT", path, body={"expected_version": bank["version"], "entries": edited})
    assert saved["original"] == bank["original"]
    call(env, "POST", path + ":approve", body={"expected_version": bank["version"]}, expected=409)
    approved = approve_hints(env, rubric["id"])
    call(env, "POST", f"/rubric-versions/{rubric['id']}:publish")
    call(
        env,
        "PUT",
        path,
        body={"expected_version": approved["version"], "entries": edited},
        expected=409,
    )
    hw = {**homework, "rubric": rubric}
    aid = manual_assessment(env, hw)
    call(env, "POST", f"/assessments/{aid}/findings", body=finding_body(hw), expected=201)
    monkeypatch.setattr(
        providers, "structured", lambda *a, **k: pytest.fail("Student feedback called AI")
    )
    for i in range(3):
        result = call(
            env,
            "POST",
            f"/assessments/{aid}/feedback",
            role="student",
            key=f"hint-{i}",
            body={"source": "ai", "requested_level": 4},
        )
        assert (
            result["items"][0]["text"]
            == "List what is assumed for k before working on the next case."
        )
        assert result["items"][0]["level"] == 2
        assert result["items"][0]["hint_bank_id"] == approved["id"]
    assert not jobs.run_once(env["factory"])


def test_generation_uses_attached_graded_examples_and_preserves_professor_override(
    env, homework, monkeypatch
):
    example = call(
        env,
        "POST",
        f"/documents?course_id={homework['course']['id']}&kind=graded_example",
        files={"file": ("graded.pdf", pdf_bytes(), "application/pdf")},
        expected=201,
    )
    with env["factory"]() as db:
        a = db.get(Assignment, homework["assignment"]["id"])
        a.data = {**a.data, "material_document_ids": [homework["key"]["id"], example["id"]]}
        db.commit()
    env["config"].external_ai_enabled = True
    rubric = draft(env, homework)
    path = f"/rubric-versions/{rubric['id']}/hint-bank"
    bank = call(env, "GET", path)
    assert bank["job"]["status"] == "queued"
    captured = []

    def generate(schema, instructions, payload, images):
        captured.append(payload)
        assert len(images) == 2
        assert any(m["kind"] == "graded_example" and m["text"] for m in payload["materials"])
        entries = [
            {**e, "text": "Check the hypothesis before using it in the next step."}
            for e in payload["entries"]
        ]
        return hint_banks.Proposal(
            entries=entries,
            calibration_notes="The graded example highlights circular reasoning; preserve alternative proofs.",
        )

    monkeypatch.setattr(providers, "structured", generate)
    assert jobs.run_once(env["factory"])
    generated = call(env, "GET", path)
    assert generated["status"] == "draft" and generated["job"]["status"] == "succeeded"
    assert generated["provenance"]["documents"][1]["document_id"] == example["id"]
    assert len(captured) == 1
    pending = call(
        env,
        "POST",
        path + ":generate",
        body={"expected_version": generated["version"]},
        expected=202,
    )
    entries = [
        {**e, "text": "Professor revision: check the base case first."} for e in pending["entries"]
    ]
    edited = call(
        env, "PUT", path, body={"expected_version": pending["version"], "entries": entries}
    )
    assert jobs.run_once(env["factory"])
    final = call(env, "GET", path)
    assert final["entries"] == edited["entries"]
    assert final["original"] == generated["original"]
    assert final["job"]["error_code"] == "hint_draft_changed" and len(captured) == 1


def test_invalid_model_targets_fail_without_partial_hints_and_retry_is_explicit(
    env, homework, monkeypatch
):
    env["config"].external_ai_enabled = True
    rubric = draft(env, homework)
    path = f"/rubric-versions/{rubric['id']}/hint-bank"
    before = call(env, "GET", path)
    monkeypatch.setattr(
        providers, "structured", lambda *args: hint_banks.Proposal(entries=[], calibration_notes="")
    )
    jobs.run_once(env["factory"])
    after = call(env, "GET", path)
    assert after["entries"] == before["entries"] and after["status"] == "draft"
    assert after["job"]["status"] == "failed"
    assert not jobs.run_once(env["factory"])
    bad = deepcopy(after["entries"])
    bad[0]["level"] = 4
    call(
        env, "PUT", path, body={"expected_version": after["version"], "entries": bad}, expected=422
    )
    bad = deepcopy(after["entries"])
    bad[0]["text"] = "word " * 81
    call(
        env, "PUT", path, body={"expected_version": after["version"], "entries": bad}, expected=422
    )
    # Manual repair/approval remains possible even when generation failed.
    approve_hints(env, rubric["id"])


def test_assignment_creation_queues_setup_without_waiting_for_ai(env, homework):
    env["config"].external_ai_enabled = True
    result = call(
        env,
        "POST",
        f"/courses/{homework['course']['id']}/assignments",
        expected=201,
        body={
            "title": "New homework",
            "questions": [{"id": "q1", "prompt": "Prove the claim."}],
            "external_ai_allowed": True,
            "feedback_policy": {"allow_generated": True},
        },
    )
    job = call(env, "GET", f"/jobs/{result['setup_job_id']}")
    assert job["kind"] == "rubric_draft" and job["status"] == "queued"
    public = call(env, "GET", f"/assignments/{result['id']}", role="student")
    assert "setup_job_id" not in public


def test_worker_result_cannot_overwrite_concurrent_professor_edit(env, homework, monkeypatch):
    env["config"].external_ai_enabled = True
    rubric = draft(env, homework)
    path = f"/rubric-versions/{rubric['id']}/hint-bank"
    bank = call(env, "GET", path)

    def generate(schema, instructions, payload, images):
        with env["factory"]() as db:
            current = db.get(HintBank, bank["id"])
            hint_banks.edit(
                db,
                current,
                hint_banks.Edit(
                    expected_version=current.version,
                    entries=[{**e, "text": "Concurrent professor edit."} for e in current.entries],
                ),
                env["actors"]["instructor"]["id"],
            )
            db.commit()
        return hint_banks.Proposal(
            entries=payload["entries"], calibration_notes="Stale model draft"
        )

    monkeypatch.setattr(providers, "structured", generate)
    jobs.run_once(env["factory"])
    after = call(env, "GET", path)
    assert all(e["text"] == "Concurrent professor edit." for e in after["entries"])
    assert after["job"]["status"] == "failed"
    with env["factory"]() as db:
        assert db.scalar(select(func.count()).select_from(Job).where(Job.status == "running")) == 0
