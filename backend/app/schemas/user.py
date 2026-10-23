from __future__ import annotations

from app.schemas.common import TimestampedRead


class UserRead(TimestampedRead):
    telegram_id: int
    first_name: str
    second_name: str
    phone: str
    language: str
    is_active: bool
    national_id: str | None = None
    registrations_count: int = 0
