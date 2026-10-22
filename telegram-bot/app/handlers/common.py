from __future__ import annotations

from aiogram import F, Router
from aiogram.types import Message

from app.config import Settings
from app.i18n import t
from app.services.backend_client import BackendClient
from app.services.language_store import get_override

router = Router(name="common")

_HELP_LABELS = {t("menu_help", "en"), t("menu_help", "am")}


@router.message(F.text.in_(_HELP_LABELS))
async def handle_help(message: Message, settings: Settings) -> None:
    telegram_id = message.from_user.id
    client = BackendClient(settings)
    status = await client.get_actor_status(telegram_id)

    lang = get_override(telegram_id) or status.language or "en"
    key = "help_admin" if status.is_admin else "help_user"
    await message.answer(t(key, lang))
