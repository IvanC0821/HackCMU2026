"""Optional, persistent call ceiling for the publicly shared hackathon demo."""

import os
import sqlite3
from pathlib import Path


def reserve_ai_call():
    limit = int(os.environ.get("VERITY_AI_CALL_LIMIT", "0"))
    if not limit:
        return
    path = Path(os.environ["VERITY_AI_BUDGET_DB"])
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path, timeout=30) as db:
        db.execute("CREATE TABLE IF NOT EXISTS calls (id INTEGER PRIMARY KEY, at TEXT)")
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT COUNT(*) FROM calls").fetchone()[0] >= limit:
            raise RuntimeError("Demo AI request limit reached; saved results remain available")
        db.execute("INSERT INTO calls (at) VALUES (datetime('now'))")


def demo_retries(default):
    return 0 if int(os.environ.get("VERITY_AI_CALL_LIMIT", "0")) else default
