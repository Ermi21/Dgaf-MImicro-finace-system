from __future__ import annotations

from sqlalchemy import func, select

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_telegram_id(self, telegram_id: int) -> User | None:
        result = await self.session.execute(select(User).where(User.telegram_id == telegram_id))
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        *,
        telegram_id: int,
        first_name: str,
        second_name: str,
        phone: str,
        language: str = "en",
    ) -> User:
        """Used at registration time - a User row is created lazily the
        first time someone actually submits a registration, keyed off the
        Telegram-verified id (never a client-supplied one)."""
        existing = await self.get_by_telegram_id(telegram_id)
        if existing:
            return existing
        user = User(
            telegram_id=telegram_id,
            first_name=first_name,
            second_name=second_name,
            phone=phone,
            language=language,
        )
        return await self.add(user)

    async def search(
        self, *, query: str | None, page: int, page_size: int
    ) -> tuple[list[User], int]:
        stmt = select(User)
        if query:
            like = f"%{query}%"
            stmt = stmt.where(
                (User.first_name.ilike(like))
                | (User.second_name.ilike(like))
                | (User.phone.ilike(like))
            )
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()

        page = max(page, 1)
        page_size = max(min(page_size, 100), 1)
        stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total
