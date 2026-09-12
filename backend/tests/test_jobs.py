import time

from conftest import call
from sqlalchemy import func, select

from verity import jobs, providers
from verity.models import Assessment, Finding, Job
from verity.schemas import AIFinding, AIJudgment, AIResult


def stub_assessor(monkeypatch, invalid_evidence=False, uncertain=False):
    def assess(assignment, question, rubric, regions, images, materials):
        assert images and materials
        return AIJudgment(
            results=[
                AIResult(
                    criterion_id="base_case",
                    status="assessed",
                    band_id="correct",
                    rationale="Base case holds.",
                ),
                AIResult(
                    criterion_id="inductive_step",
                    status="uncertain" if uncertain else "assessed",
                    band_id=None if uncertain else "circular",
                    rationale="Requires instructor review.",
                ),
            ],
            findings=[
                AIFinding(
                    criterion_id="inductive_step",
                    pattern_id=None if uncertain else "circular_induction",
                    category="uncertain" if uncertain else "conceptual",
                    impact="local",
                    description="The decisive step needs review.",
                    evidence_region_ids=["foreign"] if invalid_evidence else [regions[0].id],
                    root_cause_index=None,
                )
            ],
        )

    monkeypatch.setattr(providers, "assess_question", assess)
    monkeypatch.setattr(
        providers,
        "generate_hint",
        lambda *args: "Check what the inductive hypothesis permits you to assume.",
    )


def start(env, homework, key="ai-1"):
    return call(
        env,
        "POST",
        f"/submissions/{homework['submission']['id']}/assessments",
        role="student",
        key=key,
        body={"rubric_id": homework["rubric"]["id"], "source": "ai"},
        expected=202,
    )


def test_ai_proposals_hints_and_retry_idempotency(env, homework, monkeypatch):
    env["config"].external_ai_enabled = True
    stub_assessor(monkeypatch)
    job = start(env, homework)
    assert start(env, homework)["id"] == job["id"]
    call(env, "GET", f"/jobs/{job['id']}", role="other", expected=404)
    assert jobs.run_once(env["factory"])
    done = call(env, "GET", f"/jobs/{job['id']}", role="student")
    assert done["status"] == "succeeded"
    a = call(env, "GET", f"/assessments/{done['result_id']}")
    assert a["status"] == "review_required" and a["score"] == 2
    assert a["original_proposal"] and a["provenance"]["prompt_version"]
    assert not a["findings"][0]["confirmed"]
    hint = call(
        env,
        "POST",
        f"/assessments/{a['id']}/feedback",
        role="student",
        key="ai-hint",
        body={"source": "ai", "requested_level": 2},
    )
    assert hint["advisory"] and hint["items"][0]["level"] == 2
    assert "score" not in hint
    assert not jobs.run_once(env["factory"])
    with env["factory"]() as db:
        assert db.scalar(select(func.count()).select_from(Assessment)) == 1
        assert db.scalar(select(func.count()).select_from(Finding)) == 1


def test_invalid_model_evidence_rolls_back_and_job_can_retry(env, homework, monkeypatch):
    env["config"].external_ai_enabled = True
    stub_assessor(monkeypatch, invalid_evidence=True)
    job = start(env, homework)
    jobs.run_once(env["factory"])
    failed = call(env, "GET", f"/jobs/{job['id']}", role="student")
    assert failed["status"] == "failed" and failed["error_code"] == "invalid_model_evidence"
    with env["factory"]() as db:
        assert db.scalar(select(func.count()).select_from(Assessment)) == 0
    stub_assessor(monkeypatch)
    call(env, "POST", f"/jobs/{job['id']}:retry", role="student", expected=202)
    jobs.run_once(env["factory"])
    assert call(env, "GET", f"/jobs/{job['id']}", role="student")["status"] == "succeeded"


def test_all_external_calls_disabled(env, homework, monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("No external calls permitted")

    monkeypatch.setattr(providers, "structured", forbidden)
    call(
        env,
        "POST",
        f"/submissions/{homework['submission']['id']}/assessments",
        role="student",
        key="off",
        body={"rubric_id": homework["rubric"]["id"], "source": "ai"},
        expected=503,
    )
    call(
        env,
        "POST",
        f"/assignments/{homework['assignment']['id']}/rubric-drafts:generate",
        key="draft-off",
        body={},
        expected=503,
    )


def test_expired_worker_lease_is_retryable(env, homework):
    env["config"].external_ai_enabled = True
    job = start(env, homework)
    with env["factory"]() as db:
        j = db.get(Job, job["id"])
        j.status, j.lease_until, j.attempts = "running", time.time() - 1, 1
        db.commit()
    assert not jobs.run_once(env["factory"])
    assert (
        call(env, "GET", f"/jobs/{job['id']}", role="student")["error_code"]
        == "worker_lease_expired"
    )


def test_uncertain_assessment_not_in_completed_denominator(env, homework, monkeypatch):
    env["config"].external_ai_enabled = True
    stub_assessor(monkeypatch, uncertain=True)
    job = start(env, homework)
    jobs.run_once(env["factory"])
    done = call(env, "GET", f"/jobs/{job['id']}", role="student")
    a = call(env, "GET", f"/assessments/{done['result_id']}")
    assert a["score"] is None
    url = f"/assignments/{homework['assignment']['id']}/analytics/questions?rubric_id={homework['rubric']['id']}"
    result = call(env, "GET", url)["items"][0]
    assert result["uncertain_students"] == 1 and result["completed_applicable_students"] == 0
    assert result["conceptual_flag_rate"] is None
