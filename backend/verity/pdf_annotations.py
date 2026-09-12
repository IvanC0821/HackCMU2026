"""Locate feedback in the submitted PDF, without asking a model to invent coordinates."""

import math
import re
import unicodedata
from collections import defaultdict

import pymupdf

FEEDBACK = {
    "row-labels": (
        "Missing row-operation labels",
        "The row operations in this work may need labels.",
    ),
    "justification": ("Missing justification", "This claim may need supporting reasoning."),
    "supporting-work": ("Missing work", "The answer here may need supporting steps."),
    "calculation": ("Calculation error", "A calculation in this work may need another look."),
    "reasoning": ("Logic error", "Check whether this step follows from the preceding work."),
    "notation": ("Notation error", "Check the notation used in this part of your work."),
    "presentation": ("Presentation", "Check the labels, units or final-answer presentation here."),
    "method": ("Method", "Check that this work uses the method requested for this problem."),
    "review": ("Work to revisit", "Review this part of your work with your TA."),
}


def feedback_code(result):
    # Inspect staff evidence internally; expose only fixed, solution-free messages.
    text = (result.get("reason") or result.get("evidence") or "").lower()
    category = result.get("category", "").lower()
    if re.search(r"\be2\b|\bs1\b|row.operation labels|unlabeled|not labeled", text):
        return "row-labels"
    if re.search(r"\be7\b|\bs4\b|without explain|no reason|justif", text):
        return "justification"
    if re.search(r"\be1\b|\bs2\b|bare answer|bare final|no work", text):
        return "supporting-work"
    if re.search(r"\be9\b|\bs5\b", text) or category == "method":
        return "method"
    if re.search(r"\be8\b|\bs3\b|arithmetic", text) or category == "arithmetic":
        return "calculation"
    if re.search(r"\bn[1-9]\b", text) or category == "notation":
        return "notation"
    if re.search(r"\be6\b|units|boxed|final answer not", text) or category == "presentation":
        return "presentation"
    return {
        "logic": "reasoning",
        "conceptual": "reasoning",
        "missing-work": "supporting-work",
        "missing work": "supporting-work",
    }.get(category, "review")


def normalize(text):
    return unicodedata.normalize("NFKC", text).translate(
        str.maketrans({"−": "-", "–": "-", "’": "'", "\u00a0": " "})
    )


