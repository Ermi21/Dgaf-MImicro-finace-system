from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import AuthContext, get_current_actor, require_permission, require_active_admin
from app.core.exceptions import NotFoundError
from app.database.session import get_db
from app.models.user import User
from app.permissions.constants import Permissions
from app.repositories.user_repository import UserRepository
from app.services.activity_log_service import ActivityLogService
from app.schemas.common import Page
from app.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["users"])


class LanguageUpdate(BaseModel):
    language: str = Field(..., pattern="^(en|am)$")


@router.get("", response_model=Page[UserRead])
async def search_users(
    q: str | None = Query(default=None, description="Search by name, phone or national ID"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    actor: AuthContext = Depends(require_permission(Permissions.USER_VIEW)),
    session: AsyncSession = Depends(get_db),
) -> Page[UserRead]:
    items, total = await UserRepository(session).search(query=q, page=page, page_size=page_size)
    user_reads: list[UserRead] = []
    for u in items:
        nat_id = None
        if hasattr(u, "registrations") and u.registrations:
            for r in u.registrations:
                if r.national_id:
                    nat_id = r.national_id
                    break
        user_reads.append(
            UserRead(
                id=u.id,
                telegram_id=u.telegram_id,
                first_name=u.first_name,
                second_name=u.second_name,
                phone=u.phone,
                language=u.language,
                is_active=u.is_active,
                national_id=nat_id,
                registrations_count=len(u.registrations) if hasattr(u, "registrations") and u.registrations else 0,
                created_at=u.created_at,
                updated_at=u.updated_at,
            )
        )
    return Page.create(items=user_reads, total=total, page=page, page_size=page_size)


@router.get("/me", response_model=UserRead)
async def get_my_profile(
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
) -> UserRead:
    user = await UserRepository(session).get_by_telegram_id(actor.telegram_id)
    if not user:
        raise NotFoundError("No profile yet - submit a registration first to create your profile.")
    return user


@router.patch("/me", response_model=UserRead)
async def update_my_language(
    payload: LanguageUpdate,
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
) -> UserRead:
    user = await UserRepository(session).get_by_telegram_id(actor.telegram_id)
    if not user:
        raise NotFoundError("No profile yet - submit a registration first to create your profile.")
    user.language = payload.language
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_user(
    user_id: UUID,
    actor: AuthContext = Depends(require_active_admin),
    session: AsyncSession = Depends(get_db),
) -> Response:
    """Permanently delete a customer/user from the system along with all their
    associated registrations and notifications."""
    user = await session.get(User, user_id)
    if not user:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    admin_id = UUID(actor.admin_id) if actor.admin_id else None
    try:
        activity_log = ActivityLogService(session)
        await activity_log.record(
            admin_id=admin_id,
            action="user.deleted",
            entity_type="user",
            entity_id=str(user_id),
            old_value={"name": f"{user.first_name} {user.second_name}", "phone": user.phone},
            new_value=None,
        )
    except Exception:
        pass

    # Clean up associated records explicitly before removing user
    from sqlalchemy import delete
    from app.models.notification import NotificationRecipient
    from app.models.registration import Registration

    await session.execute(
        delete(NotificationRecipient).where(NotificationRecipient.user_id == user_id)
    )
    await session.execute(
        delete(Registration).where(Registration.user_id == user_id)
    )
    await session.delete(user)
    await session.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

