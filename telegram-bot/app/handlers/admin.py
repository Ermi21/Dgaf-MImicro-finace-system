from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from app.config import Settings
from app.i18n import t
from app.services.backend_client import BackendClient
from app.services.language_store import get_override

router = Router(name="admin")


@router.message(Command("whoami"))
async def handle_whoami(message: Message, settings: Settings) -> None:
    telegram_id = message.from_user.id
    client = BackendClient(settings)
    status = await client.get_actor_status(telegram_id)
    lang = get_override(telegram_id) or status.language or "en"

    if not status.is_admin:
        await message.answer(t("welcome_user", lang))
        return

    state = "active" if status.is_active else "DEACTIVATED"
    await message.answer(f"Telegram ID: {telegram_id}\nRole: {status.role_name}\nStatus: {state}")
