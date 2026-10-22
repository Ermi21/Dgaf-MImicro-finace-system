from __future__ import annotations

from aiogram import F, Router
from aiogram.types import Message

from app.config import Settings
from app.i18n import t
from app.keyboards.menus import language_choice_keyboard, user_menu
from app.services.backend_client import BackendClient
from app.services.language_store import get_override, set_language

router = Router(name="user_menu")

_LANGUAGE_LABELS = {t("menu_language", "en"), t("menu_language", "am")}


def _current_lang(telegram_id: int, tg_language_code: str | None) -> str:
    override = get_override(telegram_id)
    if override:
        return override
    if tg_language_code and tg_language_code.startswith("am"):
        return "am"
    return "en"


@router.message(F.text.in_(_LANGUAGE_LABELS))
async def handle_language_prompt(message: Message) -> None:
    lang = _current_lang(message.from_user.id, message.from_user.language_code)
    await message.answer(t("choose_language", lang), reply_markup=language_choice_keyboard())


@router.message(F.text.in_({"English", "አማርኛ"}))
async def handle_language_choice(message: Message, settings: Settings) -> None:
    telegram_id = message.from_user.id
    lang = "en" if message.text == "English" else "am"
    set_language(telegram_id, lang)

    client = BackendClient(settings)
    await client.update_language(telegram_id, lang)

    await message.answer(
        t("language_set", lang),
        reply_markup=user_menu(lang, settings.user_mini_app_url),
    )
