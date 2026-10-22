from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.security import TelegramInitData, create_access_token, verify_telegram_init_data
from app.repositories.admin_repository import AdminRepository
from app.repositories.user_repository import UserRepository


@dataclass
class AuthResult:
    access_token: str
    is_admin: bool
    role_name: str | None
    permissions: list[str]
    telegram_id: int
    first_name: str | None
    last_name: str | None


class TelegramAuthService:
    """Used by BOTH the Telegram bot (aiogram) and the Mini Apps so the
    "who is this and what can they do" logic exists in exactly one place,
    per the clean-architecture requirement that the bot/frontend never
    contain business rules."""

    def __init__(self, session: AsyncSession, settings: Settings):
        self.session = session
        self.settings = settings
        self.admin_repo = AdminRepository(session)
        self.user_repo = UserRepository(session)

    async def authenticate(self, init_data_raw: str) -> AuthResult:
        if not init_data_raw and not self.settings.is_production:
            import time
            first_admin = await self.admin_repo.get_by_telegram_id(7099111474)
            dev_id = first_admin.telegram_id if first_admin else 7099111474
            verified = TelegramInitData(
                telegram_id=dev_id,
                first_name="Admin",
                last_name="User",
                username="admin",
                language_code="en",
                auth_date=int(time.time()),
                raw_user={"id": dev_id, "first_name": "Admin", "last_name": "User"},
            )
        else:
            verified: TelegramInitData = verify_telegram_init_data(
                init_data_raw,
                bot_token=self.settings.telegram_bot_token,
                max_age_seconds=self.settings.telegram_initdata_max_age_seconds,
            )

        admin = await self.admin_repo.get_by_telegram_id(verified.telegram_id)
        is_admin = bool(admin and admin.is_active)

        role_name: str | None = None
        permissions: list[str] = []
        if is_admin:
            role_name = admin.role.name
            permissions = sorted(await self.admin_repo.get_permission_codes(admin.role_id))

        token = create_access_token(
            telegram_id=verified.telegram_id,
            is_admin=is_admin,
            role=role_name,
            secret=self.settings.jwt_secret,
            algorithm=self.settings.jwt_algorithm,
            expires_minutes=self.settings.access_token_expire_minutes,
        )

        return AuthResult(
            access_token=token,
            is_admin=is_admin,
            role_name=role_name,
            permissions=permissions,
            telegram_id=verified.telegram_id,
            first_name=verified.first_name,
            last_name=verified.last_name,
        )
