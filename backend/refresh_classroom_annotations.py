"""Locate existing feedback on PDF pages without regrading or paid model calls."""

import json

from run_classroom import ROOT, provision

if __name__ == "__main__":
    provision()
    from verity.classroom_annotations import refresh_annotations
    from verity.db import SessionLocal

    with SessionLocal() as db:
        print(json.dumps(refresh_annotations(db, ROOT.parent / "demo-data/06_recorded_ai_test")))
        db.commit()
