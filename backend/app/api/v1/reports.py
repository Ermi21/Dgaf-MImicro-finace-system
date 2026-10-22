from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import AuthContext, require_permission
from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.models.enums import RegistrationStatus
from app.models.job import Job
from app.models.location import City
from app.models.registration import Registration
from app.models.user import User
from app.permissions.constants import Permissions
from app.repositories.notification_repository import NotificationRepository
from app.services.registration_service import RegistrationService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard")
async def dashboard(
    actor: AuthContext = Depends(require_permission(Permissions.DASHBOARD_VIEW)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    reg_service = RegistrationService(session, settings)
    status_counts = await reg_service.dashboard_counts()

    total_users = (await session.execute(select(func.count()).select_from(User))).scalar_one()
    active_jobs = (
        await session.execute(select(func.count()).select_from(Job).where(Job.is_active.is_(True)))
    ).scalar_one()
    active_cities = (
        await session.execute(
            select(func.count()).select_from(City).where(City.is_active.is_(True))
        )
    ).scalar_one()
    total_registrations = sum(status_counts.values())

    notification_counts = await NotificationRepository(session).counts_by_status()

    return {
        "total_users": total_users,
        "total_registrations": total_registrations,
        "pending_registrations": status_counts.get(RegistrationStatus.PENDING.value, 0),
        "approved_registrations": status_counts.get(RegistrationStatus.APPROVED.value, 0),
        "rejected_registrations": status_counts.get(RegistrationStatus.REJECTED.value, 0),
        "suspended_registrations": status_counts.get(RegistrationStatus.SUSPENDED.value, 0),
        "cancelled_registrations": status_counts.get(RegistrationStatus.CANCELLED.value, 0),
        "active_jobs": active_jobs,
        "active_cities": active_cities,
        "notifications_sent": notification_counts.get("SENT", 0),
        "notifications_failed": notification_counts.get("FAILED", 0),
        "notifications_pending": notification_counts.get("PENDING", 0),
    }


@router.get("/registrations")
async def registration_trends(
    actor: AuthContext = Depends(require_permission(Permissions.REPORT_VIEW)),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Registrations grouped by job and by city - the two breakdowns
    called out explicitly in spec section 10 ("Job statistics",
    "Location statistics")."""
    by_job = await session.execute(
        select(Job.name, func.count(Registration.id))
        .join(Registration, Registration.job_id == Job.id)
        .group_by(Job.name)
        .order_by(func.count(Registration.id).desc())
    )
    by_city = await session.execute(
        select(City.name, func.count(Registration.id))
        .join(Registration, Registration.city_id == City.id)
        .group_by(City.name)
        .order_by(func.count(Registration.id).desc())
    )
    return {
        "by_job": [{"job": name, "count": count} for name, count in by_job.all()],
        "by_city": [{"city": name, "count": count} for name, count in by_city.all()],
    }
