from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    ReplyKeyboardRemove,
    WebAppInfo,
)

from app.config import Settings
from app.i18n import t
from app.keyboards.menus import admin_inline_menu
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
        role_title = status.role_name or "Admin"
        # Clear any old bottom keyboard
        await message.answer(
            f"👋 Welcome back, <b>{name}</b> ({role_title})",
            reply_markup=ReplyKeyboardRemove(),
        )
        await message.answer(
            "⚡ <b>Admin Quick Launch</b>\nTap any section below to open the Admin Console in Telegram:",
            reply_markup=admin_inline_menu(lang, settings.admin_mini_app_url),
        )
        return

    # Customer launcher: single clean button without redundant bottom keyboards
    customer_menu = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🚀 Register Now / ምዝገባ ጀምር",
                    web_app=WebAppInfo(url=settings.user_mini_app_url),
                )
            ]
        ]
    )
    # Clear any old persistent reply keyboard
    await message.answer(
        t("welcome_user", lang),
        reply_markup=ReplyKeyboardRemove(),
    )
    await message.answer(
        "💼 <b>Job Platform Mini App</b>\n"
        "Tap below to register, browse jobs, and access your profile:\n"
        "ሁሉንም አገልግሎቶች (ምዝገባ፣ ስራዎች እና ፕሮፋይል) ለማግኘት ከታች ያለውን ቁልፍ ይጫኑ፡",
        reply_markup=customer_menu,
    )
