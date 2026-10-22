from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from app.config import Settings
from app.i18n import t
from app.keyboards.menus import admin_menu, user_menu
from app.services.backend_client import BackendClient
from app.services.language_store import get_override

router = Router(name="start")


def _resolve_language(telegram_id: int, backend_language: str, tg_language_code: str | None) -> str:
    override = get_override(telegram_id)
    if override:
        return override
    if backend_language and backend_language != "en":
        return backend_language
    if tg_language_code and tg_language_code.startswith("am"):
        return "am"
    return "en"


@router.message(CommandStart())
async def handle_start(message: Message, settings: Settings) -> None:
    telegram_id = message.from_user.id
    client = BackendClient(settings)
    status = await client.get_actor_status(telegram_id)

    lang = _resolve_language(telegram_id, status.language, message.from_user.language_code)

    if status.is_admin:
        if not status.is_active:
            await message.answer(t("account_inactive", lang))
            return
        name = message.from_user.full_name or "Admin"
        await message.answer(
            t("welcome_admin", lang, name=name, role=status.role_name or "Admin"),
            reply_markup=admin_menu(lang, settings.admin_mini_app_url),
        )
        return

    await message.answer(
        t("welcome_user", lang),
        reply_markup=user_menu(lang, settings.user_mini_app_url),
    )
