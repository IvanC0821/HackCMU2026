"""Local-only demo launcher. The real API/database remains separate."""

import argparse
import base64
import json
import os
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"


def session_allowed(host, origin, content_type, port):
    allowed_hosts = {f"localhost:{port}", f"127.0.0.1:{port}"}
    return (
        host in allowed_hosts
        and origin == f"http://{host}"
        and content_type.split(";", 1)[0].strip().lower() == "application/json"
    )


def main():
    parser = argparse.ArgumentParser(description="Run the one-click sample homework website")
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--api-port", type=int, default=8001)
    args = parser.parse_args()

    def stop(*_):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, stop)
    if (
        not all(1024 <= p <= 65535 for p in [args.port, args.api_port])
        or args.port == args.api_port
    ):
        parser.error("Choose two different ports between 1024 and 65535")
    # Fail before any provisioning if a requested port is already in use.
    for port in [args.port, args.api_port]:
        with socket.socket() as sock:
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                parser.error(
                    f"Port {port} is busy; stop its development server or select another port"
                )
    with tempfile.TemporaryDirectory(prefix="verity-guided-") as tmp:
        os.environ.update(
            {
                "DATABASE_URL": f"sqlite:///{tmp}/demo.db",
                "STORAGE_DIR": f"{tmp}/documents",
                "CORS_ORIGINS": json.dumps(
                    [f"http://localhost:{args.port}", f"http://127.0.0.1:{args.port}"]
                ),
                "EXTERNAL_AI_ENABLED": "false",
                "OPENAI_API_KEY": "",
                "ZAI_API_KEY": "",
                "S3_BUCKET": "",
                "LOCAL_TOKENS_ENABLED": "true",
                "JWT_ISSUER": "",
                "JWT_AUDIENCE": "",
                "JWT_JWKS_URL": "",
            }
        )
        from verity.auth import issue_token
        from verity.db import Base, SessionLocal, engine
        from verity.models import User

        Base.metadata.create_all(engine)
        with SessionLocal() as db:
            staff = User(
                email="sample-teacher@example.test", name="Sample teacher", role="instructor"
            )
            student = User(
                email="sample-student@example.test", name="Sample student", role="student"
            )
            db.add_all([staff, student])
            db.flush()
            identities = {"staff": staff.id, "student": student.id}
            db.commit()
        assets = {
            "homework_pdf": base64.b64encode(
                (FRONTEND / "output/pdf/sample-homework.pdf").read_bytes()
            ).decode(),
            "answer_key_pdf": base64.b64encode(
                (FRONTEND / "output/pdf/sample-answer-key.pdf").read_bytes()
            ).decode(),
            "rubric": json.loads((FRONTEND / "__debug__/sample-rubric.json").read_text()),
        }
        api_origin = f"http://127.0.0.1:{args.api_port}"
        session_lock = threading.Lock()

        class Handler(SimpleHTTPRequestHandler):
            def __init__(self, *a, **kw):
                super().__init__(*a, directory=str(FRONTEND), **kw)

            def end_headers(self):
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                super().end_headers()

            def do_GET(self):
                if self.headers.get("Host") not in {
                    f"localhost:{args.port}",
                    f"127.0.0.1:{args.port}",
                }:
                    self.send_error(403)
                    return
                if self.path == "/__debug__/session":
                    self.send_error(405)
                    return
                super().do_GET()

            def do_POST(self):
                if self.path != "/__debug__/session":
                    self.send_error(404)
                    return
                if not session_allowed(
                    self.headers.get("Host", ""),
                    self.headers.get("Origin", ""),
                    self.headers.get("Content-Type", ""),
                    args.port,
                ):
                    self.send_error(403)
                    return
                if self.headers.get("Content-Length") != "2" or self.rfile.read(2) != b"{}":
                    self.send_error(400)
                    return
                with session_lock, SessionLocal() as db:
                    tokens = {
                        role: issue_token(db, db.get(User, uid)) for role, uid in identities.items()
                    }
                    db.commit()
                payload = json.dumps(
                    {"demo": True, "api_origin": api_origin, "tokens": tokens, **assets}
                ).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            def log_message(self, *_):
                pass

        api = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "verity.api:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(args.api_port),
                "--log-level",
                "warning",
            ],
            cwd=ROOT / "backend",
        )
        server = None
        try:
            for _ in range(100):
                if api.poll() is not None:
                    raise RuntimeError("Demo API exited during startup")
                try:
                    with urlopen(api_origin + "/health/ready", timeout=1) as response:
                        if response.status == 200:
                            break
                except OSError:
                    time.sleep(0.1)
            else:
                raise RuntimeError("Demo API did not become ready")
            server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
            print(f"Sample website ready: http://localhost:{args.port}/__debug__/", flush=True)
            print(
                "Click Run sample homework. No tokens or AI keys needed. Ctrl+C stops the demo.",
                flush=True,
            )
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            if server:
                server.server_close()
            api.terminate()
            try:
                api.wait(timeout=10)
            except subprocess.TimeoutExpired:
                api.kill()
                api.wait()
            engine.dispose()


if __name__ == "__main__":
    main()
