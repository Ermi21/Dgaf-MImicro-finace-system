"""In-memory language preference for pre-registration users.

Once a user has actually registered, their `language` is stored in the
backend (`users.language`) and PATCHable via the Mini App's profile
screen - that's the durable source of truth. Before that first
registration exists, there's no user row to store a preference on, so we
keep a lightweight process-local override here. It resets on bot
restart, which is an acceptable tradeoff for a cosmetic-only setting
that affects nothing business-critical.
"""

from __future__ import annotations

_overrides: dict[int, str] = {}


def set_language(telegram_id: int, lang: str) -> None:
    _overrides[telegram_id] = lang


def get_override(telegram_id: int) -> str | None:
    return _overrides.get(telegram_id)
