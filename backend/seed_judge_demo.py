"""Prepare only the explicitly selected fictional judge documents, without paid calls."""

import json
import re
from copy import deepcopy
from pathlib import Path

from run_classroom import DATA, provision

SELECTION = {
    "03_graded_past_submissions": ["s06_Farid_Haddad", "s22_Victoria_Lam", "s25_Yusuf_Demir"],
    "04_ungraded_new_submissions": ["s08_Hiro_Tanaka"],
}
HINTS = {
    "1a": "Check the vector combination before expanding the dot product.",
    "1b": "Keep the scalar factor when combining the vectors, then check the norm.",
    "1c": "Check the dot product, both norms, and the units of the angle.",
    "2a": "Check the inner dimensions separately for each multiplication order.",
    "2b": "Check the dimensions and show how each output entry is formed.",
    "2c": "Distinguish the row vector from the column vector before multiplying.",
    "2d": "Check the shape of each product before calculating its entries.",
    "2e": "Use row-by-column multiplication and check each resulting entry.",
    "2f": "Check whether the dimensions allow this matrix to multiply itself.",
    "3a": "Make each row-reduction step traceable by labeling the row operation.",
    "3b": "Show the row operations and state how the free variable describes your solution.",
    "4a": "Explain what each variable measures and include its units.",
    "4b": "Keep the variable order consistent when forming the augmented matrix.",
    "4c": "Show the required elimination steps and include units in the final result.",
    "5a": "Check that the final matrix is reduced and each row operation is labeled.",
    "5b": "Explain how the pivots in your reduced matrix support the rank you report.",
    "5c": "Use consistency and free variables to justify each possible solution count.",
    "6a": "Support the independence claim and connect it to the geometric span.",
    "6b": "Show why your chosen independence test supports the geometric span.",
}


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    args = parser.parse_args()
    provision()
    from verity import classroom_hints, hint_banks
    from verity.classroom import Classroom, mutate
    from verity.classroom_annotations import refresh_annotations
    from verity.classroom_dataset import import_dataset
    from verity.db import SessionLocal
    from verity.models import Course

    with SessionLocal() as db:
        state = import_dataset(db, args.dataset, DATA / "archives", selection=SELECTION)
        db.commit()
        room = db.get(Classroom, "classroom")
        state = deepcopy(room.state)
        if state["versions"][0].get("hintBank"):
            refresh_annotations(db)
            db.commit()
            print("Fictional classroom already prepared; annotations checked")
            return
        state["course"] = "Linear Algebra · Fictional demo"
        state["instructions"] = state["instructions"].replace(
            "21-254 style, fictional course data", "fictional demo course"
        )
        state["announcement"] = (
            "Fictional homework, students, professor and grades. No real class materials."
        )
        for q in state["draft"]:
            parts = re.split(r"(?m)^\(([a-z])\)\s*", q["expected"])
            requirements = {parts[i]: parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}
            for c in q["criteria"]:
                c["label"] = f"Part ({c['id'][1:]}) — " + requirements.get(
                    c["id"][1:], q["expected"]
                )
        v = state["versions"][0]
        v["questions"] = deepcopy(state["draft"])
        v["instructions"] = state["instructions"]
        v["source"] = "fictional-reference-import"
        # Let judges start with the ungraded sample as a practice attempt.
        for student in state["submissions"]:
            if student["datasetId"] == "s08":
                student["attempts"][0]["final"] = False
        teacher = db.get(Course, room.course_id).owner_id
        bank = classroom_hints.prepare(db, room, state, teacher)
        bank.entries = [{**e, "text": HINTS[e["criterion_id"]]} for e in bank.entries]
        bank.original = {"entries": deepcopy(bank.entries)}
        bank.provenance = {
            "source": "fictional_demo_seed",
            "description": "Hints prepared from the generated grading guidelines for the fictional professor demo.",
        }
        hint_banks.approve(db, bank, bank.version, teacher)
        bank.status = "published"
        bank.version += 1
        v["hintBank"] = {"id": bank.id, "version": bank.version, "entries": deepcopy(bank.entries)}
        mutate(db, room, state, room.revision)
        db.commit()
        db.expire_all()
        refresh_annotations(db)
        db.commit()
        print(
            json.dumps(
                {
                    "students": len(state["submissions"]),
                    "graded_examples": len(state["documents"]["examples"]),
                    "dataset": state["dataset"]["id"],
                    "pdfs": len(state["dataset"]["files"]),
                }
            )
        )


if __name__ == "__main__":
    main()
