from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.services.telegram_auth_service import TelegramAuthService

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
