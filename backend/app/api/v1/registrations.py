from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import AuthContext, get_current_actor, require_permission
from app.core.config import Settings, get_settings
from app.core.exceptions import PermissionDeniedError
from app.database.session import get_db
from app.models.enums import EmploymentType, Gender, ReferralType, RegistrationStatus
from app.models.registration import Registration
from app.permissions.constants import Permissions
from app.schemas.common import Page
from app.schemas.registration import (
    MyRegistrationItem,
    RegistrationApproveRequest,
    RegistrationCreate,
    RegistrationFilter,
    RegistrationListItem,
    RegistrationNotifyRequest,
    RegistrationRead,
    RegistrationRejectRequest,
)
from app.services.registration_service import RegistrationService

router = APIRouter(prefix="/registrations", tags=["registrations"])


def _to_list_item(reg: Registration) -> RegistrationListItem:
    admin_name = reg.referral_admin.name if getattr(reg, "referral_admin", None) else None
    return RegistrationListItem(
        id=reg.id,
        created_at=reg.created_at,
        updated_at=reg.updated_at,
        status=reg.status,
        employment_type=reg.employment_type,
        gender=reg.gender,
        sex=reg.gender,
        national_id=reg.national_id,
        document_name=reg.document_name,
        employer_name=reg.employer_name,
        business_name=reg.business_name,
        employment_details=reg.employment_details,
        referral_type=reg.referral_type,
        referral_name=reg.referral_name,
        referral_admin_id=reg.referral_admin_id,
        referral_admin_name=admin_name,
        user_first_name=reg.user.first_name,
        user_second_name=reg.user.second_name,
        user_phone=reg.user.phone,
        job_name=reg.job.name,
        city_name=reg.city.name,
        subcity_name=reg.subcity.name,
        woreda_name=reg.woreda.name,
    )


# ----------------------------------------------------------------------
# Job seeker facing
# ----------------------------------------------------------------------


