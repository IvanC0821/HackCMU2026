import json
import subprocess
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

import pytest
from conftest import pdf_bytes
from fastapi.testclient import TestClient

from verity.api import app as core
from verity.classroom import Classroom, app
from verity.db import get_db
from verity.models import Course, Membership

ROOT = Path(__file__).resolve().parents[2]


def js(code, state=None):
    result = subprocess.run(
        ["node", "--input-type=module", "-e", code],
        cwd=ROOT,
        input=json.dumps(state) if state else None,
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout)


@pytest.fixture
def classroom(env):
    state = js(
        "import {newWorkspace} from './frontend/staff/model.mjs'; console.log(JSON.stringify(newWorkspace()));"
    )
    with env["factory"]() as db:
        c = Course(title="Integration test", owner_id=env["actors"]["instructor"]["id"])
        db.add(c)
        db.flush()
        for role in ["instructor", "ta", "student", "other"]:
            db.add(
                Membership(
                    course_id=c.id,
                    user_id=env["actors"][role]["id"],
                    role=role if role in {"instructor", "ta"} else "student",
                )
            )
        db.add(Classroom(id="classroom", course_id=c.id, state=state, revision=0))
        db.commit()
    app.dependency_overrides[get_db] = core.dependency_overrides[get_db]
    with TestClient(app) as client:

        def call(method, path, role="instructor", expected=200, **kwargs):
            r = client.request(method, path, headers=env["actors"][role]["headers"], **kwargs)
            assert r.status_code == expected, r.text
            return r.json() if "json" in r.headers.get("content-type", "") else r.content

        yield call, env, client
    app.dependency_overrides.clear()


def publish(call):
    s = js(
        "import {newWorkspace,publishDraft} from './frontend/staff/model.mjs'; import {loadCase} from './frontend/staff/case.mjs'; const s=newWorkspace();loadCase(s);publishDraft(s);console.log(JSON.stringify(s));"
    )
    for doc in [s["documents"]["blank"], s["documents"]["solution"], *s["documents"]["examples"]]:
        uploaded = call(
            "POST",
            "/classroom/files",
            expected=201,
            files={"file": (doc["name"], pdf_bytes(2), "application/pdf")},
        )
        for d in [s["documents"], s["versions"][0]["documents"]]:
            if d["blank"]["id"] == doc["id"]:
                d["blank"] = uploaded
            elif d["solution"]["id"] == doc["id"]:
                d["solution"] = uploaded
            else:
                d["examples"] = [uploaded if e["id"] == doc["id"] else e for e in d["examples"]]
    versions = s["versions"]
    s["versions"] = []
    saved = call("PUT", "/classroom/workspace", json={"expectedRevision": 0, "state": s})
    hints = call("GET", "/classroom/hint-bank")
    call("POST", "/classroom/hint-bank:approve", json={"expected_version": hints["version"]})
    saved["versions"] = versions
    expected = saved["revision"]
    saved["revision"] += 1
    return call("PUT", "/classroom/workspace", json={"expectedRevision": expected, "state": saved})


def upload_attempt(call, version=1, role="student", mapping=None):
    doc = call(
        "POST",
        "/classroom/files",
        role,
        201,
        files={"file": ("student.pdf", pdf_bytes(2), "application/pdf")},
    )
    body = {
        "id": str(uuid4()),
        "documentId": doc["id"],
        "version": version,
        "mapping": mapping or {"q1": [0, 1]},
        "fileName": "student.pdf",
    }
    attempt = call("POST", "/classroom/attempts", role, 201, json=body)
    return attempt, body


def score(call, band):
    s = call("GET", "/classroom/workspace")
    expected = s["revision"]
    for q in s["submissions"][0]["attempts"][-1]["questions"].values():
        for cid, r in q["results"].items():
            r["band"] = band if cid == "row-work" else "full"
            r["reason"] = "PRIVATE STAFF REASON: answer x=2 y=1"
    s["revision"] += 1
    return call("PUT", "/classroom/workspace", json={"expectedRevision": expected, "state": s})