class PDFLocator:
    def __init__(self, doc):
        self.doc = doc
        self.lines = []
        for page_index, page in enumerate(doc):
            for block in page.get_text("rawdict", sort=True)["blocks"]:
                for line in block.get("lines", []):
                    chars = [c for span in line["spans"] for c in span["chars"]]
                    text = "".join(c["c"] for c in chars)
                    if text.strip():
                        self.lines.append(
                            {
                                "page": page_index,
                                "text": text,
                                "chars": chars,
                                "rect": pymupdf.Rect(line["bbox"]),
                            }
                        )
        self.lines.sort(key=lambda line: (line["page"], line["rect"].y0, line["rect"].x0))

    def part_lines(self, question_number, part_id, pages):
        starts = [
            i
            for i, line in enumerate(self.lines)
            if re.match(rf"^\s*(?:Problem|Question)\s+{question_number}\b", line["text"], re.I)
        ]
        if len(starts) != 1:
            return []
        start = starts[0]
        end = next(
            (
                i
                for i in range(start + 1, len(self.lines))
                if re.match(r"^\s*(?:Problem|Question)\s+\d+\b", self.lines[i]["text"], re.I)
            ),
            len(self.lines),
        )
        part = re.fullmatch(r"\d+([a-z])", part_id)
        if part:
            parts = [
                (i, m[1])
                for i in range(start + 1, end)
                if (m := re.match(r"^\s*\(?([a-z])\)\s*", self.lines[i]["text"], re.I))
            ]
            found = [i for i, letter in parts if letter.lower() == part[1]]
            if len(found) != 1:
                return []
            start = found[0]
            end = next((i for i, _ in parts if i > start), end)
        return [line for line in self.lines[start:end] if line["page"] + 1 in pages]

    def anchor(self, page_index, rects, kind):
        page = self.doc[page_index]
        boxes = []
        for rect in rects:
            displayed = (rect * page.rotation_matrix) & page.rect
            if displayed.is_empty or displayed.is_infinite:
                continue
            boxes.append(
                {
                    "x": displayed.x0 / page.rect.width,
                    "y": displayed.y0 / page.rect.height,
                    "width": displayed.width / page.rect.width,
                    "height": displayed.height / page.rect.height,
                }
            )
        if not boxes:
            return None
        first = boxes[0]
        return {
            "pageIndex": page_index,
            "x": min(0.965, first["x"] + first["width"] + 0.045),
            "y": max(0.025, min(0.975, first["y"] + first["height"] / 2)),
            "boxes": boxes,
            "kind": kind,
        }

    def quote_anchor(self, quote, lines):
        needle = "".join(normalize(quote or "").split())
        if len(needle) < 4:
            return None
        grouped = defaultdict(list)
        for line in lines:
            grouped[line["page"]].append(line)
        matches = []
        pattern = r"\s*".join(re.escape(c) for c in needle)
        if needle[0].isalnum():
            pattern = r"(?<!\w)" + pattern
        if needle[-1].isalnum():
            pattern += r"(?!\w)"
        for page_index, page_lines in grouped.items():
            text, positions = "", []
            for line_index, line in enumerate(page_lines):
                for char in line["chars"]:
                    value = normalize(char["c"])
                    text += value
                    positions.extend([(line_index, char["bbox"])] * len(value))
                text += "\n"
                positions.append(None)
            for match in re.finditer(pattern, text):
                rects = {}
                for position in positions[match.start() : match.end()]:
                    if position is None:
                        continue
                    line_index, rect = position
                    rects[line_index] = rects.get(line_index, pymupdf.Rect()) | pymupdf.Rect(rect)
                matches.append(self.anchor(page_index, list(rects.values()), "line"))
        return matches[0] if len(matches) == 1 else None

    def locate(self, question_number, part_id, pages, quote=None, code="review"):
        lines = self.part_lines(question_number, part_id, pages)
        # Without a detected part, a unique quote can still identify a real line.
        search_lines = lines or [line for line in self.lines if line["page"] + 1 in pages]
        exact = self.quote_anchor(quote, search_lines)
        if exact:
            return exact
        if not lines:
            return None
        # A missing label has no mistaken glyph. Highlight the actual elimination work.
        if code == "row-labels":
            first_page = lines[0]["page"]
            work = [line for line in lines if line["page"] == first_page]
            # Stop before explanatory back-substitution/final answers when present.
            stop = next(
                (
                    i
                    for i, line in enumerate(work[1:], 1)
                    if re.match(
                        r"\s*(?:Back substitution|Final answer|\[ANSWER)", line["text"], re.I
                    )
                ),
                len(work),
            )
            work = work[:stop]
            rect = pymupdf.Rect()
            for line in work:
                rect |= line["rect"]
            return self.anchor(first_page, [rect], "work")
        if code in {"justification", "supporting-work", "presentation"}:
            candidates = [
                line
                for line in lines
                if re.search(r"rank\s*\(|final answer|\[answer|dependent|span", line["text"], re.I)
            ]
            if len(candidates) == 1:
                return self.anchor(candidates[0]["page"], [candidates[0]["rect"]], "work")
        # Located subpart, not an asserted exact mistake location.
        return self.anchor(lines[0]["page"], [lines[0]["rect"]], "part")


def public_anchor(anchor, pages):
    if not isinstance(anchor, dict) or type(anchor.get("pageIndex")) is not int:
        return None
    if anchor["pageIndex"] + 1 not in pages:
        return None

    def numeric(value):
        return type(value) in (float, int) and math.isfinite(value)

    if not all(numeric(anchor.get(k)) and 0 <= anchor[k] <= 1 for k in ("x", "y")):
        return None
    clean = {k: anchor[k] for k in ("pageIndex", "x", "y")}
    boxes = anchor.get("boxes", [])
    if not isinstance(boxes, list) or len(boxes) > 100:
        return None
    for b in boxes:
        if not isinstance(b, dict) or not all(
            numeric(b.get(k)) for k in ("x", "y", "width", "height")
        ):
            return None
        if not (
            0 <= b["x"] < 1
            and 0 <= b["y"] < 1
            and b["width"] > 0
            and b["height"] > 0
            and b["x"] + b["width"] <= 1.000001
            and b["y"] + b["height"] <= 1.000001
        ):
            return None
    clean["boxes"] = [{k: b[k] for k in ("x", "y", "width", "height")} for b in boxes]
    clean["kind"] = anchor.get("kind") if anchor.get("kind") in {"line", "work", "part"} else "part"
    return clean
