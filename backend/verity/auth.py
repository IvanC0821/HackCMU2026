import hashlib
import secrets
import time
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import Membership, Token, User

bearer = HTTPBearer(auto_error=False)


def issue_token(db, user, hours=24):
    raw = "vt_" + secrets.token_urlsafe(32)
    db.add(
        Token(
            user_id=user.id,
            digest=hashlib.sha256(raw.encode()).hexdigest(),
            expires_at=time.time() + hours * 3600,
        )
    )
    return raw


@lru_cache
def jwks_client(url):
    return jwt.PyJWKClient(url, timeout=5, lifespan=300)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    failure = HTTPException(
        401, "Valid bearer authentication required", headers={"WWW-Authenticate": "Bearer"}
    )
    if not credentials:
        raise failure
    token = credentials.credentials
    user = None
    cfg = settings()
    if cfg.local_tokens_enabled and token.startswith("vt_"):
        entry = db.scalar(
            select(Token).where(
                Token.digest == hashlib.sha256(token.encode()).hexdigest(),
                Token.expires_at > time.time(),
            )
        )
        if entry:
            user = db.get(User, entry.user_id)
    elif cfg.jwt_jwks_url:
        try:
            key = jwks_client(cfg.jwt_jwks_url).get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                key.key,
                algorithms=["RS256"],
                audience=cfg.jwt_audience,
                issuer=cfg.jwt_issuer,
                options={"require": ["exp", "iat", "sub", "iss", "aud"]},
            )
            user = db.scalar(select(User).where(User.external_subject == claims["sub"]))
        except (jwt.PyJWTError, ValueError):
            raise failure from None
    if not user:
        raise failure
    return user


def course_role(db, user, course_id):
    if user.role == "admin":
        return "instructor"
    member = db.scalar(
        select(Membership).where(Membership.course_id == course_id, Membership.user_id == user.id)
    )
    if not member:
        raise HTTPException(404, "Course not found")
    return member.role


def require_staff(db, user, course_id, instructor=False):
    role = course_role(db, user, course_id)
    if role not in (["instructor"] if instructor else ["instructor", "ta"]):
        raise HTTPException(
            403, "Instructor permission required" if instructor else "Staff permission required"
        )
    return role
