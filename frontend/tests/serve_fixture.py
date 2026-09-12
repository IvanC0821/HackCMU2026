"""Isolated real API for browser tests; never uses the developer's database or tokens."""

import json
import os
import socket
import sys
import tempfile
from pathlib import Path

repo = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo / "backend"))

with tempfile.TemporaryDirectory(prefix="verity-browser-") as tmp:
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{tmp}/test.db",
            "STORAGE_DIR": f"{tmp}/documents",
            "CORS_ORIGINS": json.dumps([sys.argv[1]]),
            "EXTERNAL_AI_ENABLED": "false",
            "LOCAL_TOKENS_ENABLED": "true",
            "OPENAI_API_KEY": "",
            "S3_BUCKET": "",
            "JWT_ISSUER": "",
            "JWT_AUDIENCE": "",
            "JWT_JWKS_URL": "",
        }
    )
    import uvicorn
    from verity.api import app
    from verity.auth import issue_token
    from verity.db import Base, SessionLocal, engine
    from verity.models import User

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        staff = User(
            email="teacher@example.test",
            name='<img src=x onerror="window.unsafe=true">',
            role="instructor",
        )
        student = User(email="student@example.test", name="Student", role="student")
        db.add_all([staff, student])
        db.flush()
        credentials = {
            "staff": issue_token(db, staff),
            "student": issue_token(db, student),
        }
        db.commit()
    import base64

    import pymupdf

    with pymupdf.open() as pdf:
        page = pdf.new_page()
        page.insert_text(
            (70, 100), "n=1: 1=1. Assume the claim for k+1, so it holds for k+1."
        )
        encoded_pdf = base64.b64encode(pdf.tobytes()).decode()
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    print(
        json.dumps(
            {
                "origin": f"http://127.0.0.1:{port}",
                "tokens": credentials,
                "pdf": encoded_pdf,
            }
        ),
        flush=True,
    )
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="error")
