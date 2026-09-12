from conftest import call, finding_body, manual_assessment

from verity import jobs, providers
from verity.schemas import RubricSpec


def test_health_and_identity(env, homework):
    for path in ("/health/live", "/health/ready"):
        assert env["client"].get(path).status_code == 200
    me = call(env, "GET", "/me", role="student")
    assert me["id"] == env["actors"]["student"]["id"]
    assert me["memberships"] == [{"course_id": homework["course"]["id"], "role": "student"}]


def test_admin_user_creation_and_role_boundary(env):
    body = {"email": "new@example.test", "name": "New student", "role": "student"}
    call(env, "POST", "/users", body=body, role="student", expected=403)
    call(env, "POST", "/users", body=body, role="instructor", expected=403)
    user = call(env, "POST", "/users", body=body, role="admin", expected=201)
    assert user["email"] == body["email"] and user["role"] == "student"
    call(env, "POST", "/users", body=body, role="admin", expected=409)


def test_lists_are_scoped_and_paginated(env, homework):
    course_id = homework["course"]["id"]
    assignment_id = homework["assignment"]["id"]
    private = call(env, "POST", "/courses", body={"title": "Private course"}, expected=201)
    courses = call(env, "GET", "/courses", role="student")
    assert {c["id"] for c in courses} == {course_id}
    assert private["id"] not in {c["id"] for c in courses}
    assert call(env, "GET", "/courses?offset=1&limit=1", role="student") == []
    assignments = call(env, "GET", f"/courses/{course_id}/assignments", role="student")
    assert [a["id"] for a in assignments] == [assignment_id]
    assert "material_document_ids" not in assignments[0]
    rubric = call(env, "GET", f"/rubric-versions/{homework['rubric']['id']}")
    assert rubric["status"] == "published"
    submissions = call(env, "GET", f"/assignments/{assignment_id}/submissions", role="student")
    assert [s["id"] for s in submissions] == [homework["submission"]["id"]]
    assert call(env, "GET", f"/assignments/{assignment_id}/submissions", role="other") == []


def test_feedback_history_patterns_and_math_checks(env, homework):
    aid = manual_assessment(env, homework)
    call(env, "POST", f"/assessments/{aid}/findings", body=finding_body(homework), expected=201)
    hint = call(
        env,
        "POST",
        f"/assessments/{aid}/feedback",
        role="student",
        key="history-1",
        body={"source": "bank", "requested_level": 2},
    )
    path = f"/submissions/{homework['submission']['id']}/feedback"
    history = call(env, "GET", path, role="student")
    assert [h["id"] for h in history] == [hint["id"]]
    call(env, "GET", path, role="other", expected=404)
    path = f"/assignments/{homework['assignment']['id']}/analytics/patterns?rubric_id={homework['rubric']['id']}"
    patterns = call(env, "GET", path)
    assert patterns["items"]
    call(env, "GET", path, role="student", expected=403)
    body = {"lhs": "(x+1)**2", "rhs": "x*x+2*x+1"}
    call(env, "POST", f"/assessments/{aid}/math-checks", role="student", body=body, expected=403)
    checked = call(env, "POST", f"/assessments/{aid}/math-checks", body=body, expected=201)
    assert checked["result"] == "equivalent" and not checked["assessment_verified"]
    unsafe = call(
        env,
        "POST",
        f"/assessments/{aid}/math-checks",
        body={"lhs": "__import__('os').system('echo unsafe')", "rhs": "1"},
        expected=201,
    )
    assert unsafe["result"] == "unsupported"


def test_generated_rubric_job_is_a_draft_until_staff_publish(env, homework, monkeypatch):
    env["config"].external_ai_enabled = True
    monkeypatch.setattr(
        providers, "draft_rubric", lambda *args: RubricSpec.model_validate(homework["spec"])
    )
    path = f"/assignments/{homework['assignment']['id']}/rubric-drafts:generate"
    call(env, "POST", path, role="student", key="student-draft", body={}, expected=403)
    job = call(env, "POST", path, key="draft-1", body={}, expected=202)
    assert call(env, "POST", path, key="draft-1", body={}, expected=202)["id"] == job["id"]
    assert jobs.run_once(env["factory"])
    done = call(env, "GET", f"/jobs/{job['id']}")
    assert done["status"] == "succeeded"
    draft = call(env, "GET", f"/rubric-versions/{done['result_id']}")
    assert draft["status"] == "draft"
    published = call(env, "POST", f"/rubric-versions/{draft['id']}:publish")
    assert published["status"] == "published"
