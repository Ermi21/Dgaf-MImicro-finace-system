from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.api.v1.deps import AuthContext, get_current_actor, require_permission
from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.models.admin import Admin
from app.models.enums import NotificationStatus, ReferralType, RegistrationStatus
from app.models.job import Job
from app.models.location import City
from app.models.notification import Notification, NotificationRecipient
from app.models.registration import Registration
from app.models.user import User
from app.permissions.constants import Permissions
from app.repositories.admin_repository import AdminRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.services.registration_service import RegistrationService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard")
async def dashboard(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    payout_rate: float = Query(default=100.0, ge=0),
    actor: AuthContext = Depends(require_permission(Permissions.DASHBOARD_VIEW)),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    # Base registrations query with optional date filtering
    reg_stmt = select(Registration.status, func.count(Registration.id)).group_by(Registration.status)
    if date_from:
        reg_stmt = reg_stmt.where(Registration.created_at >= date_from)
    if date_to:
        reg_stmt = reg_stmt.where(Registration.created_at <= date_to)
    reg_counts_raw = (await session.execute(reg_stmt)).all()
    status_counts = {status.value: count for status, count in reg_counts_raw}

    user_cond = []
    if date_from:
        user_cond.append(User.created_at >= date_from)
    if date_to:
        user_cond.append(User.created_at <= date_to)

    scalar_stmt = select(
        select(func.count()).select_from(User).where(*user_cond).scalar_subquery().label("total_users"),
        select(func.count()).select_from(Job).where(Job.is_active.is_(True)).scalar_subquery().label("active_jobs"),
        select(func.count()).select_from(City).where(City.is_active.is_(True)).scalar_subquery().label("active_cities"),
        select(func.count()).select_from(Notification).scalar_subquery().label("total_notifications"),
    )
    scalar_row = (await session.execute(scalar_stmt)).one()
    total_users = scalar_row.total_users or 0
    active_jobs = scalar_row.active_jobs or 0
    active_cities = scalar_row.active_cities or 0
    total_notifications = scalar_row.total_notifications or 0

    total_registrations = sum(status_counts.values())

    recip_stmt = select(
        NotificationRecipient.status, func.count(NotificationRecipient.id)
    ).group_by(NotificationRecipient.status)
    recip_counts_raw = (await session.execute(recip_stmt)).all()
    recip_counts = {status.value: count for status, count in recip_counts_raw}
    sent_recipients = recip_counts.get(NotificationStatus.SENT.value, 0)
    failed_recipients = recip_counts.get(NotificationStatus.FAILED.value, 0)
    pending_recipients = recip_counts.get(NotificationStatus.PENDING.value, 0)
    total_recipients = sum(recip_counts.values())

    total_sent = max(total_recipients, total_notifications, sent_recipients)
    total_failed = failed_recipients
    total_pending = pending_recipients

    # Referral summary
    referral_where = (
        (Registration.referral_type != ReferralType.NONE)
        & (Registration.referral_type.isnot(None))
        | (Registration.referral_name.isnot(None))
        | (Registration.referral_admin_id.isnot(None))
    )
    ref_stmt = select(
        func.count(Registration.id).label("total"),
        func.count(case((Registration.status == RegistrationStatus.APPROVED, 1))).label("approved"),
        func.count(case((Registration.status == RegistrationStatus.PENDING, 1))).label("pending"),
        func.count(case((Registration.status == RegistrationStatus.REJECTED, 1))).label("rejected"),
    ).where(referral_where)
    if date_from:
        ref_stmt = ref_stmt.where(Registration.created_at >= date_from)
    if date_to:
        ref_stmt = ref_stmt.where(Registration.created_at <= date_to)

    ref_row = (await session.execute(ref_stmt)).one()
    total_referrals = ref_row.total or 0
    approved_referrals = ref_row.approved or 0
    pending_referrals = ref_row.pending or 0
    rejected_referrals = ref_row.rejected or 0
    total_referral_payout = round(approved_referrals * payout_rate, 2)

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
        "notifications_sent": total_sent,
        "notifications_failed": total_failed,
        "notifications_pending": total_pending,
        "referral_summary": {
            "total_referrals": total_referrals,
            "approved_referrals": approved_referrals,
            "pending_referrals": pending_referrals,
            "rejected_referrals": rejected_referrals,
            "payout_rate": payout_rate,
            "total_payout": total_referral_payout,
        },
    }


