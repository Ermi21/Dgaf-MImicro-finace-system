"""Security primitives.

Two distinct concerns live here, and they must not be confused:

1. Telegram Mini App `initData` validation (`verify_telegram_init_data`) -
   this is how we PROVE a request really came from a given Telegram user.
   It uses HMAC-SHA256 exactly as specified by Telegram, keyed off the
   bot token. This is the ONLY source of truth for "who is this user".
   The frontend's claimed user id/name/etc. are NEVER trusted directly.

2. Internal, short-lived session JWTs (`create_access_token` /
   `decode_access_token`) - issued by OUR backend after (1) succeeds, so
   the Mini App doesn't have to resend/re-validate raw initData on every
   single API call within a session. These tokens only ever encode data
   WE already validated (telegram_id, is_admin, role) - never raw
   frontend input.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

import jwt

from app.core.exceptions import AuthenticationError


@dataclass(frozen=True)
class TelegramInitData:
    telegram_id: int
    first_name: str | None
    last_name: str | None
    username: str | None
    language_code: str | None
    auth_date: int
    raw_user: dict


def verify_telegram_init_data(
    init_data: str,
    bot_token: str,
    max_age_seconds: int,
) -> TelegramInitData:
    """Validate the `initData` string sent by a Telegram Mini App.

    Algorithm (per Telegram docs):
      1. Parse the query-string-like payload.
      2. Remove `hash`, sort remaining key=value pairs, join with '\n'.
      3. secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
      4. expected_hash = HMAC_SHA256(key=secret_key, data=data_check_string)
      5. Compare `expected_hash` to the provided `hash` (constant time).
      6. Reject if `auth_date` is too old (replay protection).

    Raises AuthenticationError on any failure. Never raises a bare
    exception that would leak parsing internals to the caller.
    """
    if not init_data:
        raise AuthenticationError("Missing Telegram init data")

    try:
        pairs = parse_qsl(init_data, strict_parsing=True)
    except ValueError as exc:
        raise AuthenticationError("Malformed Telegram init data") from exc

    data = dict(pairs)
    provided_hash = data.pop("hash", None)
    if not provided_hash:
        raise AuthenticationError("Telegram init data missing hash")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_hash, provided_hash):
        raise AuthenticationError("Telegram init data signature verification failed")

    try:
        auth_date = int(data.get("auth_date", "0"))
    except ValueError as exc:
        raise AuthenticationError("Invalid auth_date in Telegram init data") from exc

    if auth_date <= 0:
        raise AuthenticationError("Invalid auth_date in Telegram init data")

    if time.time() - auth_date > max_age_seconds:
        raise AuthenticationError("Telegram init data has expired")

    try:
        user_payload = json.loads(data.get("user", "{}"))
    except json.JSONDecodeError as exc:
        raise AuthenticationError("Malformed Telegram user payload") from exc

    telegram_id = user_payload.get("id")
    if telegram_id is None:
        raise AuthenticationError("Telegram init data missing user id")

    return TelegramInitData(
        telegram_id=int(telegram_id),
        first_name=user_payload.get("first_name"),
        last_name=user_payload.get("last_name"),
        username=user_payload.get("username"),
        language_code=user_payload.get("language_code"),
        auth_date=auth_date,
        raw_user=user_payload,
    )


def create_access_token(
    *,
    telegram_id: int,
    is_admin: bool,
    role: str | None,
    secret: str,
    algorithm: str,
    expires_minutes: int,
) -> str:
    """Issue a short-lived internal session token from already-validated data."""
    now = int(time.time())
    payload = {
        "sub": str(telegram_id),
        "telegram_id": telegram_id,
        "is_admin": is_admin,
        "role": role,
        "iat": now,
        "exp": now + expires_minutes * 60,
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_access_token(token: str, *, secret: str, algorithm: str) -> dict:
    try:
        return jwt.decode(token, secret, algorithms=[algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise AuthenticationError("Session expired, please reopen the Mini App") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError("Invalid session token") from exc
