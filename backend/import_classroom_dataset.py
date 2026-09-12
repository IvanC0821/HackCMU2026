"""Import all supplied PDFs; optional bounded paid test, never a public API route."""

import argparse
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

from run_classroom import DATA, ROOT, provision


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--replay-recorded",
        action="store_true",
        help="Replay the published synthetic AI results without paid calls",
    )
    mode.add_argument(
        "--grade-new", action="store_true", help="Explicitly run at most two paid AI assessments"
    )
    args = parser.parse_args()
    provision()
    from verity.classroom_dataset import import_dataset
    from verity.classroom_pilot import apply_assessment, assess, compare_hidden, grading_context
    from verity.db import SessionLocal
    from verity.models import uid

    root = ROOT.parent / "demo-data"
    with SessionLocal() as db:
        state = import_dataset(db, root, DATA / "archives")
        db.commit()
        pending = {
            s["datasetId"]
            for s in state["submissions"]
            if s["attempts"][0].get("assessmentSource") == "pending"
        }
        print(
            json.dumps(
                {
                    "pdfs": len(state["dataset"]["files"]),
                    "students": len(state["submissions"]),
                    "pending": sorted(pending),
                }
            ),
            flush=True,
        )
    if args.replay_recorded:
        for path in sorted((root / "06_recorded_ai_test").glob("*-result.json")):
            result = json.loads(path.read_text())
            if result["studentId"] not in pending:
                continue
            result["recorded"] = True
            with SessionLocal() as db:
                apply_assessment(db, root, result)
                db.commit()
            print(f"Replayed recorded AI result: {result['name']} {result['score']}/40", flush=True)
        return
    if not args.grade_new or not pending:
        return
    context = grading_context(root)
    folder = DATA / "pilot-runs" / uid()
    results, failures = [], []
    targets = [
        p
        for p in sorted((root / "04_ungraded_new_submissions").iterdir())
        if p.is_dir() and p.name.split("_")[0] in pending
    ]
    if len(targets) > 2:
        raise ValueError("Pilot is capped at two requests")
    print(f"Running {len(targets)} real assessments; output: {folder}", flush=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(assess, root, target, context, folder): target for target in targets}
        for future in as_completed(futures):
            target = futures[future]
            try:
                result = future.result()
                with SessionLocal() as db:
                    # Read the current revision only after the paid request finishes.
                    apply_assessment(db, root, result)
                    db.commit()
                results.append(result)
                print(
                    json.dumps(
                        {
                            "student": result["name"],
                            "score": result["score"],
                            "seconds": result["elapsedSeconds"],
                        }
                    ),
                    flush=True,
                )
            except Exception as exc:
                # Do not dump provider exceptions that may contain sensitive request content.
                failures.append({"student": target.name, "errorType": type(exc).__name__})
                print(json.dumps(failures[-1]), flush=True)
    comparison = compare_hidden(root, results)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "comparison.json").write_text(
        json.dumps({"results": comparison, "failures": failures}, indent=2)
    )
    print(json.dumps({"comparison": comparison, "failures": failures}, indent=2), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
