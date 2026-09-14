"""Opt-in paid provider smoke test on fictional homework and temporary local records.

VERITY_LIVE_API_TESTS=1 VERITY_LIVE_ENV_FILE=/path/to/.env python -m pytest -q tests/test_live_services.py
No cloud database writes. Provider calls can incur charges. Ordinary pytest skips this file.
"""

import os
from pathlib import Path

import pytest
from conftest import call
from dotenv import dotenv_values
from sqlalchemy import select

from verity import jobs
from verity.models import Assignment, Document, Region

pytestmark = pytest.mark.skipif(
    os.getenv("VERITY_LIVE_API_TESTS") != "1", reason="Paid live provider checks are opt-in"
)


def configure_live(env):
    path = Path(os.getenv("VERITY_LIVE_ENV_FILE", "../.env"))
    values = {**dotenv_values(path), **os.environ}
    cfg = env["config"]
    cfg.openai_api_key = values.get("OPENAI_API_KEY", "")
    cfg.zai_api_key = values.get("ZAI_API_KEY", "")
    assert cfg.openai_api_key and cfg.zai_api_key, "Configure both live provider keys"
    cfg.external_ai_enabled = True
    cfg.openai_model = os.getenv("VERITY_LIVE_MODEL", "gpt-5.4-mini")
    cfg.openai_reasoning_effort = "medium"
    cfg.glm_ocr_bbox_format = values.get("GLM_OCR_BBOX_FORMAT", "pixels")
    # Remove plaintext secrets from local variables before assertion tracebacks.
    del values


def test_live_rubric_drafting(env, homework):
    configure_live(env)
    with env["factory"]() as db:
        assignment = db.get(Assignment, homework["assignment"]["id"])
        assignment.data = {**assignment.data, "ocr_enabled": True}
        db.commit()

    path = f"/assignments/{homework['assignment']['id']}/rubric-drafts:generate"
    draft_job = call(
        env,
        "POST",
        path,
        key="live-draft",
        expected=202,
        body={
            "instructions": "Draft a concise 10-point induction rubric: 2 points for the base case and 8 for a valid inductive step. Accept alternative valid proofs."
        },
    )
    jobs.run_once(env["factory"])
    draft_done = call(env, "GET", f"/jobs/{draft_job['id']}")
    assert draft_done["status"] == "succeeded", draft_done.get("error_code")
    draft = call(env, "GET", f"/rubric-versions/{draft_done['result_id']}")
    assert draft["status"] == "draft"


def test_live_ocr_assessment_and_hints(env, homework):
    configure_live(env)
    with env["factory"]() as db:
        assignment = db.get(Assignment, homework["assignment"]["id"])
        assignment.data = {**assignment.data, "ocr_enabled": True}
        db.commit()
    job = call(
        env,
        "POST",
        f"/submissions/{homework['submission']['id']}/assessments",
        role="student",
        key="live-assessment",
        expected=202,
        body={"source": "ai", "rubric_id": homework["rubric"]["id"]},
    )
    jobs.run_once(env["factory"])
    done = call(env, "GET", f"/jobs/{job['id']}", role="student")
    assert done["status"] == "succeeded", done.get("error_code")
    assessment = call(env, "GET", f"/assessments/{done['result_id']}")
    assert assessment["status"] == "review_required"
    assert assessment["findings"], "Synthetic proof assumes the conclusion; expected a finding"
    student_view = call(env, "GET", f"/assessments/{assessment['id']}", role="student")
    assert "score" not in student_view
    with env["factory"]() as db:
        doc = db.get(Document, homework["doc"]["id"])
        assert doc.ocr_complete
        assert db.scalar(
            select(Region.id).where(Region.document_id == doc.id, Region.source == "glm-ocr")
        )
    response = env["client"].post(
        f"/api/v1/assessments/{assessment['id']}/feedback",
        headers={**env["actors"]["student"]["headers"], "Idempotency-Key": "live-hint"},
        json={"source": "ai", "requested_level": 2},
    )
    assert response.status_code in (200, 202), "Live feedback request failed"
    hint = response.json()
    if hint.get("kind") == "feedback":
        jobs.run_once(env["factory"])
        hint_done = call(env, "GET", f"/jobs/{hint['id']}", role="student")
        assert hint_done["status"] == "succeeded", hint_done.get("error_code")
        hint = call(
            env,
            "POST",
            f"/assessments/{assessment['id']}/feedback",
            role="student",
            key="live-hint",
            body={"source": "ai", "requested_level": 2},
        )
    assert hint["items"] and hint["advisory"] and "score" not in hint
    assert all(item["level"] <= 2 for item in hint["items"])
