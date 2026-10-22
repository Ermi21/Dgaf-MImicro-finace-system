from __future__ import annotations

from sqlalchemy import select

from app.models.job import Job
from app.repositories.base import BaseRepository


class JobRepository(BaseRepository[Job]):
    model = Job

    async def list_active(self) -> list[Job]:
        result = await self.session.execute(select(Job).where(Job.is_active.is_(True)))
        return list(result.scalars().all())

    async def search(self, *, query: str | None, include_inactive: bool) -> list[Job]:
        stmt = select(Job)
        if not include_inactive:
            stmt = stmt.where(Job.is_active.is_(True))
        if query:
            stmt = stmt.where(Job.name.ilike(f"%{query}%"))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