@router.post("", response_model=RegistrationRead, status_code=201)
async def create_registration(
    payload: RegistrationCreate,
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Registration:
    service = RegistrationService(session, settings)
    registration = await service.create_registration(telegram_id=actor.telegram_id, payload=payload)
    return await service.get_registration_or_raise(registration.id)


@router.get("/me", response_model=list[MyRegistrationItem])
async def list_my_registrations(
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> list[MyRegistrationItem]:
    service = RegistrationService(session, settings)
    regs = await service.list_own_registrations(telegram_id=actor.telegram_id)
    return [
        MyRegistrationItem(
            id=r.id,
            created_at=r.created_at,
            updated_at=r.updated_at,
            status=r.status,
            employment_type=r.employment_type,
            gender=r.gender,
            sex=r.gender,
            national_id=r.national_id,
            referral_type=r.referral_type,
            referral_name=r.referral_name,
            rejection_reason=r.rejection_reason,
            job_name=r.job.name,
            city_name=r.city.name,
            subcity_name=r.subcity.name,
            woreda_name=r.woreda.name,
        )
        for r in regs
    ]


# ----------------------------------------------------------------------
# Admin facing
# ----------------------------------------------------------------------


@router.get("", response_model=Page[RegistrationListItem])
async def search_registrations(
    registration_id: UUID | None = None,
    name: str | None = None,
    phone: str | None = None,
    status: RegistrationStatus | None = None,
    job_id: UUID | None = None,
    city_id: UUID | None = None,
    subcity_id: UUID | None = None,
    woreda_id: UUID | None = None,
    employment_type: EmploymentType | None = None,
    gender: Gender | None = None,
    referral_type: ReferralType | None = None,
    referrer_name: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    actor: AuthContext = Depends(require_permission(Permissions.REGISTRATION_VIEW)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Page[RegistrationListItem]:
    filters = RegistrationFilter(
        registration_id=registration_id,
        name=name,
        phone=phone,
        status=status,
        job_id=job_id,
        city_id=city_id,
        subcity_id=subcity_id,
        woreda_id=woreda_id,
        employment_type=employment_type,
        gender=gender,
        referral_type=referral_type,
        referrer_name=referrer_name,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    service = RegistrationService(session, settings)
    items, total = await service.search(filters)
    return Page.create(
        items=[_to_list_item(r) for r in items], total=total, page=page, page_size=page_size
    )


@router.get("/{registration_id}", response_model=RegistrationRead)
async def get_registration(
    registration_id: UUID,
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Registration:
    service = RegistrationService(session, settings)
    if actor.is_admin:
        if not actor.has_permission(Permissions.REGISTRATION_VIEW):
            raise PermissionDeniedError("Missing permission: registration.view")
        return await service.get_registration_or_raise(registration_id)
    return await service.get_own_registration_or_raise(
        registration_id, telegram_id=actor.telegram_id
    )


@router.post("/{registration_id}/approve", response_model=RegistrationRead)
async def approve_registration(
    registration_id: UUID,
    body: RegistrationApproveRequest | None = None,
    actor: AuthContext = Depends(require_permission(Permissions.REGISTRATION_APPROVE)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Registration:
    service = RegistrationService(session, settings)
    admin_id = UUID(actor.admin_id) if actor.admin_id else None
    custom_msg = body.message if body else None
    await service.approve(registration_id, admin_id=admin_id, message=custom_msg)
    return await service.get_registration_or_raise(registration_id)


@router.post("/{registration_id}/notify", response_model=dict)
async def notify_registration_applicant(
    registration_id: UUID,
    body: RegistrationNotifyRequest,
    actor: AuthContext = Depends(require_permission(Permissions.NOTIFICATION_SEND)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    service = RegistrationService(session, settings)
    registration = await service.get_registration_or_raise(registration_id)
    notif = await service.notifications.notify_registration_event(
        user_id=registration.user_id,
        message=body.message.strip(),
    )
    try:
        await service.notifications.dispatch(notif.id)
    except Exception:
        pass
    return {"status": "success", "message": "Notification dispatched to applicant"}


@router.post("/{registration_id}/reject", response_model=RegistrationRead)
async def reject_registration(
    registration_id: UUID,
    body: RegistrationRejectRequest,
    actor: AuthContext = Depends(require_permission(Permissions.REGISTRATION_REJECT)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Registration:
    service = RegistrationService(session, settings)
    admin_id = UUID(actor.admin_id) if actor.admin_id else None
    await service.reject(registration_id, admin_id=admin_id, reason=body.reason)
    return await service.get_registration_or_raise(registration_id)


@router.post("/{registration_id}/suspend", response_model=RegistrationRead)
async def suspend_registration(
    registration_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.REGISTRATION_SUSPEND)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Registration:
    service = RegistrationService(session, settings)
    admin_id = UUID(actor.admin_id) if actor.admin_id else None
    await service.suspend(registration_id, admin_id=admin_id)
    return await service.get_registration_or_raise(registration_id)


@router.post("/{registration_id}/resume", response_model=RegistrationRead)
async def resume_registration(
    registration_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.REGISTRATION_APPROVE)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Registration:
    service = RegistrationService(session, settings)
    admin_id = UUID(actor.admin_id) if actor.admin_id else None
    await service.resume(registration_id, admin_id=admin_id)
    return await service.get_registration_or_raise(registration_id)


@router.post("/{registration_id}/reset-to-pending", response_model=RegistrationRead)
async def reset_registration_to_pending(
    registration_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.REGISTRATION_APPROVE)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Registration:
    service = RegistrationService(session, settings)
    admin_id = UUID(actor.admin_id) if actor.admin_id else None
    await service.reset_to_pending(registration_id, admin_id=admin_id)
    return await service.get_registration_or_raise(registration_id)


@router.delete(
    "/{registration_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_registration(
    registration_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.REGISTRATION_REJECT)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    """Permanently remove a REJECTED or CANCELLED registration.
    The record must be rejected or cancelled before it can be deleted."""
    service = RegistrationService(session, settings)
    admin_id = UUID(actor.admin_id) if actor.admin_id else None
    await service.delete_registration(registration_id, admin_id=admin_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


