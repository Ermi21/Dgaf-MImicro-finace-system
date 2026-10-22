from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.security import create_access_token
from app.database.session import get_db
from app.permissions.constants import Permissions
from app.services.telegram_auth_service import TelegramAuthService
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(prefix="/auth", tags=["auth"])


class TelegramLoginRequest(BaseModel):
    init_data: str = Field(
        ...,
        description="The raw `window.Telegram.WebApp.initData` string from the Mini App. "
        "Never send a parsed/edited version - the signature covers the exact raw string.",
    )


class TelegramLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool
    role: str | None
    permissions: list[str]


class AdminWebLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/telegram-login", response_model=TelegramLoginResponse)
async def telegram_login(
    body: TelegramLoginRequest,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TelegramLoginResponse:
    """Validates Telegram Mini App `initData` (HMAC-signed by Telegram using
    the bot token) and, only if valid, issues a short-lived session token.
    This is the ONLY place a Telegram identity claim is accepted - every
    other endpoint requires this token instead of raw initData."""
    service = TelegramAuthService(session, settings)
    result = await service.authenticate(body.init_data)
    return TelegramLoginResponse(
        access_token=result.access_token,
        is_admin=result.is_admin,
        role=result.role_name,
        permissions=result.permissions,
    )


@router.post("/admin-web-login", response_model=TelegramLoginResponse)
async def admin_web_login(
    body: AdminWebLoginRequest,
    settings: Settings = Depends(get_settings),
) -> TelegramLoginResponse:
    """Allows administrators to log into the Admin Web Dashboard directly
    from any desktop or mobile browser using administrator credentials."""
    if (
        body.username.strip() != settings.admin_web_username.strip()
        or body.password.strip() != settings.admin_web_password.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator username or password",
        )

    all_permissions = sorted(Permissions.all())
    token = create_access_token(
        telegram_id=0,
        is_admin=True,
        role="SUPER_ADMIN",
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        expires_minutes=720,  # 12-hour web session
    )
    return TelegramLoginResponse(
        access_token=token,
        is_admin=True,
        role="SUPER_ADMIN",
        permissions=all_permissions,
    )

