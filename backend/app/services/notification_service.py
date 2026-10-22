from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationFailedError
from app.core.logging import get_logger
from app.database.base import utcnow
from app.database.session import session_scope
from app.integrations.telegram_client import TelegramClient, TelegramPermanentError
from app.models.enums import (
    EmploymentType,
    NotificationAudienceType,
    NotificationStatus,
    RegistrationStatus,
)
from app.models.notification import Notification, NotificationRecipient
from app.models.registration import Registration
from app.models.user import User
from app.repositories.notification_repository import (
    NotificationRecipientRepository,
    NotificationRepository,
)

logger = get_logger(__name__)

# Minimum delay between individual sends within one bulk campaign, to stay
# comfortably under Telegram's per-bot rate limits (~30 msg/sec globally,
# lower per-chat). Tune via system_settings in a future iteration.
_SEND_INTERVAL_SECONDS = 0.05
_MAX_RETRY_COUNT = 3


class NotificationService:
    def __init__(self, session: AsyncSession, bot_token: str):
        self.session = session
        self.bot_token = bot_token
        self.repo = NotificationRepository(session)
        self.recipient_repo = NotificationRecipientRepository(session)

    # ------------------------------------------------------------------
    # Automatic, single-user notifications (registration lifecycle events)
    # ------------------------------------------------------------------

    async def notify_registration_event(self, *, user_id: uuid.UUID, message: str) -> Notification:
        notification = Notification(
            sender_admin_id=None,
            audience_type=NotificationAudienceType.INDIVIDUAL,
            audience_filter={"user_id": str(user_id)},
            message=message,
            status=NotificationStatus.PENDING,
        )
        notification = await self.repo.add(notification)
        recipient = NotificationRecipient(notification_id=notification.id, user_id=user_id)
        await self.recipient_repo.add(recipient)
        return notification

    # ------------------------------------------------------------------
    # Admin-targeted notifications
    # ------------------------------------------------------------------

    async def resolve_audience(
        self,
        *,
        audience_type: NotificationAudienceType,
        user_id: uuid.UUID | None,
        job_id: uuid.UUID | None,
        city_id: uuid.UUID | None,
        subcity_id: uuid.UUID | None,
        woreda_id: uuid.UUID | None,
        employment_type: EmploymentType | None,
        registration_status: RegistrationStatus | None,
    ) -> list[uuid.UUID]:
        """Returns the list of User ids matching the requested audience."""
        if audience_type == NotificationAudienceType.INDIVIDUAL:
            if not user_id:
                raise ValidationFailedError("user_id is required for an INDIVIDUAL notification")
            return [user_id]

        if audience_type == NotificationAudienceType.ALL_USERS:
            result = await self.session.execute(select(User.id).where(User.is_active.is_(True)))
            return list(result.scalars().all())

        # The remaining audience types all resolve through registrations,
        # since job/city/subcity/woreda/employment_type/status are
        # properties of a Registration, not of a User directly.
        stmt = (
            select(Registration.user_id)
            .distinct()
            .join(User, User.id == Registration.user_id)
            .where(User.is_active.is_(True))
        )

        if audience_type == NotificationAudienceType.BY_JOB:
            if not job_id:
                raise ValidationFailedError("job_id is required for a BY_JOB notification")
            stmt = stmt.where(Registration.job_id == job_id)
        elif audience_type == NotificationAudienceType.BY_CITY:
            if not city_id:
                raise ValidationFailedError("city_id is required for a BY_CITY notification")
            stmt = stmt.where(Registration.city_id == city_id)
        elif audience_type == NotificationAudienceType.BY_SUBCITY:
            if not subcity_id:
                raise ValidationFailedError("subcity_id is required for a BY_SUBCITY notification")
            stmt = stmt.where(Registration.subcity_id == subcity_id)
        elif audience_type == NotificationAudienceType.BY_WOREDA:
            if not woreda_id:
                raise ValidationFailedError("woreda_id is required for a BY_WOREDA notification")
            stmt = stmt.where(Registration.woreda_id == woreda_id)
        elif audience_type == NotificationAudienceType.BY_EMPLOYMENT_TYPE:
            if not employment_type:
                raise ValidationFailedError(
                    "employment_type is required for a BY_EMPLOYMENT_TYPE notification"
                )
            stmt = stmt.where(Registration.employment_type == employment_type)
        elif audience_type == NotificationAudienceType.BY_REGISTRATION_STATUS:
            if not registration_status:
                raise ValidationFailedError(
                    "registration_status is required for a BY_REGISTRATION_STATUS notification"
                )
            stmt = stmt.where(Registration.status == registration_status)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_targeted_notification(
        self,
        *,
        sender_admin_id: uuid.UUID,
        audience_type: NotificationAudienceType,
        message: str,
        user_id: uuid.UUID | None = None,
        job_id: uuid.UUID | None = None,
        city_id: uuid.UUID | None = None,
        subcity_id: uuid.UUID | None = None,
        woreda_id: uuid.UUID | None = None,
        employment_type: EmploymentType | None = None,
        registration_status: RegistrationStatus | None = None,
    ) -> Notification:
        user_ids = await self.resolve_audience(
            audience_type=audience_type,
            user_id=user_id,
            job_id=job_id,
            city_id=city_id,
            subcity_id=subcity_id,
            woreda_id=woreda_id,
            employment_type=employment_type,
            registration_status=registration_status,
        )
        if not user_ids:
            raise ValidationFailedError("No users match the selected notification audience")

        audience_filter = {
            k: str(v)
            for k, v in {
                "user_id": user_id,
                "job_id": job_id,
                "city_id": city_id,
                "subcity_id": subcity_id,
                "woreda_id": woreda_id,
                "employment_type": employment_type.value if employment_type else None,
                "registration_status": registration_status.value if registration_status else None,
            }.items()
            if v is not None
        }

        notification = Notification(
            sender_admin_id=sender_admin_id,
            audience_type=audience_type,
            audience_filter=audience_filter,
            message=message,
            status=NotificationStatus.PENDING,
        )
        notification = await self.repo.add(notification)

        for uid in user_ids:
            await self.recipient_repo.add(
                NotificationRecipient(notification_id=notification.id, user_id=uid)
            )

        return notification

    # ------------------------------------------------------------------
    # Dispatch (runs in a FastAPI BackgroundTask / worker - never on the
    # bot's own event loop, and never blocking the HTTP request that
    # created the notification).
    # ------------------------------------------------------------------

    async def dispatch(self, notification_id: uuid.UUID) -> None:
        """Send every PENDING recipient of a notification, respecting a
        fixed inter-send delay and retrying transient failures a bounded
        number of times. Uses its own DB session/transaction per
        recipient so one failure can't roll back everyone else's success.
        """
        client = TelegramClient(self.bot_token)

        async with session_scope() as session:
            recipient_repo = NotificationRecipientRepository(session)
            pending = await recipient_repo.list_pending_for_notification(notification_id)
            notification = await NotificationRepository(session).get_by_id(notification_id)
            message = notification.message if notification else ""

        for recipient in pending:
            async with session_scope() as session:
                recipient_repo = NotificationRecipientRepository(session)
                row = await recipient_repo.get_by_id(recipient.id)
                if row is None:
                    continue
                recipient_user = await session.get(User, row.user_id)
                if recipient_user is None:
                    row.status = NotificationStatus.FAILED
                    row.failure_reason = "User no longer exists"
                    continue
                try:
                    await client.send_message(recipient_user.telegram_id, message)
                    row.status = NotificationStatus.SENT
                    row.sent_at = utcnow()
                except TelegramPermanentError as exc:
                    row.status = NotificationStatus.FAILED
                    row.failure_reason = str(exc)[:1000]
                    logger.info("notification_permanent_failure", recipient_id=str(row.id))
                except Exception as exc:  # transient, after tenacity's own retries are exhausted
                    row.retry_count += 1
                    if row.retry_count >= _MAX_RETRY_COUNT:
                        row.status = NotificationStatus.FAILED
                        row.failure_reason = f"Gave up after {row.retry_count} attempts: {exc}"[
                            :1000
                        ]
                    logger.warning(
                        "notification_transient_failure",
                        recipient_id=str(row.id),
                        retry_count=row.retry_count,
                    )

            await asyncio.sleep(_SEND_INTERVAL_SECONDS)

        async with session_scope() as session:
            counts = await NotificationRecipientRepository(session).counts_for_notification(
                notification_id
            )
            notification = await NotificationRepository(session).get_by_id(notification_id)
            if notification is None:
                return
            total = sum(counts.values())
            sent = counts.get(NotificationStatus.SENT.value, 0)
            failed = counts.get(NotificationStatus.FAILED.value, 0)
            still_pending = total - sent - failed
            if still_pending > 0:
                notification.status = NotificationStatus.PENDING
            elif failed > 0 and sent == 0:
                notification.status = NotificationStatus.FAILED
                notification.failure_reason = f"All {failed} recipient(s) failed"
            else:
                notification.status = NotificationStatus.SENT
                notification.sent_at = utcnow()
