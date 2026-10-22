from __future__ import annotations

from uuid import UUID

from app.schemas.common import TimestampedRead


class ActivityLogRead(TimestampedRead):
    admin_id: UUID | None
    action: str
    entity_type: str
    entity_id: str
    old_value: dict | None
    new_value: dict | None
    log_metadata: dict | None
