"""Thin HTTP client to the backend. The bot never decides who is an
admin or what they can do - it always asks the backend, which is the
single source of truth (see spec section 4: 'Telegram handlers must be
thin... do not place business logic inside Telegram handlers')."""

from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.config import Settings


@dataclass
class ActorStatus:
    telegram_id: int
    is_admin: bool
    role_name: str | None
    is_active: bool
    language: str


class BackendClient:
    def __init__(self, settings: Settings):
        self._base_url = settings.backend_api_base_url.rstrip("/")
        self._bot_service_token = settings.bot_service_token

    async def get_actor_status(self, telegram_id: int) -> ActorStatus:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self._base_url}/api/v1/bot/actor-status/{telegram_id}",
                headers={"X-Bot-Service-Token": self._bot_service_token},
            )
        response.raise_for_status()
        data = response.json()
        return ActorStatus(
            telegram_id=data["telegram_id"],
            is_admin=data["is_admin"],
            role_name=data.get("role_name"),
            is_active=data["is_active"],
            language=data.get("language", "en"),
        )

    async def update_language(self, telegram_id: int, language: str) -> None:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.patch(
                f"{self._base_url}/api/v1/bot/users/{telegram_id}/language",
                headers={"X-Bot-Service-Token": self._bot_service_token},
                json={"language": language},
            )
