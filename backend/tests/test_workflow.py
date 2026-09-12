from conftest import call, finding_body, manual_assessment, pdf_bytes
from sqlalchemy import func, select

from verity.models import AuditEvent, CriterionResult, Finding


def test_manual_submission_hints_review_and_final_grade(env, homework):
    aid = manual_assessment(env, homework)
    finding = call(
        env, "POST", f"/assessments/{aid}/findings", body=finding_body(homework), expected=201
    )
    assert finding["anchor"]["document_revision_id"] == homework["doc"]["id"]
    assert finding["anchor"]["target_granularity"] == "step"
    student = call(env, "GET", f"/assessments/{aid}", role="student")
    assert (
        "score" not in student and "findings" not in student and "original_proposal" not in student
    )
    hint = call(
        env,
        "POST",
        f"/assessments/{aid}/feedback",
        role="student",
        key="hint-1",
        body={"source": "bank", "requested_level": 4},
    )
    assert hint["effective_level"] == 2
    assert hint["items"][0]["level"] == 2
    assert "(k+1)(k+2)" not in str(hint)
    assert (
        call(
            env,
            "POST",
            f"/assessments/{aid}/feedback",
            role="student",
            key="hint-1",
            body={"source": "bank", "requested_level": 4},
        )["id"]
        == hint["id"]
    )
    staff = call(env, "GET", f"/assessments/{aid}")
    assert staff["score"] == 2
    final = call(
        env,
        "POST",
        f"/assessments/{aid}:finalize",
        body={"expected_version": staff["version"], "acknowledge_review": True},
    )
    assert final["score"] == 2
    assert call(env, "GET", f"/assessments/{aid}", role="student")["score"] == 2
    call(env, "POST", f"/assessments/{aid}/findings", body=finding_body(homework), expected=409)
    call(
        env,
        "PUT",
        f"/assessments/{aid}/results",
        body={"expected_version": final["version"], "results": staff["results"]},
        expected=422,
    )


def test_cross_student_course_and_private_key_access(env, homework):
    for path in [
        f"/documents/{homework['key']['id']}",
        f"/documents/{homework['key']['id']}/file",
        f"/documents/{homework['key']['id']}/pages/0/image",
        f"/rubric-versions/{homework['rubric']['id']}",
    ]:
        call(env, "GET", path, role="student", expected=404)
    call(env, "GET", f"/documents/{homework['doc']['id']}", role="other", expected=404)
    call(env, "GET", f"/submissions/{homework['submission']['id']}", role="other", expected=404)
    visible = call(env, "GET", f"/assignments/{homework['assignment']['id']}", role="student")
    assert "material_document_ids" not in visible
    another = call(env, "POST", "/courses", body={"title": "Another course"}, expected=201)
    call(env, "GET", f"/courses/{another['id']}/assignments", role="student", expected=404)
    assert env["client"].get("/api/v1/me").status_code == 401
    assert (
        env["client"]
        .get("/api/v1/me", headers={"Authorization": "Bearer vt_forged", "X-Role": "admin"})
        .status_code
        == 401
    )


def test_students_cannot_change_grades_or_evidence_and_ta_cannot_finalize(env, homework):
    aid = manual_assessment(env, homework)
    call(
        env,
        "POST",
        f"/assessments/{aid}/findings",
        role="student",
        body=finding_body(homework),
        expected=403,
    )
    call(
        env,
        "PUT",
        f"/submissions/{homework['submission']['id']}/regions",
        role="student",
        body={},
        expected=403,
    )
    call(
        env,
        "POST",
        f"/assessments/{aid}:finalize",
        role="ta",
        body={"expected_version": 1, "acknowledge_review": True},
        expected=403,
    )
    call(
        env,
        "POST",
        f"/assessments/{aid}/feedback",
        role="student",
        key="manual-inject",
        body={"source": "manual", "manual_items": [{"level": 4, "text": "Secret answer"}]},
        expected=403,
    )