def analytics(state):
    return js(
        "import {analytics} from './frontend/staff/model.mjs';let s='';for await(const c of process.stdin)s+=c;console.log(JSON.stringify(analytics(JSON.parse(s))));",
        state,
    )


def test_publish_upload_review_revision_live_chart(classroom):
    call, env, _ = classroom
    assert call("GET", "/classroom/student", "student")["assignment"] is None
    publish(call)
    public = call("GET", "/classroom/student", "student")
    assert len(public["assignment"]["questions"]) == 1
    assert public["assignment"]["questions"][0]["points"] == 10
    attempt, body = upload_attempt(call)
    staff = call("GET", "/classroom/workspace")
    q = staff["submissions"][0]["attempts"][0]["questions"]["q1"]
    assert q["pages"] == [1, 2]
    assert attempt["result"] is None
    assert analytics(staff)["questions"][0]["latest"] is None  # not zero
    call("POST", "/classroom/attempts", "student", 201, json=body)  # idempotent retry
    assert len(call("GET", "/classroom/student", "student")["attempts"]) == 1
    scored = score(call, "partial")
    assert analytics(scored)["questions"][0]["latest"] == 80
    public = call("GET", "/classroom/student", "student")
    assert public["attempts"][0]["result"]["estimatedScore"] == 8
    assert "PRIVATE STAFF" not in json.dumps(public)
    assert "expected" not in json.dumps(public)
    assert "bands" not in json.dumps(public)
    second, _ = upload_attempt(call)
    assert second["number"] == 2
    assert analytics(call("GET", "/classroom/workspace"))["questions"][0]["latest"] is None
    scored = score(call, "full")
    chart = analytics(scored)
    assert chart["students"] == 1
    assert (chart["questions"][0]["first"], chart["questions"][0]["latest"]) == (80, 100)
    call("POST", f"/classroom/attempts/{attempt['id']}/final", "student", 409)
    final = call("POST", f"/classroom/attempts/{second['id']}/final", "student")
    assert final["final"]
    # Separate request/session restores the exact original PDF and all attempt snapshots.
    assert call("GET", f"/classroom/files/{attempt['documentId']}", "student").startswith(b"%PDF-")
    assert len(call("GET", "/classroom/student", "student")["attempts"]) == 2


def test_private_endpoints_and_documents_are_not_student_accessible(classroom):
    call, env, client = classroom
    s = publish(call)
    attempt, body = upload_attempt(call)
    assert client.get("/classroom/workspace").status_code == 401
    call("GET", "/classroom/workspace", "student", 403)
    call(
        "PUT",
        "/classroom/workspace",
        "student",
        403,
        json={"expectedRevision": s["revision"], "state": s},
    )
    for doc in [s["documents"]["solution"], *s["documents"]["examples"]]:
        call("GET", f"/classroom/files/{doc['id']}", "student", 404)
    call("GET", f"/classroom/files/{s['documents']['blank']['id']}", "student")
    call("GET", f"/classroom/files/{attempt['documentId']}", "other", 404)
    assert call("GET", "/classroom/student", "other")["attempts"] == []
    call("POST", f"/classroom/attempts/{attempt['id']}/final", "other", 404)
    call("POST", "/classroom/attempts", "other", 404, json={**body, "id": str(uuid4())})
    call("POST", "/classroom/attempts", "student", 422, json={**body, "score": 10})
    call("GET", "/classroom/sample/solution", "student", 403)
    for path in [
        "/output/pdf/row-case/solution.pdf",
        "/.env",
        "/backend/data/classroom/access-codes.json",
        "/staff/INTEGRATION.md",
    ]:
        assert client.get(path).status_code == 404
    # UI URL guessing still cannot retrieve private records using a student token.
    call("GET", "/classroom/workspace", "ta")


