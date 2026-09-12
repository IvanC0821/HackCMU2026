import base64
import json
import struct

import httpx
import pymupdf
import pytest
from conftest import call, pdf_bytes
from sqlalchemy import select
from test_jobs import start, stub_assessor

from verity import jobs, pdf, providers
from verity.models import Assignment, Document, Region


def response_data(box=None):
    return {
        "model": "GLM-OCR",
        "md_results": "x = -1",
        "layout_details": [
            [
                {
                    "index": 0,
                    "label": "formula",
                    "content": "x = -1",
                    "bbox_2d": box or [80 / 612, 100 / 792, 160 / 612, 120 / 792],
                }
            ]
        ],
        "data_info": {"num_pages": 1, "pages": [{"width": 918, "height": 1188}]},
        "usage": {"prompt_tokens": 123, "completion_tokens": 5, "total_tokens": 128},
    }


def enable(env):
    env["config"].external_ai_enabled = True
    env["config"].zai_api_key = "test-zai-key"


def install_transport(monkeypatch, body=None, status=200):
    calls = []

    def post(url, **kwargs):
        assert url == "https://api.z.ai/api/paas/v4/layout_parsing"
        assert kwargs["headers"] == {"Authorization": "Bearer test-zai-key"}
        assert kwargs["follow_redirects"] is False
        payload = kwargs["json"]
        assert set(payload) == {"file", "model", "return_crop_images", "need_layout_visualization"}
        assert payload["model"] == "glm-ocr"
        assert payload["return_crop_images"] is False
        assert payload["need_layout_visualization"] is False
        assert payload["file"].startswith("data:image/png;base64,")
        png = base64.b64decode(payload["file"].split(",", 1)[1], validate=True)
        assert png.startswith(b"\x89PNG\r\n\x1a\n")
        calls.append(png)
        return httpx.Response(
            status,
            request=httpx.Request("POST", url),
            content=json.dumps(response_data() if body is None else body).encode(),
        )

    monkeypatch.setattr(providers.httpx, "post", post)
    return calls


def test_hosted_ocr_preserves_evidence_caches_and_checks_permissions(env, homework, monkeypatch):
    enable(env)
    calls = install_transport(monkeypatch)
    with env["factory"]() as db:
        assignment = db.get(Assignment, homework["assignment"]["id"])
        doc = db.get(Document, homework["doc"]["id"])
        providers.extract_ocr(db, assignment, doc)
        region = db.scalar(
            select(Region).where(Region.document_id == doc.id, Region.source == "glm-ocr")
        )
        assert region.bbox == pytest.approx([80, 100, 160, 120])
        assert region.text == "x = -1" and region.granularity == "step"
        assert region.evidence["confidence"] is None
        assert region.evidence["usage"]["total_tokens"] == 128
        assert region.evidence["provider_bbox_format"] == "normalized"
        assert region.evidence["image_to_page"] == doc.pages[0]["image_to_page"]
        providers.extract_ocr(db, assignment, doc)
        assert len(calls) == 1
        assignment.data = {**assignment.data, "external_ai_allowed": False}
        with pytest.raises(providers.ProviderFailure, match="external_ai_disabled"):
            providers.extract_ocr(db, assignment, doc)
        assignment.data = {**assignment.data, "external_ai_allowed": True}
        env["config"].external_ai_enabled = False
        with pytest.raises(providers.ProviderFailure, match="external_ai_disabled"):
            providers.extract_ocr(db, assignment, doc)
        assert len(calls) == 1


@pytest.mark.parametrize("rotation,crop", [(0, False), (90, False), (270, True)])
@pytest.mark.parametrize("box_format", ["normalized", "pixels"])
def test_pdf_coordinate_roundtrip(env, homework, rotation, crop, box_format):
    with env["factory"]() as db:
        doc = pdf.ingest(
            db,
            pdf_bytes(rotation=rotation, crop=crop),
            homework["course"]["id"],
            env["actors"]["student"]["id"],
            "submission",
        )
        width, height = struct.unpack(">II", pdf.render(doc, 0)[16:24])
        # Provider may resize its image; pixel mode uses its reported dimensions.
        data = response_data([0.1, 0.2, 0.6, 0.8])
        data["data_info"]["pages"] = [{"width": width * 2, "height": height * 2}]
        if box_format == "pixels":
            data["layout_details"][0][0]["bbox_2d"] = [
                width * 0.2,
                height * 0.4,
                width * 1.2,
                height * 1.6,
            ]
        region = providers._glm_regions(data, doc, 0, (width, height), box_format)[0]
        assert region.bbox == pytest.approx(
            [width * 0.1 / 1.5, height * 0.2 / 1.5, width * 0.6 / 1.5, height * 0.8 / 1.5]
        )
        anchor = pdf.point_from_region(doc, region)
        assert anchor["document_revision_id"] == doc.id and anchor["page_index"] == 0
        assert anchor["x"] == pytest.approx(width * 0.35 / 1.5)
        assert anchor["y"] == pytest.approx(height * 0.5 / 1.5)


