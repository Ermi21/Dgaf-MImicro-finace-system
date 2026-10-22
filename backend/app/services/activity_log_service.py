from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog
from app.repositories.activity_log_repository import ActivityLogRepository


class ActivityLogService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ActivityLogRepository(session)

    async def record(
        self,
        *,
        admin_id: uuid.UUID | None,
        action: str,
        entity_type: str,
        entity_id: str,
        old_value: dict | None = None,
        new_value: dict | None = None,
        metadata: dict | None = None,
    ) -> ActivityLog:
        log = ActivityLog(
            admin_id=admin_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
            log_metadata=metadata,
        )
        return await self.repo.add(log)