@router.get("/referrals")
async def referral_performance(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    referrer_name: str | None = None,
    payout_rate: float = Query(default=100.0, ge=0),
    actor: AuthContext = Depends(require_permission(Permissions.REPORT_VIEW)),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Detailed breakdown of referrals per inviter with status and payout calculations."""
    referral_where = (
        (Registration.referral_type != ReferralType.NONE)
        & (Registration.referral_type.isnot(None))
        | (Registration.referral_name.isnot(None))
        | (Registration.referral_admin_id.isnot(None))
    )

    stmt = (
        select(Registration)
        .options(
            joinedload(Registration.user),
            joinedload(Registration.job),
            joinedload(Registration.referral_admin),
        )
        .where(referral_where)
        .order_by(Registration.created_at.desc())
    )

    if date_from:
        stmt = stmt.where(Registration.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Registration.created_at <= date_to)
    if referrer_name:
        stmt = stmt.where(Registration.referral_name.ilike(f"%{referrer_name}%"))

    registrations = list((await session.execute(stmt)).scalars().unique().all())

    # Group by referrer
    grouped: dict[str, dict] = {}
    for r in registrations:
        name = (
            (r.referral_admin.name if r.referral_admin else "Admin")
            if r.referral_type == ReferralType.ADMIN or r.referral_admin_id
            else (r.referral_name or "Unknown Inviter")
        )
        key = f"{r.referral_type.value if r.referral_type else 'PERSON'}:{name}"
        if key not in grouped:
            grouped[key] = {
                "referrer_name": name,
                "referral_type": r.referral_type.value if r.referral_type else "PERSON",
                "total_invites": 0,
                "approved_invites": 0,
                "pending_invites": 0,
                "rejected_invites": 0,
                "suspended_invites": 0,
                "total_payout": 0.0,
                "payout_rate": payout_rate,
                "customers": [],
            }

        group = grouped[key]
        group["total_invites"] += 1
        if r.status == RegistrationStatus.APPROVED:
            group["approved_invites"] += 1
        elif r.status == RegistrationStatus.PENDING:
            group["pending_invites"] += 1
        elif r.status == RegistrationStatus.REJECTED:
            group["rejected_invites"] += 1
        elif r.status == RegistrationStatus.SUSPENDED:
            group["suspended_invites"] += 1

        group["total_payout"] = round(group["approved_invites"] * payout_rate, 2)
        group["customers"].append({
            "registration_id": str(r.id),
            "customer_name": f"{r.user.first_name} {r.user.second_name}",
            "customer_phone": r.user.phone,
            "job_name": r.job.name,
            "status": r.status.value,
            "gender": r.gender.value if r.gender else None,
            "national_id": r.national_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    leaderboard = sorted(grouped.values(), key=lambda x: (x["approved_invites"], x["total_invites"]), reverse=True)

    total_referrals = len(registrations)
    approved_referrals = sum(1 for r in registrations if r.status == RegistrationStatus.APPROVED)
    pending_referrals = sum(1 for r in registrations if r.status == RegistrationStatus.PENDING)
    rejected_referrals = sum(1 for r in registrations if r.status == RegistrationStatus.REJECTED)

    return {
        "summary": {
            "total_referrals": total_referrals,
            "approved_referrals": approved_referrals,
            "pending_referrals": pending_referrals,
            "rejected_referrals": rejected_referrals,
            "payout_rate": payout_rate,
            "total_payout": round(approved_referrals * payout_rate, 2),
            "unique_referrers": len(grouped),
        },
        "referrers": leaderboard,
    }


@router.get("/registrations")
async def registration_trends(
    actor: AuthContext = Depends(require_permission(Permissions.REPORT_VIEW)),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Registrations grouped by job and by city."""
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


@router.get("/my-referrals")
async def my_referrals(
    payout_rate: float = Query(default=100.0, ge=0),
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Isolated personal referral stats for the authenticated user / inviter."""
    match_conditions = []
    user_display_name = ""
    exclude_user_ids: set[UUID] = set()

    if actor.is_admin:
        admin_repo = AdminRepository(session)
        admin = None
        if actor.admin_id:
            admin = await admin_repo.get_by_id(UUID(actor.admin_id))
        if not admin and actor.telegram_id:
            admin = await admin_repo.get_by_telegram_id(actor.telegram_id)

        if admin:
            user_display_name = admin.name
            admin_name_clean = admin.name.strip().lower()
            match_conditions.append(Registration.referral_admin_id == admin.id)
            match_conditions.append(
                (Registration.referral_type == ReferralType.ADMIN)
                & (func.lower(func.trim(Registration.referral_name)) == admin_name_clean)
            )
    else:
        user_repo = UserRepository(session)
        user = None
        if actor.user_id:
            user = await user_repo.get_by_id(UUID(actor.user_id))
        if not user and actor.telegram_id:
            user = await user_repo.get_by_telegram_id(actor.telegram_id)

        if user:
            exclude_user_ids.add(user.id)
            full_name = f"{user.first_name} {user.second_name}".strip()
            user_display_name = full_name or user.first_name

            user_matches = []
            if full_name:
                user_matches.append(
                    func.lower(func.trim(Registration.referral_name)) == full_name.lower()
                )
            if user.first_name:
                user_matches.append(
                    func.lower(func.trim(Registration.referral_name)) == user.first_name.strip().lower()
                )
            if user.phone:
                user_matches.append(
                    func.trim(Registration.referral_name) == user.phone.strip()
                )

            if user_matches:
                match_conditions.append(
                    (Registration.referral_type == ReferralType.PERSON)
                    & or_(*user_matches)
                )

    if not match_conditions:
        return {
            "summary": {
                "total_invites": 0,
                "approved_invites": 0,
                "pending_invites": 0,
                "rejected_invites": 0,
                "suspended_invites": 0,
                "payout_rate": payout_rate,
                "total_earned_payout": 0.0,
                "pending_payout": 0.0,
            },
            "user_referral_name": user_display_name,
            "customers": [],
        }

    stmt = (
        select(Registration)
        .options(
            selectinload(Registration.user),
            selectinload(Registration.job),
            selectinload(Registration.city),
            selectinload(Registration.subcity),
        )
        .where(
            (Registration.referral_type != ReferralType.NONE)
            & (Registration.referral_type.isnot(None))
            & or_(*match_conditions)
        )
        .order_by(Registration.created_at.desc())
    )

    if exclude_user_ids:
        stmt = stmt.where(Registration.user_id.notin_(exclude_user_ids))

    registrations = list((await session.execute(stmt)).scalars().unique().all())

    total_invites = len(registrations)
    approved_invites = sum(1 for r in registrations if r.status == RegistrationStatus.APPROVED)
    pending_invites = sum(1 for r in registrations if r.status == RegistrationStatus.PENDING)
    rejected_invites = sum(1 for r in registrations if r.status == RegistrationStatus.REJECTED)
    suspended_invites = sum(1 for r in registrations if r.status == RegistrationStatus.SUSPENDED)

    customers = [
        {
            "registration_id": str(r.id),
            "customer_name": f"{r.user.first_name} {r.user.second_name}",
            "customer_phone": f"{r.user.phone[:4]}***{r.user.phone[-2:]}" if len(r.user.phone) > 6 else r.user.phone,
            "job_name": r.job.name if r.job else "Unknown Job",
            "status": r.status.value,
            "city_name": r.city.name if r.city else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in registrations
    ]

    return {
        "summary": {
            "total_invites": total_invites,
            "approved_invites": approved_invites,
            "pending_invites": pending_invites,
            "rejected_invites": rejected_invites,
            "suspended_invites": suspended_invites,
            "payout_rate": payout_rate,
            "total_earned_payout": round(approved_invites * payout_rate, 2),
            "pending_payout": round(pending_invites * payout_rate, 2),
        },
        "user_referral_name": user_display_name,
        "customers": customers,
    }

