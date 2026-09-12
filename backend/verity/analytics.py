from datetime import datetime, timezone

from sqlalchemy import case, distinct, func, select

from .models import Assessment, CriterionResult, Finding, Rubric, Submission


def selected_attempts(assignment_id, rubric_id, policy):
    # Pick one submitted revision per student; then its newest assessment at this rubric.
    revision_order = (
        Submission.revision.asc() if policy == "first_submitted" else Submission.revision.desc()
    )
    submissions = select(
        Submission.id.label("submission_id"),
        Submission.student_id,
        func.row_number()
        .over(partition_by=Submission.student_id, order_by=revision_order)
        .label("rn"),
    ).where(Submission.assignment_id == assignment_id)
    if policy == "latest_assessed":
        submissions = submissions.where(
            select(Assessment.id)
            .where(Assessment.submission_id == Submission.id, Assessment.rubric_id == rubric_id)
            .exists()
        )
    ranked = submissions.subquery()
    latest = (
        select(
            Assessment.id.label("assessment_id"),
            ranked.c.student_id,
            func.row_number()
            .over(
                partition_by=ranked.c.student_id,
                order_by=[Assessment.created_at.desc(), Assessment.id.desc()],
            )
            .label("rn"),
        )
        .join(ranked, ranked.c.submission_id == Assessment.submission_id)
        .where(ranked.c.rn == 1, Assessment.rubric_id == rubric_id)
        .subquery()
    )
    return select(latest.c.assessment_id, latest.c.student_id).where(latest.c.rn == 1).subquery()


def report(db, assignment, rubric_id, policy, patterns=False):
    rubric = db.get(Rubric, rubric_id)
    attempts = selected_attempts(assignment.id, rubric_id, policy)
    submitted = db.scalar(
        select(func.count(distinct(Submission.student_id))).where(
            Submission.assignment_id == assignment.id
        )
    )
    rows = []
    for question in assignment.data["questions"]:
        qid = question["id"]
        coverage = (
            select(
                attempts.c.assessment_id,
                attempts.c.student_id,
                func.sum(case((CriterionResult.status == "uncertain", 1), else_=0)).label(
                    "uncertain"
                ),
                func.sum(case((CriterionResult.status == "assessed", 1), else_=0)).label(
                    "applicable"
                ),
            )
            .join(CriterionResult, CriterionResult.assessment_id == attempts.c.assessment_id)
            .where(CriterionResult.question_id == qid)
            .group_by(attempts.c.assessment_id, attempts.c.student_id)
            .subquery()
        )
        completed = (
            select(coverage.c.assessment_id, coverage.c.student_id)
            .where(coverage.c.uncertain == 0, coverage.c.applicable > 0)
            .subquery()
        )
        assessed = db.scalar(select(func.count()).select_from(completed))
        uncertain = db.scalar(
            select(func.count()).select_from(coverage).where(coverage.c.uncertain > 0)
        )
        not_applicable = db.scalar(
            select(func.count())
            .select_from(coverage)
            .where(coverage.c.uncertain == 0, coverage.c.applicable == 0)
        )

        def count_flags(confirmed=False, pattern_id=None):
            query = (
                select(func.count(distinct(completed.c.student_id)))
                .select_from(completed)
                .join(Finding, Finding.assessment_id == completed.c.assessment_id)
                .where(Finding.question_id == qid, Finding.status != "dismissed")
            )
            if pattern_id is not None:
                query = query.where(Finding.pattern_id == pattern_id)
            else:
                query = query.where(Finding.category == "conceptual")
            if confirmed:
                query = query.where(Finding.confirmed.is_(True))
            return db.scalar(query)

        if patterns:
            for pattern in rubric.spec["patterns"]:
                if any(
                    c["id"] in pattern["criterion_ids"] and c["question_id"] == qid
                    for c in rubric.spec["criteria"]
                ):
                    rows.append(
                        {
                            "question_id": qid,
                            "pattern_id": pattern["id"],
                            "concept_id": pattern["concept_id"],
                            "category": pattern["category"],
                            "students_flagged": count_flags(pattern_id=pattern["id"]),
                            "instructor_confirmed_students": count_flags(True, pattern["id"]),
                        }
                    )
        else:
            flagged = count_flags()
            covered = db.scalar(select(func.count()).select_from(coverage))
            rows.append(
                {
                    "question_id": qid,
                    "submitted_students": submitted,
                    "completed_applicable_students": assessed,
                    "uncertain_students": uncertain,
                    "not_applicable_students": not_applicable,
                    "unassessed_students": submitted - covered,
                    "students_with_conceptual_flags": flagged,
                    "conceptual_flag_rate": flagged / assessed if assessed else None,
                    "instructor_confirmed_students": count_flags(True),
                }
            )
    return {
        "assignment_id": assignment.id,
        "rubric_version_id": rubric_id,
        "taxonomy_version_id": rubric_id,
        "attempt_policy": policy,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "items": rows,
    }
