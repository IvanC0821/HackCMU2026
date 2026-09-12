"""Refresh geometry only. Grades, TA decisions, PDF bytes and attempt history are preserved."""

import hashlib
import json
from copy import deepcopy

import pymupdf

from . import storage
from .classroom import Classroom, mutate, now
from .models import Document
from .pdf_annotations import PDFLocator, feedback_code


def refresh_annotations(db, recorded_dir=None):
    room = db.get(Classroom, "classroom")
    state = deepcopy(room.state)
    records = {}
    if recorded_dir and recorded_dir.exists():
        for path in recorded_dir.glob("*-result.json"):
            record = json.loads(path.read_text())
            records[record["rawResponseSha256"]] = record
    counts = {"line": 0, "work": 0, "part": 0, "unlocated": 0}
    for student in state["submissions"]:
        for attempt in student["attempts"]:
            descriptor = attempt.get("pdf", {})
            doc = db.get(Document, descriptor.get("remoteId"))
            if not doc or doc.course_id != room.course_id or doc.owner_id != student["id"]:
                continue
            version = next(v for v in state["versions"] if v["id"] == attempt["version"])
            record = records.get(attempt.get("assessmentMeta", {}).get("rawResponseSha256"))
            prior = {}
            if record and any(i["sha256"] == doc.sha256 for i in record["inputs"]):
                prior = {p["part_id"]: p for p in record["assessment"]["parts"]}
            raw = storage.get(doc.storage_key)
            if hashlib.sha256(raw).hexdigest() != doc.sha256:
                raise ValueError("Stored PDF differs from its document revision")
            with pymupdf.open(stream=raw, filetype="pdf") as document:
                locator = PDFLocator(document)
                for number, question in enumerate(version["questions"], 1):
                    review = attempt["questions"].get(question["id"], {})
                    for criterion in question["criteria"]:
                        result = review.get("results", {}).get(criterion["id"])
                        if not result:
                            continue
                        band = next(
                            (b for b in criterion["bands"] if b["id"] == result.get("band")), None
                        )
                        if not band or band["points"] >= criterion["max"]:
                            continue
                        source = prior.get(criterion["id"], {})
                        evidence = result.get("locationEvidence") or {
                            "quote": source.get("evidence_quote"),
                            "pageIndex": source.get("page_index"),
                        }
                        result["locationEvidence"] = evidence
                        code = feedback_code(result)
                        result["feedbackCode"] = code
                        anchor = locator.locate(
                            number,
                            criterion["id"],
                            review.get("pages", []),
                            evidence.get("quote"),
                            code,
                        )
                        result["anchor"] = anchor
                        counts[anchor["kind"] if anchor else "unlocated"] += 1
    if state != room.state:
        state["log"].append(
            {
                "at": now(),
                "actor": "PDF annotation locator",
                "action": "PDF markers refreshed",
                "detail": "Located feedback on submitted PDF text/work; grades unchanged.",
            }
        )
        mutate(db, room, state, room.revision)
    return counts
