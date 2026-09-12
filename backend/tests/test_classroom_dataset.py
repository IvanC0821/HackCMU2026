import json
from copy import deepcopy
from pathlib import Path

import pymupdf
import pytest
from sqlalchemy import func, select
from test_classroom import classroom, js  # noqa: F401

from verity.classroom import app
from verity.classroom_dataset import MAXIMA, import_dataset
from verity.classroom_pilot import (
    PartAssessment,
    PilotAssessment,
    anchored_quote,
    apply_assessment,
    grading_context,
    validate_assessment,
)
from verity.models import Document

DATA = Path(__file__).resolve().parents[2] / "demo-data"


def assessment():
    return PilotAssessment(
        parts=[
            PartAssessment(
                part_id=pid,
                points=maximum,
                category="logic",
                staff_reason="PRIVATE TEST RATIONALE",
                page_index=None,
                evidence_quote=None,
            )
            for pid, maximum in MAXIMA.items()
        ],
        staff_summary="Test double",
    )


def test_complete_import_live_result_projection_and_roster(classroom, tmp_path, monkeypatch):  # noqa: F811
    call, env, client = classroom
    with env["factory"]() as db:
        state = import_dataset(db, DATA, tmp_path / "archive")
        db.commit()
        assert db.scalar(select(func.count()).select_from(Document)) == 26
        assert len(state["submissions"]) == 12
        assert len(state["dataset"]["files"]) == 26
        assert sum(bool(s["attempts"][0]["reviewedAt"]) for s in state["submissions"]) == 10
        assert len(list((tmp_path / "archive").iterdir())) == 1
    assert (
        js(
            "import {validateDraft} from './frontend/staff/model.mjs';let s='';for await(const c of process.stdin)s+=c;console.log(JSON.stringify(validateDraft(JSON.parse(s))));",
            state,
        )
        == []
    )
    with env["factory"]() as db:
        again = import_dataset(db, DATA, tmp_path / "archive")
        assert again["revision"] == state["revision"]
        assert len(list((tmp_path / "archive").iterdir())) == 1

    context = grading_context(DATA)
    assert len(context) == 14
    assert all(
        c["path"].endswith(".pdf") and c["path"].startswith(("01_", "02_", "03_")) for c in context
    )
    assert not any("05_HIDDEN" in c["path"] or "grades_summary" in c["path"] for c in context)
    monkeypatch.setattr(app.state, "open_demo", True)
    monkeypatch.setattr(
        app.state, "demo_users", {"teacher": env["actors"]["instructor"]["id"]}, raising=False
    )
    roster = client.get("/classroom/demo").json()["students"]
    assert roster[0]["name"] == "Hiro Tanaka" and len(roster) == 12
    headers = {"X-Verity-Demo-Role": "student", "X-Verity-Demo-Student": roster[0]["id"]}
    before = client.get("/classroom/student", headers=headers).json()
    assert len(before["attempts"]) == 1 and before["attempts"][0]["result"] is None
    assert len(before["assignment"]["questions"]) == 6
    assert client.get("/classroom/workspace", headers=headers).status_code == 403
    assert (
        client.get(
            "/classroom/files/" + state["documents"]["solution"]["remoteId"], headers=headers
        ).status_code
        == 404
    )
    assert (
        client.get(
            "/classroom/me", headers={**headers, "X-Verity-Demo-Student": "arbitrary"}
        ).status_code
        == 403
    )
    other_doc = state["submissions"][0]["attempts"][0]["pdf"]["remoteId"]
    assert client.get("/classroom/files/" + other_doc, headers=headers).status_code == 404
    assert client.get(
        "/classroom/files/" + before["attempts"][0]["documentId"], headers=headers
    ).content.startswith(b"%PDF-")

    judged = assessment()
    judged.parts[0].points = 0.5
    result = {
        "studentId": "s08",
        "assessment": judged.model_dump(),
        "model": "TEST DOUBLE",
        "elapsedSeconds": 0,
        "usage": None,
        "at": "test",
        "rawResponseSha256": "test",
        "score": 39.5,
        "inputs": [{"path": c["path"], "sha256": c["sha256"]} for c in context],
    }
    target = DATA / "04_ungraded_new_submissions/s08_Hiro_Tanaka/submission.pdf"
    import hashlib

    result["inputs"].append(
        {
            "path": str(target.relative_to(DATA)),
            "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        }
    )
    with env["factory"]() as db:
        updated = apply_assessment(db, DATA, result)
        db.commit()
    after = client.get("/classroom/student", headers=headers).json()
    projection = after["attempts"][0]["result"]
    assert after["revision"] > before["revision"]
    assert projection["estimatedScore"] == 39.5 and projection["source"] == "ai"
    assert not projection["reviewed"]
    assert projection["findings"][0]["category"] == "Logic error"
    assert "PRIVATE TEST" not in json.dumps(after)
    assert "instructions" not in json.dumps(after) and "staff_reason" not in json.dumps(after)
    assert not any("x" in f for f in projection["findings"])
    scores = js(
        "import {scoreAttempt,activeRubric} from './frontend/staff/model.mjs';let s='';for await(const c of process.stdin)s+=c;const w=JSON.parse(s);console.log(JSON.stringify(w.submissions.map(s=>scoreAttempt(activeRubric(w),s.attempts[0]))));",
        updated,
    )
    assert scores.count(None) == 1 and 39.5 in scores
    with env["factory"]() as db:
        with pytest.raises(ValueError, match="overwritten"):
            apply_assessment(db, DATA, result)
    recorded = json.loads((DATA / "06_recorded_ai_test/s23-result.json").read_text())
    with env["factory"]() as db:
        replayed = apply_assessment(db, DATA, recorded)
        db.commit()
    wesley = next(s for s in replayed["submissions"] if s["datasetId"] == "s23")
    assert wesley["attempts"][0]["assessmentSource"] == "ai-recorded"
    assert not wesley["attempts"][0]["reviewedAt"]
    assert (
        sum(
            bool(r.get("anchor"))
            for q in wesley["attempts"][0]["questions"].values()
            for r in q["results"].values()
        )
        == 4
    )
    chart = js(
        "import {analytics} from './frontend/staff/model.mjs';let s='';for await(const c of process.stdin)s+=c;console.log(JSON.stringify(analytics(JSON.parse(s))));",
        replayed,
    )
    assert chart["students"] == 12 and chart["reviewed"] == 10 and chart["pending"] == 2
    assert all(
        q["firstN"] == 12 and q["latestN"] == 12 and q["first"] == q["latest"]
        for q in chart["questions"]
    )
    monkeypatch.setattr(app.state, "open_demo", False)
    assert client.get("/classroom/demo").json() == {"enabled": False}
    assert client.get("/classroom/student", headers=headers).status_code == 401


def test_scores_reject_duplicates_out_of_bounds_and_allow_unreadable():
    result = assessment()
    assert validate_assessment(result) == 40
    result.parts[0].points = None
    assert validate_assessment(result) is None
    result.parts[0].points = 0.25
    with pytest.raises(ValueError):
        validate_assessment(result)
    result.parts[0].points = float("nan")
    with pytest.raises(ValueError):
        validate_assessment(result)
    result.parts[0] = deepcopy(result.parts[1])
    with pytest.raises(ValueError, match="every part"):
        validate_assessment(result)


def test_pdf_markers_require_unique_exact_evidence_on_mapped_page():
    with pymupdf.open() as doc:
        page = doc.new_page()
        page.insert_text((72, 100), "Unique calculation: 2 + 2 = 5")
        part = assessment().parts[0]
        part.page_index, part.evidence_quote = 0, "2 + 2 = 5"
        anchor = anchored_quote(doc, part, [1])
        assert 0 < anchor["x"] < 1 and 0 < anchor["y"] < 1
        assert anchored_quote(doc, part, [2]) is None
        part.evidence_quote = "Invented quotation"
        assert anchored_quote(doc, part, [1]) is None
        part.evidence_quote = None
        assert anchored_quote(doc, part, [1]) is None
