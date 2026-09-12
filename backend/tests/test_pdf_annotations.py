from copy import deepcopy

import pymupdf
import pytest

from verity.pdf_annotations import FEEDBACK, PDFLocator, feedback_code, public_anchor


def document(*pages):
    doc = pymupdf.open()
    for lines in pages:
        page = doc.new_page(width=600, height=800)
        for i, text in enumerate(lines):
            page.insert_text((60, 80 + i * 30), text)
    return doc


def test_quote_crosses_lines_and_uses_actual_page_with_part_disambiguation():
    with document(
        ["Problem 1", "(a) First", "rank(A) = 2"],
        ["Problem 2", "(a) Second", "rank(A)", "= 2", "Next statement"],
    ) as doc:
        locator = PDFLocator(doc)
        anchor = locator.locate(2, "2a", [1, 2], "rank(A) = 2")
        assert anchor["pageIndex"] == 1
        assert anchor["kind"] == "line" and len(anchor["boxes"]) == 2
        assert public_anchor(anchor, [1, 2]) == anchor
        assert locator.quote_anchor("rank(A) = 2", locator.lines) is None


def test_substring_is_not_a_verified_line_and_scanned_pages_are_unlocated():
    with document(["Problem 1", "(a) Work", "value = 240"]) as doc:
        locator = PDFLocator(doc)
        assert locator.locate(1, "1a", [1], "value = 24")["kind"] == "part"
        assert locator.locate(1, "1b", [1]) is None
        assert locator.locate(1, "1a", [2]) is None
    with document([]) as doc:
        assert PDFLocator(doc).locate(1, "1a", [1], "some handwriting") is None


def test_missing_labels_marks_work_not_nonexistent_wrong_symbol():
    with document(
        ["Problem 3", "(a) Elimination", "1 2 3", "0 1 2", "Back substitution", "x = 4"]
    ) as doc:
        locator = PDFLocator(doc)
        anchor = locator.locate(3, "3a", [1], code="row-labels")
        assert anchor["kind"] == "work" and len(anchor["boxes"]) == 1
        box = anchor["boxes"][0]
        assert box["y"] < 140 / 800
        assert box["y"] + box["height"] < 190 / 800


@pytest.mark.parametrize("rotation", [0, 90, 180, 270])
def test_crop_and_rotation_match_display_coordinates(rotation):
    with document(["Problem 1", "(a) Work", "value = 240"]) as doc:
        page = doc[0]
        page.set_cropbox(pymupdf.Rect(20, 30, 570, 740))
        page.set_rotation(rotation)
        expected = page.search_for("value = 240")[0] * page.rotation_matrix
        anchor = PDFLocator(doc).locate(1, "1a", [1], "value = 240")
        box = anchor["boxes"][0]
        assert box["x"] == pytest.approx(expected.x0 / page.rect.width)
        assert box["y"] == pytest.approx(expected.y0 / page.rect.height)
        assert box["width"] == pytest.approx(expected.width / page.rect.width)
        assert box["height"] == pytest.approx(expected.height / page.rect.height)
        assert public_anchor(anchor, [1]) == anchor


def test_public_geometry_is_allowlisted_and_rejects_bad_coordinates():
    anchor = {
        "pageIndex": 0,
        "x": 0.5,
        "y": 0.5,
        "kind": "line",
        "private": "answer key",
        "boxes": [{"x": 0.2, "y": 0.3, "width": 0.2, "height": 0.1, "text": "secret"}],
    }
    cleaned = public_anchor(anchor, [1])
    assert "private" not in cleaned and "text" not in cleaned["boxes"][0]
    assert public_anchor(anchor, [2]) is None
    for bad in [True, float("nan"), float("inf"), -0.1, 1.1, "0.5"]:
        assert public_anchor({**anchor, "x": bad}, [1]) is None
    malformed = deepcopy(anchor)
    malformed["boxes"][0]["width"] = 1
    assert public_anchor(malformed, [1]) is None


@pytest.mark.parametrize(
    "reason,category,code",
    [
        ("E2: row operations unlabeled; private correct work", "logic", "row-labels"),
        ("E7: rank stated without explanation; private solution", "logic", "justification"),
        ("PRIVATE correct answer = 12", "arithmetic", "calculation"),
        ("N2: private equation", "notation", "notation"),
    ],
)
def test_feedback_only_uses_solution_free_templates(reason, category, code):
    assert feedback_code({"reason": reason, "category": category}) == code
    assert "private" not in str(FEEDBACK[code]).lower()