def test_fractional_and_mixed_page_sizes(env, homework):
    with pymupdf.open() as source:
        source.new_page(width=500.25, height=720.25)
        source.new_page(width=612, height=400)
        raw = source.tobytes()
    with env["factory"]() as db:
        doc = pdf.ingest(
            db, raw, homework["course"]["id"], env["actors"]["student"]["id"], "submission"
        )
        for index, page in enumerate(doc.pages):
            size = struct.unpack(">II", pdf.render(doc, index)[16:24])
            data = response_data([0, 0, 1, 1])
            data.pop("data_info")
            region = providers._glm_regions(data, doc, index, size, "normalized")[0]
            assert region.bbox == pytest.approx([0, 0, page["width"], page["height"]])
            assert region.page_index == index


@pytest.mark.parametrize(
    "bad_box",
    [
        [-0.1, 0, 0.5, 0.5],
        [0, 0, 2, 2],
        [0, 0, 0, 0.5],
        [0, 0, 0.5],
        [0, 0, float("nan"), 0.5],
        [0, 0, ".5", 0.5],
        [False, 0, 0.5, 0.5],
    ],
)
def test_invalid_geometry_cannot_become_a_pin(env, homework, monkeypatch, bad_box):
    enable(env)
    calls = install_transport(monkeypatch, response_data(bad_box))
    with env["factory"]() as db:
        doc = db.get(Document, homework["doc"]["id"])
        with pytest.raises(providers.ProviderFailure, match="ocr_invalid_geometry"):
            providers.extract_ocr(db, db.get(Assignment, homework["assignment"]["id"]), doc)
        assert not doc.ocr_complete and not db.new
        assert len(calls) == 1


@pytest.mark.parametrize(
    "change",
    [
        "missing_layout",
        "wrong_page_count",
        "missing_content",
        "empty_layout",
        "rotation",
        "wrong_dimensions",
        "missing_pixel_dimensions",
    ],
)
def test_incomplete_provider_results_fail_closed(env, homework, monkeypatch, change):
    enable(env)
    data = response_data()
    code = "ocr_invalid_response"
    if change == "missing_layout":
        del data["layout_details"]
    elif change == "wrong_page_count":
        data["data_info"]["num_pages"] = 2
    elif change == "missing_content":
        del data["layout_details"][0][0]["content"]
    elif change == "empty_layout":
        data["layout_details"] = [[]]
    elif change == "rotation":
        data["rotation"] = 90
        code = "ocr_invalid_geometry"
    elif change == "wrong_dimensions":
        data["data_info"]["pages"][0] = {"width": 1188, "height": 918}
        code = "ocr_invalid_geometry"
    else:
        env["config"].glm_ocr_bbox_format = "pixels"
        del data["data_info"]
        code = "ocr_invalid_geometry"
    install_transport(monkeypatch, data)
    with env["factory"]() as db:
        doc = db.get(Document, homework["doc"]["id"])
        with pytest.raises(providers.ProviderFailure, match=code):
            providers.extract_ocr(db, db.get(Assignment, homework["assignment"]["id"]), doc)
        assert not doc.ocr_complete and not db.new


@pytest.mark.parametrize("status", [401, 429, 500, 302])
def test_http_errors_are_private_and_not_retried(env, homework, monkeypatch, status):
    enable(env)
    calls = install_transport(monkeypatch, {"message": "private student content"}, status=status)
    with env["factory"]() as db:
        with pytest.raises(providers.ProviderFailure) as exc:
            providers.extract_ocr(
                db,
                db.get(Assignment, homework["assignment"]["id"]),
                db.get(Document, homework["doc"]["id"]),
            )
        assert str(exc.value) == "ocr_request_failed"
        assert len(calls) == 1


