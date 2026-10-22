from __future__ import annotations

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from app.i18n import t


def _webapp_url(base_url: str, view: str) -> str:
    # Telegram requires HTTPS Mini App URLs in production; base_url should
    # already be the deployed HTTPS origin (see .env.example).
    return f"{base_url}?view={view}"


def _webapp_button(label: str, base_url: str, view: str) -> KeyboardButton:
    return KeyboardButton(text=label, web_app=WebAppInfo(url=_webapp_url(base_url, view)))


def _inline_webapp_button(label: str, base_url: str, view: str) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=label, web_app=WebAppInfo(url=_webapp_url(base_url, view)))


def user_menu(lang: str, user_mini_app_url: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [_webapp_button(t("menu_register", lang), user_mini_app_url, "register")],
            [
                _webapp_button(t("menu_profile", lang), user_mini_app_url, "profile"),
                _webapp_button(t("menu_registration", lang), user_mini_app_url, "registrations"),
            ],
            [_webapp_button(t("menu_notifications", lang), user_mini_app_url, "notifications")],
            [
                KeyboardButton(text=t("menu_language", lang)),
                KeyboardButton(text=t("menu_help", lang)),
            ],
        ],
        resize_keyboard=True,
    )


def admin_inline_menu(lang: str, admin_mini_app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [_inline_webapp_button(t("menu_dashboard", lang), admin_mini_app_url, "dashboard")],
            [
                _inline_webapp_button(
                    t("menu_registrations", lang), admin_mini_app_url, "registrations"
                ),
                _inline_webapp_button(t("menu_users", lang), admin_mini_app_url, "users"),
            ],
            [
                _inline_webapp_button(t("menu_jobs", lang), admin_mini_app_url, "jobs"),
                _inline_webapp_button(t("menu_locations", lang), admin_mini_app_url, "locations"),
            ],
            [
                _inline_webapp_button(
                    t("menu_notifications", lang), admin_mini_app_url, "notifications"
                ),
                _inline_webapp_button(t("menu_reports", lang), admin_mini_app_url, "reports"),
            ],
            [
                _inline_webapp_button(
                    t("menu_activity_logs", lang), admin_mini_app_url, "activity-logs"
                )
            ],
            [
                _inline_webapp_button(
                    t("menu_admin_management", lang),
                    admin_mini_app_url,
                    "admin-management",
                )
            ],
        ]
    )


def language_choice_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="English"), KeyboardButton(text="አማርኛ")]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
