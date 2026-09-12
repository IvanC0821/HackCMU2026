from copy import deepcopy

import pytest
from test_classroom import classroom as shared_classroom
from test_classroom import publish, upload_attempt


@pytest.fixture
def classroom(env):
    yield from shared_classroom.__wrapped__(env)


def test_combined_staff_modules_are_served(classroom):
    from fastapi.testclient import TestClient

    from verity.classroom import app

    with TestClient(app) as client:
        assert client.get("/teacher/").status_code == 200
        for name in [
            "app.mjs",
            "view.mjs",
            "grading.mjs",
            "grading-view.mjs",
            "solution-crops.mjs",
            "rubric-pdf.mjs",
            "rubric-studio.mjs",
        ]:
            response = client.get(f"/staff/{name}")
            assert response.status_code == 200, name
            assert response.headers["content-type"].startswith("text/javascript"), name
        assert client.get("/staff/grading.css").status_code == 200
        assert client.get("/staff/unpublished-source.mjs").status_code == 404


def claim(call, attempt, role="ta", expected=200):
    state = call("GET", "/classroom/workspace")
    return call(
        "POST",
        f"/classroom/grading/attempts/{attempt['id']}/claim",
        role,
        expected,
        json={"expectedRevision": state["revision"]},
    )


def review_body(state, attempt_id, qid="q1"):
    question = next(q for q in state["versions"][-1]["questions"] if q["id"] == qid)
    return {
        "attemptId": attempt_id,
        "expectedQuestionRevision": 0,
        "checkedWork": True,
        "decisions": {
            c["id"]: {
                "band": max(c["bands"], key=lambda b: b["points"])["id"],
                "reason": "Checked the original final work.",
            }
            for c in question["criteria"]
        },
    }


def test_review_final_not_later_practice_and_preserve_source(classroom):
    call, _, _ = classroom
    publish(call)
    earlier, _ = upload_attempt(call)
    final, _ = upload_attempt(call)
    call("POST", f"/classroom/attempts/{final['id']}/final", "student")
    later, _ = upload_attempt(call)
    state = claim(call, final)
    before = deepcopy(state)
    body = review_body(state, final["id"])
    saved = call("POST", "/classroom/grading/q1/review", "ta", json=body)
    attempts = saved["submissions"][0]["attempts"]
    assert attempts[0] == before["submissions"][0]["attempts"][0]
    assert attempts[2] == before["submissions"][0]["attempts"][2]
    assert attempts[1]["reviewedAt"]
    assert attempts[1]["pdf"] == before["submissions"][0]["attempts"][1]["pdf"]
    assert attempts[1]["questions"]["q1"]["questionReview"]["revision"] == 1
    call("POST", "/classroom/grading/q1/review", "ta", 409, json=body)
    for attempt in [earlier, later]:
        claim(call, attempt, expected=409)
    public = call("GET", "/classroom/student", "student")
    assert "reviewAssignments" not in str(public)
    assert "Checked the original final work" not in str(public)
    assert "reviewerId" not in str(public)


def test_ownership_and_validation_are_enforced_server_side(classroom):
    call, _, _ = classroom
    publish(call)
    final, _ = upload_attempt(call)
    call("POST", f"/classroom/attempts/{final['id']}/final", "student")
    state = claim(call, final)
    claim(call, final, role="instructor", expected=409)
    claim(call, final, role="student", expected=403)
    body = review_body(state, final["id"])
    call("POST", "/classroom/grading/q1/review", "instructor", 403, json=body)
    call("POST", "/classroom/grading/q1/review", "student", 403, json=body)
    call("POST", "/classroom/grading/q1/review", "ta", 422, json={**body, "checkedWork": False})
    call("POST", "/classroom/grading/q1/review", "ta", 422, json={**body, "decisions": {}})
    first = next(iter(body["decisions"]))
    body["decisions"][first]["band"] = "invented"
    call("POST", "/classroom/grading/q1/review", "ta", 422, json=body)
    body = review_body(state, final["id"])
    body["decisions"][first]["reason"] = ""
    criterion = state["versions"][-1]["questions"][0]["criteria"][0]
    body["decisions"][first]["band"] = min(criterion["bands"], key=lambda b: b["points"])["id"]
    call("POST", "/classroom/grading/q1/review", "ta", 422, json=body)
    # Failed validation never partially updates earlier criteria.
    assert call("GET", "/classroom/workspace") == state