def test_missing_key_and_image_limit_do_not_call_provider(env, homework, monkeypatch):
    env["config"].external_ai_enabled = True
    calls = install_transport(monkeypatch)
    with env["factory"]() as db:
        assignment = db.get(Assignment, homework["assignment"]["id"])
        doc = db.get(Document, homework["doc"]["id"])
        with pytest.raises(providers.ProviderFailure, match="glm_ocr_not_configured"):
            providers.extract_ocr(db, assignment, doc)
        enable(env)
        monkeypatch.setattr(providers, "render", lambda *args: b"x" * (10 * 1024 * 1024 + 1))
        with pytest.raises(providers.ProviderFailure, match="ocr_image_too_large"):
            providers.extract_ocr(db, assignment, doc)
        assert not calls


@pytest.mark.parametrize("failure", ["timeout", "invalid_json"])
def test_transport_and_decode_failures_are_sanitized(env, homework, monkeypatch, failure):
    enable(env)
    calls = []

    def post(url, **kwargs):
        calls.append(url)
        if failure == "timeout":
            raise httpx.ReadTimeout("private provider diagnostic")
        return httpx.Response(
            200, request=httpx.Request("POST", url), text="private invalid response body"
        )

    monkeypatch.setattr(providers.httpx, "post", post)
    with env["factory"]() as db:
        with pytest.raises(providers.ProviderFailure) as exc:
            providers.extract_ocr(
                db,
                db.get(Assignment, homework["assignment"]["id"]),
                db.get(Document, homework["doc"]["id"]),
            )
        expected = "ocr_request_failed" if failure == "timeout" else "ocr_invalid_response"
        assert str(exc.value) == expected and len(calls) == 1


def test_later_page_failure_leaves_no_partial_ocr(env, homework, monkeypatch):
    enable(env)
    calls = []

    def post(url, **kwargs):
        calls.append(url)
        return httpx.Response(
            200, request=httpx.Request("POST", url), json=response_data() if len(calls) == 1 else {}
        )

    monkeypatch.setattr(providers.httpx, "post", post)
    with env["factory"]() as db:
        doc = pdf.ingest(
            db,
            pdf_bytes(pages=2),
            homework["course"]["id"],
            env["actors"]["student"]["id"],
            "submission",
        )
        with pytest.raises(providers.ProviderFailure, match="ocr_invalid_response"):
            providers.extract_ocr(db, db.get(Assignment, homework["assignment"]["id"]), doc)
        assert len(calls) == 2 and not doc.ocr_complete and not db.new


def test_blank_page_and_image_links(env, homework):
    with env["factory"]() as db:
        doc = db.get(Document, homework["doc"]["id"])
        data = response_data()
        data["layout_details"][0].append({"label": "image", "content": "https://example.test/crop"})
        assert len(providers._glm_regions(data, doc, 0, (918, 1188), "normalized")) == 1
        blank = {"layout_details": [[]], "md_results": ""}
        assert providers._glm_regions(blank, doc, 0, (918, 1188), "normalized") == []


def test_ocr_job_keeps_teacher_review_and_immediate_hints(env, homework, monkeypatch):
    enable(env)
    calls = install_transport(monkeypatch)
    stub_assessor(monkeypatch)
    with env["factory"]() as db:
        assignment = db.get(Assignment, homework["assignment"]["id"])
        assignment.data = {**assignment.data, "ocr_enabled": True}
        db.commit()
    job = start(env, homework)
    assert jobs.run_once(env["factory"])
    done = call(env, "GET", f"/jobs/{job['id']}", role="student")
    assert done["status"] == "succeeded" and len(calls) == 1
    assessment = call(env, "GET", f"/assessments/{done['result_id']}")
    assert assessment["status"] == "review_required"
    hint = call(
        env,
        "POST",
        f"/assessments/{assessment['id']}/feedback",
        role="student",
        key="glm-hint",
        body={"source": "bank", "requested_level": 2},
    )
    assert hint["items"] and hint["advisory"] and "score" not in hint
    # Reassessment reuses the committed OCR instead of billing for the document again.
    start(env, homework, key="glm-reassess")
    assert jobs.run_once(env["factory"]) and len(calls) == 1
