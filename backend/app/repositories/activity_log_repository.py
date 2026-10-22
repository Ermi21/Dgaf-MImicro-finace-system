from __future__ import annotations

from sqlalchemy import select

from app.models.activity_log import ActivityLog
from app.repositories.base import BaseRepository


class ActivityLogRepository(BaseRepository[ActivityLog]):
    model = ActivityLog

    async def list_recent(
        self,
        *,
        entity_type: str | None = None,
        admin_id=None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ActivityLog]:
        stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc())
        if entity_type:
            stmt = stmt.where(ActivityLog.entity_type == entity_type)
        if admin_id:
            stmt = stmt.where(ActivityLog.admin_id == admin_id)
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # No update() or delete() methods exist on this repository by design -
    # activity logs are append-only (see spec section 19).
