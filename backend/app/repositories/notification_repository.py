from __future__ import annotations

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.models.enums import NotificationStatus
from app.models.notification import Notification, NotificationRecipient
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    model = Notification

    async def get_with_recipients(self, id_: uuid.UUID) -> Notification | None:
        result = await self.session.execute(
            select(Notification)
            .options(selectinload(Notification.recipients))
            .where(Notification.id == id_)
        )
        return result.scalar_one_or_none()

    async def list_recent(self, limit: int = 50) -> list[Notification]:
        result = await self.session.execute(
            select(Notification).order_by(Notification.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

    async def counts_by_status(self) -> dict[str, int]:
        result = await self.session.execute(
            select(Notification.status, func.count()).group_by(Notification.status)
        )
        return {status.value: count for status, count in result.all()}

    async def delete_by_id(self, id_: uuid.UUID | str) -> bool:
        try:
            parsed_id = id_ if isinstance(id_, uuid.UUID) else uuid.UUID(str(id_))
        except (ValueError, TypeError):
            return False
        await self.session.execute(
            delete(NotificationRecipient).where(NotificationRecipient.notification_id == parsed_id)
        )
        res = await self.session.execute(
            delete(Notification).where(Notification.id == parsed_id)
        )
        await self.session.flush()
        return (res.rowcount or 0) > 0

    async def clear_all(self) -> int:
        await self.session.execute(delete(NotificationRecipient))
        res = await self.session.execute(delete(Notification))
        await self.session.flush()
        return res.rowcount or 0




class NotificationRecipientRepository(BaseRepository[NotificationRecipient]):
    model = NotificationRecipient

    async def list_pending_for_notification(
        self, notification_id: uuid.UUID
    ) -> list[NotificationRecipient]:
        result = await self.session.execute(
            select(NotificationRecipient).where(
                NotificationRecipient.notification_id == notification_id,
                NotificationRecipient.status == NotificationStatus.PENDING,
            )
        )
        return list(result.scalars().all())

    async def counts_for_notification(self, notification_id: uuid.UUID) -> dict[str, int]:
        result = await self.session.execute(
            select(NotificationRecipient.status, func.count())
            .where(NotificationRecipient.notification_id == notification_id)
            .group_by(NotificationRecipient.status)
        )
        return {status.value: count for status, count in result.all()}

    async def list_for_user(self, user_id: uuid.UUID, *, limit: int = 50):
        """A user's own notification history (used by the 'Notifications'
        menu item in the User Mini App)."""
        result = await self.session.execute(
            select(NotificationRecipient)
            .options(selectinload(NotificationRecipient.notification))
            .where(NotificationRecipient.user_id == user_id)
            .order_by(NotificationRecipient.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
