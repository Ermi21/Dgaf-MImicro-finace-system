from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import AuthContext, get_current_actor, require_permission
from app.core.config import Settings, get_settings
from app.database.session import get_db, session_scope
from app.permissions.constants import Permissions
from app.repositories.notification_repository import (
    NotificationRecipientRepository,
    NotificationRepository,
)
from app.schemas.notification import NotificationCreate, NotificationRead
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


async def _dispatch_in_background(notification_id: UUID, bot_token: str) -> None:
    # Uses its own session internally (see NotificationService.dispatch) -
    # deliberately does NOT reuse the request's session, since it keeps
    # running after the HTTP response has already been sent.
    async with session_scope() as session:
        service = NotificationService(session, bot_token)
        await service.dispatch(notification_id)


@router.post("", response_model=NotificationRead, status_code=201)
async def send_notification(
    payload: NotificationCreate,
    background_tasks: BackgroundTasks,
    actor: AuthContext = Depends(require_permission(Permissions.NOTIFICATION_SEND)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> NotificationRead:
    service = NotificationService(session, settings.telegram_bot_token)
    notification = await service.create_targeted_notification(
        sender_admin_id=UUID(actor.admin_id),
        audience_type=payload.audience_type,
        message=payload.message,
        user_id=payload.user_id,
        job_id=payload.job_id,
        city_id=payload.city_id,
        subcity_id=payload.subcity_id,
        woreda_id=payload.woreda_id,
        employment_type=payload.employment_type,
        registration_status=payload.registration_status,
    )
    # Bulk delivery happens after the response is sent, in a bounded,
    # rate-limited loop - never blocking this request or the bot's own
    # event loop (spec section 16).
    background_tasks.add_task(_dispatch_in_background, notification.id, settings.telegram_bot_token)

    return NotificationRead(
        id=notification.id,
        created_at=notification.created_at,
        updated_at=notification.updated_at,
        audience_type=notification.audience_type,
        message=notification.message,
        status=notification.status,
        sent_at=notification.sent_at,
        failure_reason=notification.failure_reason,
    )


class MyNotificationItem(BaseModel):
    id: str
    message: str
    status: str
    sent_at: datetime | None = None
    created_at: datetime


@router.get("/me", response_model=list[MyNotificationItem])
async def list_my_notifications(
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
) -> list[MyNotificationItem]:
    from app.repositories.user_repository import UserRepository

    user = await UserRepository(session).get_by_telegram_id(actor.telegram_id)
    if not user:
        return []

    recipients = await NotificationRecipientRepository(session).list_for_user(user.id)
    return [
        MyNotificationItem(
            id=str(r.id),
            message=r.notification.message,
            status=r.status.value,
            sent_at=r.sent_at,
            created_at=r.created_at,
        )
        for r in recipients
    ]


@router.get("", response_model=list[NotificationRead])
async def list_notifications(
    actor: AuthContext = Depends(require_permission(Permissions.NOTIFICATION_VIEW)),
    session: AsyncSession = Depends(get_db),
) -> list[NotificationRead]:
    repo = NotificationRepository(session)
    recipient_repo = NotificationRecipientRepository(session)
    notifications = await repo.list_recent()

    results = []
    for n in notifications:
        counts = await recipient_repo.counts_for_notification(n.id)
        results.append(
            NotificationRead(
                id=n.id,
                created_at=n.created_at,
                updated_at=n.updated_at,
                audience_type=n.audience_type,
                message=n.message,
                status=n.status,
                sent_at=n.sent_at,
                failure_reason=n.failure_reason,
                recipient_count=sum(counts.values()),
                sent_count=counts.get("SENT", 0),
                failed_count=counts.get("FAILED", 0),
            )
        )
    return results
