from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.enums import (
    EmploymentType,
    NotificationAudienceType,
    NotificationStatus,
    RegistrationStatus,
)
from app.schemas.common import TimestampedRead


class NotificationCreate(BaseModel):
    audience_type: NotificationAudienceType
    message: str = Field(..., min_length=1, max_length=4096)

    # Only the field relevant to `audience_type` needs to be set; the
    # service layer validates this pairing (see NotificationService).
    user_id: UUID | None = None
    job_id: UUID | None = None
    city_id: UUID | None = None
    subcity_id: UUID | None = None
    woreda_id: UUID | None = None
    employment_type: EmploymentType | None = None
    registration_status: RegistrationStatus | None = None

    @field_validator("message")
    @classmethod
    def _strip_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Notification message cannot be blank")
        return v


class NotificationRead(TimestampedRead):
    audience_type: NotificationAudienceType
    message: str
    status: NotificationStatus
    sent_at: datetime | None
    failure_reason: str | None
    recipient_count: int = 0
    sent_count: int = 0
    failed_count: int = 0
