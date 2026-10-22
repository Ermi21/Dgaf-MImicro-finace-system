from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import AuthContext, get_current_actor, require_permission
from app.core.exceptions import NotFoundError
from app.database.session import get_db
from app.permissions.constants import Permissions
from app.repositories.user_repository import UserRepository
from app.schemas.common import Page
from app.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["users"])


class LanguageUpdate(BaseModel):
    language: str = Field(..., pattern="^(en|am)$")


@router.get("", response_model=Page[UserRead])
async def search_users(
    q: str | None = Query(default=None, description="Search by name or phone"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    actor: AuthContext = Depends(require_permission(Permissions.USER_VIEW)),
    session: AsyncSession = Depends(get_db),
) -> Page[UserRead]:
    items, total = await UserRepository(session).search(query=q, page=page, page_size=page_size)
    return Page.create(items=items, total=total, page=page, page_size=page_size)


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
