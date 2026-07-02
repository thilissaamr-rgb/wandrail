"""Authentification légère par jeton HMAC pour l'API Wandrail."""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


TOKEN_TTL_SECONDS = 24 * 60 * 60
TOKEN_SECRET = os.getenv("AUTH_SECRET", "wandrail-local-development-secret")
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    iterations = 310_000
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        if stored.startswith("pbkdf2_sha256$"):
            _, iterations, salt, expected = stored.split("$", 3)
            rounds = int(iterations)
        else:
            salt, expected = stored.split(":", 1)
            rounds = 100_000
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), rounds)
        return secrets.compare_digest(actual.hex(), expected)
    except (TypeError, ValueError):
        return False


def _encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def create_access_token(user_id: int) -> str:
    payload = json.dumps(
        {"sub": user_id, "exp": int(time.time()) + TOKEN_TTL_SECONDS},
        separators=(",", ":"),
    ).encode()
    encoded = _encode(payload)
    signature = hmac.new(TOKEN_SECRET.encode(), encoded.encode(), hashlib.sha256).digest()
    return f"{encoded}.{_encode(signature)}"


def decode_access_token(token: str) -> int:
    try:
        encoded, supplied_signature = token.split(".", 1)
        expected_signature = hmac.new(
            TOKEN_SECRET.encode(), encoded.encode(), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(_decode(supplied_signature), expected_signature):
            raise ValueError("signature")
        payload = json.loads(_decode(encoded))
        if int(payload["exp"]) < int(time.time()):
            raise ValueError("expired")
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="Session invalide ou expiree") from None


def current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> int:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentification requise")
    return decode_access_token(credentials.credentials)
