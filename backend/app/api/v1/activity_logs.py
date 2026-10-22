from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import AuthContext, require_permission
from app.database.session import get_db
from app.permissions.constants import Permissions
from app.repositories.activity_log_repository import ActivityLogRepository
from app.schemas.activity_log import ActivityLogRead

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])


@router.get("", response_model=list[ActivityLogRead])
async def list_activity_logs(
    entity_type: str | None = None,
    admin_id: UUID | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    actor: AuthContext = Depends(require_permission(Permissions.ACTIVITY_LOG_VIEW)),
    session: AsyncSession = Depends(get_db),
):
    repo = ActivityLogRepository(session)
    return await repo.list_recent(
        entity_type=entity_type, admin_id=admin_id, limit=limit, offset=offset
    )