def test_new_final_invalidates_old_review_and_bulk_save_cannot_bypass_owner(classroom):
    call, _, _ = classroom
    publish(call)
    old, _ = upload_attempt(call)
    call("POST", f"/classroom/attempts/{old['id']}/final", "student")
    state = claim(call, old)
    forged = deepcopy(state)
    forged["submissions"][0]["attempts"][0]["questions"]["q1"]["skimmed"] = True
    forged["revision"] += 1
    call(
        "PUT",
        "/classroom/workspace",
        expected=422,
        json={"expectedRevision": state["revision"], "state": forged},
    )
    newer, _ = upload_attempt(call)
    call("POST", f"/classroom/attempts/{newer['id']}/final", "student")
    call("POST", "/classroom/grading/q1/review", "ta", 409, json=review_body(state, old["id"]))


def test_one_ta_reviews_all_questions_and_preserves_progress(classroom):
    call, _, _ = classroom
    state = publish(call)
    expected = state["revision"]
    version = deepcopy(state["versions"][0])
    version["id"] = 2
    second = deepcopy(version["questions"][0])
    second["id"] = "q2"
    version["questions"].append(second)
    state["draft"] = deepcopy(version["questions"])
    state["revision"] += 1
    state = call("PUT", "/classroom/workspace", json={"expectedRevision": expected, "state": state})
    hints = call("GET", "/classroom/hint-bank")
    call("POST", "/classroom/hint-bank:approve", json={"expected_version": hints["version"]})
    expected = state["revision"]
    state["versions"].append(version)
    state["revision"] += 1
    call("PUT", "/classroom/workspace", json={"expectedRevision": expected, "state": state})
    final, _ = upload_attempt(call, version=2, mapping={"q1": [0], "q2": [1]})
    call("POST", f"/classroom/attempts/{final['id']}/final", "student")
    state = claim(call, final)
    body = review_body(state, final["id"])
    first = call("POST", "/classroom/grading/q1/review", "ta", json=body)
    attempt = first["submissions"][0]["attempts"][0]
    assert attempt["reviewedAt"] is None
    assert attempt["questions"]["q1"]["skimmed"]
    assert not attempt["questions"]["q2"]["skimmed"]
    call("POST", "/classroom/grading/q1/review", "ta", 409, json=body)
    saved = call(
        "POST", "/classroom/grading/q2/review", "ta", json=review_body(first, final["id"], "q2")
    )
    final_attempt = saved["submissions"][0]["attempts"][0]
    assert final_attempt["reviewedAt"]
    assert final_attempt["questions"]["q1"] == attempt["questions"]["q1"]
    public = call("GET", "/classroom/student", "student")["attempts"][0]
    assert public["result"]["reviewed"]
    assert public["result"]["estimatedScore"] == 20
    reopened = call(
        "POST",
        f"/classroom/grading/attempts/{final['id']}/reopen",
        "ta",
        json={"expectedRevision": saved["revision"], "reason": "Recheck notation."},
    )
    reopened_attempt = reopened["submissions"][0]["attempts"][0]
    assert reopened_attempt["reviewedAt"] is None
    assert reopened_attempt["completedReviews"][0]["questions"] == final_attempt["questions"]
    assert reopened_attempt["pdf"] == final_attempt["pdf"]
    assert reopened_attempt["questions"]["q1"]["questionReview"]["revision"] == 2
    call("POST", "/classroom/grading/q1/review", "ta", 409, json=body)


def test_help_is_private_owned_idempotent_and_does_not_affect_grading(classroom):
    call, _, _ = classroom
    publish(call)
    attempt, _ = upload_attempt(call)
    state = call("GET", "/classroom/workspace")
    body = {"questionId": "q1", "message": "I want to discuss why this step works."}
    call("POST", f"/classroom/attempts/{attempt['id']}/help", "other", 404, json=body)
    response = call("POST", f"/classroom/attempts/{attempt['id']}/help", "student", json=body)
    repeated = call("POST", f"/classroom/attempts/{attempt['id']}/help", "student", json=body)
    assert len(repeated["helpRequests"]) == 1
    help_id = response["helpRequests"][0]["id"]
    after = call("GET", "/classroom/workspace")
    assert (
        after["submissions"][0]["attempts"][0]["questions"]
        == state["submissions"][0]["attempts"][0]["questions"]
    )
    assert call("GET", "/classroom/student", "other")["attempts"] == []
    call(
        "POST",
        f"/classroom/help/{help_id}/resolve",
        "student",
        403,
        json={"expectedRevision": after["revision"]},
    )
    call(
        "POST",
        f"/classroom/help/{help_id}/resolve",
        "ta",
        json={"expectedRevision": after["revision"]},
    )
    public = call("GET", "/classroom/student", "student")["attempts"][0]
    assert public["helpRequests"][0]["status"] == "addressed"
    assert "addressedBy" not in str(public)
    assert public["result"] is None
