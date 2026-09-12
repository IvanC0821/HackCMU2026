import json
from pathlib import Path

import pymupdf
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from verity.api import app
from verity.auth import issue_token
from verity.config import settings
from verity.db import Base, get_db, make_engine
from verity.models import User


@pytest.fixture
def env(tmp_path, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "storage_dir", tmp_path / "documents")
    monkeypatch.setattr(cfg, "s3_bucket", "")
    monkeypatch.setattr(cfg, "external_ai_enabled", False)
    monkeypatch.setattr(cfg, "max_upload_bytes", 20 * 1024 * 1024)
    monkeypatch.setattr(cfg, "zai_api_key", "")
    monkeypatch.setattr(cfg, "glm_ocr_bbox_format", "normalized")
    monkeypatch.setattr(cfg, "openai_api_key", "test-key")
    monkeypatch.setattr(cfg, "local_tokens_enabled", True)
    monkeypatch.setattr(cfg, "jwt_jwks_url", "")
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)

    def override_db():
        with factory() as db:
            try:
                yield db
                db.commit()
            except Exception:
                db.rollback()
                raise

    app.dependency_overrides[get_db] = override_db
    actors = {}
    with factory() as db:
        for role in ["admin", "instructor", "student", "other", "ta"]:
            user = User(
                email=f"{role}@example.test",
                name=role,
                role=role if role in {"admin", "instructor"} else "student",
            )
            db.add(user)
            db.flush()
            actors[role] = {
                "id": user.id,
                "headers": {"Authorization": "Bearer " + issue_token(db, user)},
            }
        db.commit()
    with TestClient(app) as client:
        yield {"client": client, "factory": factory, "actors": actors, "config": cfg}
    app.dependency_overrides.clear()
    engine.dispose()


def pdf_bytes(pages=1, rotation=0, crop=False):
    with pymupdf.open() as doc:
        for _ in range(pages):
            page = doc.new_page(width=612, height=792)
            page.insert_text(
                (80, 150), "Assume the claim for k+1. Therefore the claim holds for k+1."
            )
            if crop:
                page.set_cropbox(pymupdf.Rect(30, 40, 580, 750))
            page.set_rotation(rotation)
        return doc.tobytes()


def call(env, method, path, role="instructor", body=None, key=None, expected=200, **kwargs):
    headers = dict(env["actors"][role]["headers"])
    if key:
        headers["Idempotency-Key"] = key
    result = env["client"].request(method, "/api/v1" + path, headers=headers, json=body, **kwargs)
    assert result.status_code == expected, result.text
    return result.json()


@pytest.fixture
def homework(env):
    course = call(env, "POST", "/courses", body={"title": "Discrete mathematics"}, expected=201)
    for role in ["student", "other", "ta"]:
        call(
            env,
            "POST",
            f"/courses/{course['id']}/members",
            body={
                "user_id": env["actors"][role]["id"],
                "role": "ta" if role == "ta" else "student",
            },
            expected=201,
        )
    key = call(
        env,
        "POST",
        f"/documents?course_id={course['id']}&kind=answer_key",
        files={"file": ("key.pdf", pdf_bytes(), "application/pdf")},
        expected=201,
    )
    assignment = call(
        env,
        "POST",
        f"/courses/{course['id']}/assignments",
        body={
            "title": "Induction",
            "questions": [{"id": "q1", "prompt": "Prove by induction that 1+...+n = n(n+1)/2."}],
            "material_document_ids": [key["id"]],
            "external_ai_allowed": True,
            "feedback_policy": {"allow_generated": True},
        },
        expected=201,
    )
    spec = json.loads((Path(__file__).parents[1] / "examples/rubric.json").read_text())
    rubric = call(
        env, "POST", f"/assignments/{assignment['id']}/rubric-versions", body=spec, expected=201
    )
    approve_hints(env, rubric["id"])
    call(env, "POST", f"/rubric-versions/{rubric['id']}:publish")
    doc = call(
        env,
        "POST",
        f"/documents?course_id={course['id']}&kind=submission",
        role="student",
        files={"file": ("work.pdf", pdf_bytes(), "application/pdf")},
        expected=201,
    )
    submission = call(
        env,
        "POST",
        f"/assignments/{assignment['id']}/submissions",
        role="student",
        body={"document_id": doc["id"]},
        expected=201,
    )
    regions = call(env, "GET", f"/documents/{doc['id']}", role="student")["regions"]
    return {
        "course": course,
        "assignment": assignment,
        "rubric": rubric,
        "submission": submission,
        "doc": doc,
        "key": key,
        "regions": regions,
        "spec": spec,
    }


def manual_assessment(env, homework, key="manual-1", results=None):
    results = results or [
        {"criterion_id": "base_case", "status": "assessed", "band_id": "correct"},
        {"criterion_id": "inductive_step", "status": "assessed", "band_id": "circular"},
    ]
    job = call(
        env,
        "POST",
        f"/submissions/{homework['submission']['id']}/assessments",
        key=key,
        body={"rubric_id": homework["rubric"]["id"], "source": "manual", "results": results},
        expected=202,
    )
    return job["result_id"]


def finding_body(homework):
    return {
        "criterion_id": "inductive_step",
        "pattern_id": "circular_induction",
        "category": "conceptual",
        "description": "The k+1 statement is assumed.",
        "evidence_region_ids": [homework["regions"][0]["id"]],
    }


def approve_hints(env, rubric_id):
    bank = call(env, "GET", f"/rubric-versions/{rubric_id}/hint-bank")
    return call(
        env,
        "POST",
        f"/rubric-versions/{rubric_id}/hint-bank:approve",
        body={"expected_version": bank["version"]},
    )
