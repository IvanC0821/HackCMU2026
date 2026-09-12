"""Provision and run a loopback-only connected demo. No external model calls."""

import argparse
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "classroom"
# Set before importing backend settings. Never point this launcher at shared/demo DBs.
os.environ["DATABASE_URL"] = f"sqlite:///{DATA / 'classroom.db'}"
os.environ["STORAGE_DIR"] = str(DATA / "documents")
os.environ["S3_BUCKET"] = ""
os.environ["EXTERNAL_AI_ENABLED"] = "false"
os.environ["LOCAL_TOKENS_ENABLED"] = "true"


def provision(private=False):
    from sqlalchemy import select

    from verity.auth import issue_token
    from verity.classroom import Classroom, app
    from verity.db import Base, SessionLocal, engine
    from verity.models import Course, Membership, User

    DATA.mkdir(parents=True, exist_ok=True)
    DATA.chmod(0o700)
    Base.metadata.create_all(engine)
    access = DATA / "access-codes.json"
    # Existing codes are retained. Provision fresh codes with the core admin CLI when expired.
    codes = json.loads(access.read_text()) if private and access.exists() else {}
    with SessionLocal() as db:
        users = {}
        for role, name in [("instructor", "Professor"), ("student", "Demo student")]:
            user = db.scalar(select(User).where(User.email == f"{role}@verity.local"))
            if not user:
                user = User(email=f"{role}@verity.local", name=name, role=role)
                db.add(user)
                db.flush()
            users[role] = user
            if private and role not in codes:
                codes[role] = issue_token(db, user, hours=72)
        course = db.scalar(select(Course).where(Course.title == "Connected classroom"))
        if not course:
            course = Course(title="Connected classroom", owner_id=users["instructor"].id)
            db.add(course)
            db.flush()
            for role, user in users.items():
                db.add(Membership(course_id=course.id, user_id=user.id, role=role))
        if not db.get(Classroom, "classroom"):
            output = subprocess.check_output(
                [
                    "node",
                    "--input-type=module",
                    "-e",
                    "import {newWorkspace} from './frontend/staff/model.mjs'; process.stdout.write(JSON.stringify(newWorkspace()));",
                ],
                cwd=ROOT.parent,
                text=True,
            )
            db.add(
                Classroom(id="classroom", course_id=course.id, revision=0, state=json.loads(output))
            )
        db.commit()
        app.state.demo_users = {"teacher": users["instructor"].id, "student": users["student"].id}
        app.state.open_demo = not private
    # Provisioned access codes are local secrets, never a frontend asset or a Git file.
    if private and (not access.exists() or json.loads(access.read_text()) != codes):
        fd = os.open(access, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as handle:
            json.dump(codes, handle)
    return access


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=3004)
    parser.add_argument("--provision-only", action="store_true")
    parser.add_argument(
        "--private", action="store_true", help="Require access codes instead of open demo switching"
    )
    args = parser.parse_args()
    access = provision(private=args.private)
    if args.private:
        print(f"Access codes (private, 72 hours): {access}")
    else:
        print("OPEN DEMO: anyone who can reach this app can switch to staff. Dummy data only.")
    if not args.provision_only:
        import uvicorn

        from verity.classroom import app

        print(f"Verity: http://127.0.0.1:{args.port}/")
        uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")