def test_rubric_coverage_bands_evidence_and_idempotency(env, homework):
    path = f"/submissions/{homework['submission']['id']}/assessments"
    bad = {
        "rubric_id": homework["rubric"]["id"],
        "source": "manual",
        "results": [{"criterion_id": "base_case", "status": "assessed", "band_id": "correct"}],
    }
    call(env, "POST", path, body=bad, key="missing", expected=422)
    aid = manual_assessment(env, homework)
    assert manual_assessment(env, homework) == aid
    bad["results"].append(
        {"criterion_id": "inductive_step", "status": "assessed", "band_id": "invented"}
    )
    call(env, "POST", path, body=bad, key="bad-band", expected=422)
    bad["results"][1]["band_id"] = "correct"
    call(env, "POST", path, body=bad, key="manual-1", expected=409)
    body = finding_body(homework)
    private_region = call(env, "GET", f"/documents/{homework['key']['id']}")["regions"][0]["id"]
    body["evidence_region_ids"] = [private_region]
    call(env, "POST", f"/assessments/{aid}/findings", body=body, expected=422)
    body["evidence_region_ids"] = []
    body["pattern_id"] = "invented"
    call(env, "POST", f"/assessments/{aid}/findings", body=body, expected=422)


def test_revision_edits_audit_staleness_and_uncertainty(env, homework):
    aid = manual_assessment(
        env,
        homework,
        results=[
            {"criterion_id": "base_case", "status": "assessed", "band_id": "correct"},
            {"criterion_id": "inductive_step", "status": "uncertain", "band_id": None},
        ],
    )
    a = call(env, "GET", f"/assessments/{aid}")
    call(
        env,
        "POST",
        f"/assessments/{aid}:finalize",
        body={"expected_version": a["version"], "acknowledge_review": True},
        expected=409,
    )
    edit = {
        "expected_version": a["version"],
        "results": [
            {"criterion_id": "base_case", "status": "assessed", "band_id": "correct"},
            {"criterion_id": "inductive_step", "status": "assessed", "band_id": "partial"},
        ],
    }
    call(env, "PUT", f"/assessments/{aid}/results", body=edit)
    call(env, "PUT", f"/assessments/{aid}/results", body=edit, expected=409)
    with env["factory"]() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(CriterionResult)
                .where(CriterionResult.assessment_id == aid)
            )
            == 2
        )
        assert (
            db.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.action == "assessment.results_edited")
            )
            == 1
        )
    doc = call(
        env,
        "POST",
        f"/documents?course_id={homework['course']['id']}&kind=submission",
        role="student",
        files={"file": ("revision.pdf", pdf_bytes(), "application/pdf")},
        expected=201,
    )
    s2 = call(
        env,
        "POST",
        f"/assignments/{homework['assignment']['id']}/submissions",
        role="student",
        body={"document_id": doc["id"]},
        expected=201,
    )
    assert s2["revision"] == 2
    assert (
        call(env, "GET", f"/submissions/{homework['submission']['id']}", role="student")[
            "document_id"
        ]
        == homework["doc"]["id"]
    )


def test_analytics_deduplicate_and_dismiss(env, homework):
    aid = manual_assessment(env, homework)
    findings = [
        call(env, "POST", f"/assessments/{aid}/findings", body=finding_body(homework), expected=201)
        for _ in range(2)
    ]
    url = f"/assignments/{homework['assignment']['id']}/analytics/questions?rubric_id={homework['rubric']['id']}"
    report = call(env, "GET", url)
    assert report["items"][0]["students_with_conceptual_flags"] == 1
    assert report["items"][0]["conceptual_flag_rate"] == 1
    for finding in findings:
        body = {**finding_body(homework), "expected_version": finding["version"], "dismissed": True}
        call(env, "PATCH", f"/findings/{finding['id']}", body=body)
        call(env, "PATCH", f"/findings/{finding['id']}", body=body, expected=409)
    assert call(env, "GET", url)["items"][0]["students_with_conceptual_flags"] == 0
    call(env, "GET", url, role="student", expected=403)
    with env["factory"]() as db:
        assert db.scalar(select(func.count()).select_from(Finding)) == 2


def test_pending_anchor_and_root_cause_cycles(env, homework):
    aid = manual_assessment(env, homework)
    body = finding_body(homework)
    body["evidence_region_ids"] = []
    f = call(env, "POST", f"/assessments/{aid}/findings", body=body, expected=201)
    assert f["status"] == "pending_anchor"
    a = call(env, "GET", f"/assessments/{aid}")
    call(
        env,
        "POST",
        f"/assessments/{aid}:finalize",
        body={"expected_version": a["version"], "acknowledge_review": True},
        expected=409,
    )
    call(
        env,
        "PATCH",
        f"/findings/{f['id']}",
        body={**body, "root_cause_id": f["id"], "expected_version": f["version"]},
        expected=422,
    )