def test_stale_save_draft_privacy_mapping_and_record_preservation(classroom):
    call, _, _ = classroom
    s = publish(call)
    original = deepcopy(s)
    s["draft"][0]["prompt"] = "PRIVATE UNPUBLISHED PROMPT"
    s["revision"] += 1
    call("PUT", "/classroom/workspace", json={"expectedRevision": original["revision"], "state": s})
    assert "PRIVATE UNPUBLISHED" not in json.dumps(call("GET", "/classroom/student", "student"))
    attempt, body = upload_attempt(call)
    # Student submits while a teacher's stale snapshot remains open.
    call(
        "PUT",
        "/classroom/workspace",
        expected=409,
        json={"expectedRevision": s["revision"], "state": s},
    )
    fresh = call("GET", "/classroom/workspace")
    assert len(fresh["submissions"]) == 1
    fresh["submissions"] = []
    fresh["revision"] += 1
    call(
        "PUT",
        "/classroom/workspace",
        expected=422,
        json={"expectedRevision": fresh["revision"] - 1, "state": fresh},
    )
    for mapping in [{"q1": []}, {"q1": [2]}, {"q1": [-1]}, {"wrong": [0]}, {"q1": [0, 0]}]:
        call(
            "POST",
            "/classroom/attempts",
            "student",
            422,
            json={**body, "id": str(uuid4()), "mapping": mapping},
        )
    call(
        "POST",
        "/classroom/attempts",
        "student",
        409,
        json={**body, "id": str(uuid4()), "version": 99},
    )
    call(
        "POST",
        "/classroom/files",
        "student",
        422,
        files={"file": ("fake.pdf", b"not a pdf", "application/pdf")},
    )


def test_open_demo_switches_roles_without_codes_and_keeps_native_api_private(
    classroom, monkeypatch
):
    call, env, client = classroom
    published = publish(call)
    assert client.get("/classroom/demo").json() == {"enabled": False}
    assert (
        client.get("/classroom/workspace", headers={"X-Verity-Demo-Role": "teacher"}).status_code
        == 401
    )
    monkeypatch.setattr(app.state, "open_demo", True)
    monkeypatch.setattr(
        app.state,
        "demo_users",
        {
            "teacher": env["actors"]["instructor"]["id"],
            "student": env["actors"]["student"]["id"],
        },
        raising=False,
    )
    assert client.get("/classroom/demo").json() == {"enabled": True}
    assert client.get("/", follow_redirects=False).headers["location"] == "/student/"
    teacher = {"X-Verity-Demo-Role": "teacher"}
    student = {"X-Verity-Demo-Role": "student"}
    assert client.get("/classroom/me", headers=teacher).json()["role"] == "instructor"
    assert client.get("/classroom/me", headers=student).json()["role"] == "student"
    assert client.get("/classroom/workspace", headers=teacher).status_code == 200
    assert client.get("/classroom/student", headers=student).json()["assignment"]["version"] == 1
    solution = published["documents"]["solution"]["id"]
    assert client.get(f"/classroom/files/{solution}", headers=teacher).status_code == 200
    # Same visitor can switch views; the student projection remains student-shaped.
    assert client.get(f"/classroom/files/{solution}", headers=student).status_code == 404
    response = client.post(
        "/classroom/files",
        headers=student,
        files={"file": ("demo.pdf", pdf_bytes(), "application/pdf")},
    )
    assert response.status_code == 201
    response = client.post(
        "/classroom/attempts",
        headers=student,
        json={
            "id": str(uuid4()),
            "documentId": response.json()["id"],
            "version": 1,
            "mapping": {"q1": [0]},
            "fileName": "demo.pdf",
        },
    )
    assert response.status_code == 201
    shared = client.get("/classroom/workspace", headers=teacher).json()
    assert shared["submissions"][0]["id"] == env["actors"]["student"]["id"]
    expected = shared["revision"]
    shared["revision"] += 1
    assert (
        client.put(
            "/classroom/workspace",
            headers=teacher,
            json={"expectedRevision": expected, "state": shared},
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/classroom/files", files={"file": ("demo.pdf", pdf_bytes(), "application/pdf")}
        ).status_code
        == 403
    )
    assert client.get("/classroom/me", headers={"X-Verity-Demo-Role": "admin"}).status_code == 422
    assert env["client"].get("/api/v1/me", headers=teacher).status_code == 401


