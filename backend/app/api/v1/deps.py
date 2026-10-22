"""Shared FastAPI dependencies for the v1 API.

Auth model
----------
1. The Mini App calls POST /api/v1/auth/telegram-login once per session
   with the raw Telegram `initData` string. The backend validates the
   HMAC signature there (app.core.security.verify_telegram_init_data)
   and, if valid, issues a short-lived internal session JWT that encodes
   ONLY the verified `telegram_id`.
2. Every subsequent request sends that JWT as `Authorization: Bearer ...`.
   `get_current_actor` below decodes it and then re-reads the admin's
   role/permissions from the database fresh on every request - so a
   permission change a Super Admin makes mid-session takes effect
   immediately, and nothing about authorization is ever trusted from
   client-supplied data.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import AuthenticationError
from app.core.security import decode_access_token
from app.database.session import get_db
from app.repositories.admin_repository import AdminRepository
from app.repositories.user_repository import UserRepository


@dataclass
class AuthContext:
    telegram_id: int
    is_admin: bool
    admin_id: str | None = None
    role_name: str | None = None
    permissions: set[str] = field(default_factory=set)
    user_id: str | None = None

    def has_permission(self, code: str) -> bool:
        return self.is_admin and code in self.permissions


async def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )
    return authorization.split(" ", 1)[1].strip()


async def get_current_actor(
    token: str = Depends(get_bearer_token),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthContext:
    try:
        payload = decode_access_token(
            token, secret=settings.jwt_secret, algorithm=settings.jwt_algorithm
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    telegram_id = int(payload["telegram_id"])

    admin_repo = AdminRepository(session)
    admin = await admin_repo.get_by_telegram_id(telegram_id)

    if admin and admin.is_active:
        permission_codes = await admin_repo.get_permission_codes(admin.role_id)
        return AuthContext(
            telegram_id=telegram_id,
            is_admin=True,
            admin_id=str(admin.id),
            role_name=admin.role.name,
            permissions=permission_codes,
        )

    user_repo = UserRepository(session)
    user = await user_repo.get_by_telegram_id(telegram_id)
    return AuthContext(
        telegram_id=telegram_id,
        is_admin=False,
        user_id=str(user.id) if user else None,
    )


def require_permission(code: str):
    """Dependency factory: `Depends(require_permission(Permissions.JOB_CREATE))`."""

    async def _checker(actor: AuthContext = Depends(get_current_actor)) -> AuthContext:
        if not actor.has_permission(code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {code}",
            )
        return actor

    return _checker


async def require_active_admin(actor: AuthContext = Depends(get_current_actor)) -> AuthContext:
    if not actor.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return actor
