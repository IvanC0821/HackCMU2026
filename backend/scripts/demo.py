"""Execute a full no-AI API workflow using synthetic PDFs and a temporary database."""

import json
import tempfile
from pathlib import Path

import pymupdf
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from verity.api import app
from verity.auth import issue_token
from verity.config import settings
from verity.db import Base, get_db, make_engine
from verity.models import User


def main():
    with tempfile.TemporaryDirectory(prefix="verity-demo-") as tmp:
        cfg = settings()
        cfg.storage_dir, cfg.s3_bucket, cfg.external_ai_enabled = Path(tmp) / "pdfs", "", False
        cfg.local_tokens_enabled = True
        engine = make_engine(f"sqlite:///{tmp}/demo.db")
        Base.metadata.create_all(engine)
        factory = sessionmaker(engine, expire_on_commit=False)

        def db_dependency():
            with factory() as db:
                yield db
                db.commit()

        app.dependency_overrides[get_db] = db_dependency
        with factory() as db:
            teacher = User(
                email="instructor@example.test", name="Demo instructor", role="instructor"
            )
            student = User(email="student@example.test", name="Demo student", role="student")
            db.add_all([teacher, student])
            db.flush()
            headers = {
                "staff": {"Authorization": "Bearer " + issue_token(db, teacher)},
                "student": {"Authorization": "Bearer " + issue_token(db, student)},
            }
            student_id = student.id
            db.commit()
        with pymupdf.open() as pdf:
            page = pdf.new_page()
            page.insert_text(
                (70, 100), "n=1: 1=1. Assume the result for k+1. Hence it holds for k+1."
            )
            raw = pdf.tobytes()
        with TestClient(app) as client:

            def request(method, path, role="staff", **kwargs):
                r = client.request(
                    method,
                    "/api/v1" + path,
                    headers={**headers[role], "Idempotency-Key": path},
                    **kwargs,
                )
                if not r.is_success:
                    raise RuntimeError(f"{method} {path}: {r.status_code} {r.text}")
                return r.json()

            course = request("POST", "/courses", json={"title": "Discrete mathematics"})
            request(
                "POST",
                f"/courses/{course['id']}/members",
                json={"user_id": student_id, "role": "student"},
            )
            assignment = request(
                "POST",
                f"/courses/{course['id']}/assignments",
                json={
                    "title": "Induction homework",
                    "questions": [{"id": "q1", "prompt": "Prove that 1+...+n = n(n+1)/2."}],
                },
            )
            rubric = request(
                "POST",
                f"/assignments/{assignment['id']}/rubric-versions",
                json=json.loads((Path(__file__).parents[1] / "examples/rubric.json").read_text()),
            )
            request("POST", f"/rubric-versions/{rubric['id']}:publish")
            doc = request(
                "POST",
                f"/documents?course_id={course['id']}&kind=submission",
                role="student",
                files={"file": ("homework.pdf", raw, "application/pdf")},
            )
            sub = request(
                "POST",
                f"/assignments/{assignment['id']}/submissions",
                role="student",
                json={"document_id": doc["id"]},
            )
            job = request(
                "POST",
                f"/submissions/{sub['id']}/assessments",
                json={
                    "rubric_id": rubric["id"],
                    "source": "manual",
                    "results": [
                        {"criterion_id": "base_case", "status": "assessed", "band_id": "correct"},
                        {
                            "criterion_id": "inductive_step",
                            "status": "assessed",
                            "band_id": "circular",
                        },
                    ],
                },
            )
            aid = job["result_id"]
            region = request("GET", f"/documents/{doc['id']}", role="student")["regions"][0]
            request(
                "POST",
                f"/assessments/{aid}/findings",
                json={
                    "criterion_id": "inductive_step",
                    "pattern_id": "circular_induction",
                    "category": "conceptual",
                    "description": "The argument assumes its conclusion.",
                    "evidence_region_ids": [region["id"]],
                },
            )
            assert "score" not in request("GET", f"/assessments/{aid}", role="student")
            hint = request(
                "POST",
                f"/assessments/{aid}/feedback",
                role="student",
                json={"source": "bank", "requested_level": 4},
            )
            assessment = request("GET", f"/assessments/{aid}")
            request(
                "POST",
                f"/assessments/{aid}:finalize",
                json={"expected_version": assessment["version"], "acknowledge_review": True},
            )
            grade = request("GET", f"/assessments/{aid}", role="student")
            analytics = request(
                "GET",
                f"/assignments/{assignment['id']}/analytics/questions?rubric_id={rubric['id']}",
            )
            print(
                json.dumps(
                    {
                        "status": "passed",
                        "external_ai": False,
                        "hint": hint["items"][0]["text"],
                        "effective_hint_level": hint["effective_level"],
                        "final_score": grade["score"],
                        "analytics": analytics["items"],
                    },
                    indent=2,
                )
            )
        app.dependency_overrides.clear()
        engine.dispose()


if __name__ == "__main__":
    main()
