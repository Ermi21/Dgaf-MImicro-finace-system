from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Job(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A job posting a seeker can register for.

    Jobs are NEVER hard-deleted (historical registrations reference them).
    Use `is_active = False` to remove a job from the selectable list while
    keeping it intact for existing registrations/reports.
    """

    __tablename__ = "jobs"

    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
    )

    registrations: Mapped[list[Registration]] = relationship(back_populates="job")  # noqa: F821

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Job name={self.name} active={self.is_active}>"
