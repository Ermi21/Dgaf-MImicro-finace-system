"""Internal bot<->backend channel.

This is deliberately NOT part of the public Mini App auth flow
(app/core/security.py's initData HMAC check). The bot process already
knows a `telegram_id` is genuine - it only ever learns one from a real
Telegram Bot API update, delivered over HTTPS directly from Telegram's
servers to our own polling/webhook process, which is not something a
client in a browser can spoof. What this endpoint protects against is a
DIFFERENT caller (not our bot) hitting it to probe who's an admin - hence
the shared-secret header instead of a public/unauthenticated route.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.repositories.admin_repository import AdminRepository
from app.repositories.user_repository import UserRepository

router = APIRouter(prefix="/bot", tags=["bot-internal"])


class ActorStatus(BaseModel):
    telegram_id: int
    is_admin: bool
    role_name: str | None = None
    is_active: bool = True
    language: str = "en"


async def _verify_bot_token(
    x_bot_service_token: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    if not x_bot_service_token or x_bot_service_token != settings.bot_service_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bot service token"
        )


@router.get("/actor-status/{telegram_id}", response_model=ActorStatus)
async def resolve_actor_status(
    telegram_id: int,
    _: None = Depends(_verify_bot_token),
    session: AsyncSession = Depends(get_db),
) -> ActorStatus:
    admin = await AdminRepository(session).get_by_telegram_id(telegram_id)
    if admin:
        return ActorStatus(
            telegram_id=telegram_id,
            is_admin=True,
            role_name=admin.role.name,
            is_active=admin.is_active,
        )

    user = await UserRepository(session).get_by_telegram_id(telegram_id)
    return ActorStatus(
        telegram_id=telegram_id,
        is_admin=False,
        is_active=True,
        language=user.language if user else "en",
    )


class LanguageUpdateRequest(BaseModel):
    language: str


@router.patch("/users/{telegram_id}/language")
async def update_user_language(
    telegram_id: int,
    payload: LanguageUpdateRequest,
    _: None = Depends(_verify_bot_token),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Used by the bot's own 'Language' menu button. A no-op (not an
    error) if the user hasn't registered yet - there's no row to persist
    to, and the bot keeps its own ephemeral override for that case."""
    user = await UserRepository(session).get_by_telegram_id(telegram_id)
    if user:
        user.language = payload.language
        return {"persisted": True}
    return {"persisted": False}
