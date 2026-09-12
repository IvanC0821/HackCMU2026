import hashlib
import math

import pymupdf as fitz
from fastapi import HTTPException

from . import storage
from .config import settings
from .models import Document, Region, uid

SCALE = 1.5


def valid_bbox(box, page):
    if len(box) != 4 or not all(math.isfinite(v) for v in box):
        return False
    x0, y0, x1, y1 = box
    return 0 <= x0 < x1 <= page["width"] and 0 <= y0 < y1 <= page["height"]


def validate_anchor(anchor, doc):
    if anchor.document_revision_id != doc.id or anchor.page_index >= len(doc.pages):
        raise HTTPException(422, "Anchor belongs to another document or page")
    page = doc.pages[anchor.page_index]
    if not (0 <= anchor.x <= page["width"] and 0 <= anchor.y <= page["height"]):
        raise HTTPException(422, "Anchor outside page bounds")


def ingest(db, raw, course_id, user_id, kind):
    cfg = settings()
    if len(raw) > cfg.max_upload_bytes:
        raise HTTPException(413, "PDF exceeds upload size limit")
    if not raw.startswith(b"%PDF-"):
        raise HTTPException(422, "Upload must be a PDF")
    try:
        pdf = fitz.open(stream=raw, filetype="pdf")
    except Exception:
        raise HTTPException(422, "PDF could not be opened") from None
    with pdf:
        if pdf.needs_pass or not 1 <= len(pdf) <= cfg.max_pdf_pages:
            raise HTTPException(422, f"Provide an unencrypted PDF with 1–{cfg.max_pdf_pages} pages")
        document_id = uid()
        pages, regions = [], []
        for i, page in enumerate(pdf):
            rotation = page.rotation
            rotation_matrix = list(page.rotation_matrix)
            derotation_matrix = list(page.derotation_matrix)
            cropbox = list(page.cropbox)
            page.set_rotation(0)
            width, height = page.rect.width, page.rect.height
            if min(width, height) < 1 or max(width, height) > 2000:
                raise HTTPException(422, "Unsupported PDF page dimensions")
            pages.append(
                {
                    "page_index": i,
                    "width": width,
                    "height": height,
                    "rotation": rotation,
                    "cropbox": cropbox,
                    "rotation_matrix": rotation_matrix,
                    "derotation_matrix": derotation_matrix,
                    "render_scale": SCALE,
                    "page_to_image": [SCALE, 0, 0, SCALE, 0, 0],
                    "image_to_page": [1 / SCALE, 0, 0, 1 / SCALE, 0, 0],
                    "coordinate_space": "pymupdf_unrotated",
                }
            )
            for block in page.get_text("rawdict")["blocks"]:
                for line in block.get("lines", []):
                    chars = [c for span in line["spans"] for c in span["chars"]]
                    text = "".join(c["c"] for c in chars)
                    if text.strip() and valid_bbox(line["bbox"], pages[-1]):
                        regions.append(
                            Region(
                                document_id=document_id,
                                page_index=i,
                                text=text,
                                bbox=list(line["bbox"]),
                                granularity="step",
                                source="native",
                                evidence={
                                    "characters": [
                                        {"text": c["c"], "bbox": list(c["bbox"])} for c in chars
                                    ]
                                },
                            )
                        )
                        # Character IDs are selectable evidence; do not guess which repeated glyph was intended.
                        for c in chars:
                            if c["c"].strip() and valid_bbox(c["bbox"], pages[-1]):
                                regions.append(
                                    Region(
                                        document_id=document_id,
                                        page_index=i,
                                        text=c["c"],
                                        bbox=list(c["bbox"]),
                                        granularity="symbol",
                                        source="native",
                                        evidence={},
                                    )
                                )
            if len(regions) > 60000:
                raise HTTPException(422, "PDF contains too much text for this upload limit")
        doc = Document(
            id=document_id,
            course_id=course_id,
            owner_id=user_id,
            kind=kind,
            storage_key=f"{course_id}/{document_id}.pdf",
            pages=pages,
            sha256=hashlib.sha256(raw).hexdigest(),
            byte_size=len(raw),
        )
        storage.put(doc.storage_key, raw)
        try:
            db.add(doc)
            db.flush()
            db.add_all(regions)
            db.flush()
        except Exception:
            storage.remove(doc.storage_key)
            raise
        return doc


def render(doc, page_index):
    if not 0 <= page_index < len(doc.pages):
        raise HTTPException(404, "Page not found")
    with fitz.open(stream=storage.get(doc.storage_key), filetype="pdf") as pdf:
        page = pdf[page_index]
        page.set_rotation(0)
        return page.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), alpha=False).tobytes("png")


def point_from_region(doc, region):
    x0, y0, x1, y1 = region.bbox
    return {
        "document_revision_id": doc.id,
        "page_index": region.page_index,
        "x": (x0 + x1) / 2,
        "y": (y0 + y1) / 2,
        "units": "pt",
        "coordinate_space": "pymupdf_unrotated",
        "target_granularity": region.granularity,
        "placement_source": "evidence",
        "relationship": "at",
    }
