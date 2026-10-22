from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import NotificationAudienceType, NotificationStatus

if TYPE_CHECKING:
    pass


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A notification "campaign" - one automatic event (e.g. registration
    approved) or one admin-triggered broadcast. Fan-out to individual
    users is tracked per-recipient in `NotificationRecipient`, so a bulk
    send's partial failures are visible and retryable."""

    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_status", "status"),)

    sender_admin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
    )
    audience_type: Mapped[NotificationAudienceType] = mapped_column(
        Enum(NotificationAudienceType, name="notification_audience_type", native_enum=True),
        nullable=False,
    )
    # Free-form filter used to resolve the audience at send time, e.g.
    # {"job_id": "..."} or {"city_id": "..."} or {"status": "PENDING"}.
    audience_filter: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status", native_enum=True),
        nullable=False,
        default=NotificationStatus.PENDING,
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    recipients: Mapped[list[NotificationRecipient]] = relationship(
        back_populates="notification", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Notification id={self.id} audience={self.audience_type} status={self.status}>"


class NotificationRecipient(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Per-user delivery record for a Notification, so bulk sends can be
    retried individually without resending to users who already succeeded."""

    __tablename__ = "notification_recipients"
    __table_args__ = (Index("ix_notification_recipients_status", "status"),)

    notification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_recipient_status", native_enum=True),
        nullable=False,
        default=NotificationStatus.PENDING,
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(default=0, nullable=False)

    notification: Mapped[Notification] = relationship(back_populates="recipients")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<NotificationRecipient user_id={self.user_id} status={self.status}>"