def test_solution_crops_persist_for_staff_and_never_reach_students(classroom):
    call, _, _ = classroom
    publish(call)
    state = call("GET", "/classroom/workspace")
    revision = state["revision"]
    crop = {
        "id": "answer-crop-1",
        "documentId": state["documents"]["solution"]["id"],
        "page": 2,
        "rect": [0.1, 0.2, 0.7, 0.3],
        "label": "Private worked answer",
    }
    state["draft"][0]["solutionCrops"] = [crop]
    state["dirty"] = True
    state["revision"] += 1
    state = call("PUT", "/classroom/workspace", json={"expectedRevision": revision, "state": state})
    hints = call("GET", "/classroom/hint-bank")
    call("POST", "/classroom/hint-bank:approve", json={"expected_version": hints["version"]})
    revision = state["revision"]
    state = js(
        "import {publishDraft} from './frontend/staff/model.mjs';"
        "let raw='';for await(const chunk of process.stdin)raw+=chunk;"
        "const s=JSON.parse(raw);publishDraft(s);console.log(JSON.stringify(s));",
        state,
    )
    call("PUT", "/classroom/workspace", json={"expectedRevision": revision, "state": state})
    staff = call("GET", "/classroom/workspace", role="ta")
    assert staff["versions"][-1]["questions"][0]["solutionCrops"] == [crop]
    assert "solutionCrops" not in staff["versions"][0]["questions"][0]
    public = call("GET", "/classroom/student", role="student")
    assert "solutionCrops" not in json.dumps(public)
    assert "Private worked answer" not in json.dumps(public)
    call(
        "GET",
        "/classroom/files/" + state["documents"]["solution"]["remoteId"],
        role="student",
        expected=404,
    )


def test_hints_are_reviewed_at_setup_and_selected_without_student_time_ai(classroom, monkeypatch):
    from sqlalchemy import func, select

    from verity import providers
    from verity.models import HintBank

    call, env, _ = classroom
    s = publish(call)
    approved = call("GET", "/classroom/hint-bank")
    assert approved["status"] == "published"
    call("GET", "/classroom/hint-bank", "student", 403)
    call(
        "POST",
        "/classroom/hint-bank:approve",
        "ta",
        403,
        json={"expected_version": approved["version"]},
    )
    call(
        "PUT",
        "/classroom/hint-bank",
        expected=409,
        json={"expected_version": approved["version"], "entries": approved["entries"]},
    )
    expected = s["revision"]
    s["draft"][0]["prompt"] += " Justify each operation."
    s["revision"] += 1
    s = call("PUT", "/classroom/workspace", json={"expectedRevision": expected, "state": s})
    bank = call("GET", "/classroom/hint-bank")
    assert bank["id"] != approved["id"] and bank["status"] == "draft"
    entries = [
        {**e, "text": "Explain which row operation connects these two matrices."}
        for e in bank["entries"]
    ]
    saved = call(
        "PUT",
        "/classroom/hint-bank",
        json={"expected_version": bank["version"], "entries": entries},
    )
    version = {**deepcopy(s["versions"][-1]), "id": 2, "questions": deepcopy(s["draft"])}
    s["versions"].append(version)
    expected = s["revision"]
    s["revision"] += 1
    call(
        "PUT", "/classroom/workspace", expected=409, json={"expectedRevision": expected, "state": s}
    )
    call("POST", "/classroom/hint-bank:approve", json={"expected_version": saved["version"]})
    call("PUT", "/classroom/workspace", json={"expectedRevision": expected, "state": s})
    monkeypatch.setattr(
        providers, "structured", lambda *a, **kw: pytest.fail("Feedback must reuse approved hints")
    )
    upload_attempt(call, version=2)
    score(call, "partial")
    public = call("GET", "/classroom/student", "student")
    assert public["attempts"][0]["result"]["findings"][0]["message"] == entries[0]["text"]
    assert "hintBank" not in json.dumps(public) and "calibration_notes" not in json.dumps(public)
    with env["factory"]() as db:
        assert db.scalar(select(func.count()).select_from(HintBank)) == 2
