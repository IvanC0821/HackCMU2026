import pymupdf
import pytest
from conftest import call, pdf_bytes

from verity.math_checks import polynomial_identity


@pytest.mark.parametrize("rotation", [0, 90, 180, 270])
@pytest.mark.parametrize("crop", [False, True])
def test_pdf_coordinate_round_trip_and_real_glyph_pixels(env, rotation, crop):
    course = call(env, "POST", "/courses", body={"title": "Geometry"}, expected=201)
    doc = call(
        env,
        "POST",
        f"/documents?course_id={course['id']}&kind=submission",
        files={"file": ("scan.pdf", pdf_bytes(rotation=rotation, crop=crop), "application/pdf")},
        expected=201,
    )
    info = call(env, "GET", f"/documents/{doc['id']}?granularity=symbol")
    page = info["pages"][0]
    assert page["rotation"] == rotation
    x0, y0, x1, y1 = info["regions"][0]["bbox"]
    original = pymupdf.Point((x0 + x1) / 2, (y0 + y1) / 2)
    image_point = original * pymupdf.Matrix(page["page_to_image"])
    recovered = image_point * pymupdf.Matrix(page["image_to_page"])
    assert abs(original.x - recovered.x) < 1e-4 and abs(original.y - recovered.y) < 1e-4
    assert 0 <= original.x <= page["width"] and 0 <= original.y <= page["height"]
    response = env["client"].get(
        f"/api/v1/documents/{doc['id']}/pages/0/image",
        headers=env["actors"]["instructor"]["headers"],
    )
    pixmap = pymupdf.Pixmap(response.content)
    assert abs(pixmap.width - page["width"] * page["render_scale"]) <= 1
    points = [
        pymupdf.Point(x0, y0) * pymupdf.Matrix(page["page_to_image"]),
        pymupdf.Point(x1, y1) * pymupdf.Matrix(page["page_to_image"]),
    ]
    assert any(
        min(pixmap.pixel(x, y)[:3]) < 128
        for x in range(max(0, int(points[0].x)), min(pixmap.width, int(points[1].x) + 1))
        for y in range(max(0, int(points[0].y)), min(pixmap.height, int(points[1].y) + 1))
    )


def test_reject_bad_oversized_and_over_page_limit_pdfs(env):
    course = call(env, "POST", "/courses", body={"title": "Limits"}, expected=201)
    path = f"/documents?course_id={course['id']}&kind=submission"
    call(
        env,
        "POST",
        path,
        files={"file": ("bad.pdf", b"not a PDF", "application/pdf")},
        expected=422,
    )
    call(
        env,
        "POST",
        path,
        files={"file": ("long.pdf", pdf_bytes(pages=11), "application/pdf")},
        expected=422,
    )
    env["config"].max_upload_bytes = 1024
    call(
        env,
        "POST",
        path,
        files={"file": ("huge.pdf", b"%PDF-" + b"x" * 2000, "application/pdf")},
        expected=413,
    )


@pytest.mark.parametrize(
    "lhs,rhs,expected",
    [
        ("(n+1)*(n+2)/2", "n*(n+1)/2+n+1", "equivalent"),
        ("(x+1)**2", "x**2+1", "not_equivalent"),
        ("__import__('os').system('whoami')", "0", "unsupported"),
        ("x**100000", "0", "unsupported"),
        ("1/0", "0", "unsupported"),
        ("sin(x)", "x", "unsupported"),
        ("x/y", "1", "unsupported"),
    ],
)
def test_restricted_math_checks(lhs, rhs, expected):
    assert polynomial_identity(lhs, rhs) == expected
