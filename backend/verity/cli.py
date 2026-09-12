"""Local administrator provisioning; access to this CLI implies database-admin access."""

import argparse
import json

from sqlalchemy import select

from .auth import issue_token
from .db import SessionLocal
from .models import User
from .schemas import UserIn


def main():
    parser = argparse.ArgumentParser(description="Provision users and development tokens")
    parser.add_argument("email")
    parser.add_argument("--name", required=True)
    parser.add_argument("--role", choices=["admin", "instructor", "student"], default="student")
    parser.add_argument("--external-subject")
    parser.add_argument("--token-hours", type=int, default=24)
    args = parser.parse_args()
    if not 1 <= args.token_hours <= 168:
        parser.error("Token lifetime must be between 1 and 168 hours")
    body = UserIn(
        email=args.email, name=args.name, role=args.role, external_subject=args.external_subject
    )
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == body.email))
        if not user:
            user = User(**body.model_dump())
            db.add(user)
            db.flush()
        elif user.role != body.role or user.external_subject != body.external_subject:
            parser.error("Existing user has a different role or external subject; no changes made")
        token = issue_token(db, user, args.token_hours)
        db.commit()
        print(
            json.dumps(
                {
                    "user_id": user.id,
                    "role": user.role,
                    "token": token,
                    "expires_in_hours": args.token_hours,
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    main()
