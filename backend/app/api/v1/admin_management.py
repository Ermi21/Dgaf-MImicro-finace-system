from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import AuthContext, require_permission
from app.database.session import get_db
from app.permissions.constants import Permissions
from app.schemas.admin import (
    AdminCreate,
    AdminRead,
    AdminUpdate,
    RolePermissionsUpdate,
    RoleRead,
)
from app.services.admin_service import AdminManagementService

router = APIRouter(prefix="/admin-management", tags=["admin-management"])


def _to_admin_read(admin) -> AdminRead:
    return AdminRead(
        id=admin.id,
        created_at=admin.created_at,
        updated_at=admin.updated_at,
        telegram_id=admin.telegram_id,
        name=admin.name,
        role_id=admin.role_id,
        role_name=admin.role.name,
        is_active=admin.is_active,
    )


@router.get("/admins", response_model=list[AdminRead])
async def list_admins(
    actor: AuthContext = Depends(require_permission(Permissions.ADMIN_MANAGE)),
    session: AsyncSession = Depends(get_db),
):
    service = AdminManagementService(session)
    admins = await service.list_admins()
    return [_to_admin_read(a) for a in admins]


@router.post("/admins", response_model=AdminRead, status_code=201)
async def create_admin(
    payload: AdminCreate,
    actor: AuthContext = Depends(require_permission(Permissions.ADMIN_MANAGE)),
    session: AsyncSession = Depends(get_db),
):
    service = AdminManagementService(session)
    admin = await service.create_admin(
        telegram_id=payload.telegram_id,
        name=payload.name,
        role_id=payload.role_id,
        created_by=UUID(actor.admin_id) if actor.admin_id else None,
    )
    admin = await service.admins.get_by_telegram_id(admin.telegram_id)  # reload with role
    return _to_admin_read(admin)


@router.patch("/admins/{admin_id}", response_model=AdminRead)
async def update_admin(
    admin_id: UUID,
    payload: AdminUpdate,
    actor: AuthContext = Depends(require_permission(Permissions.ADMIN_MANAGE)),
    session: AsyncSession = Depends(get_db),
):
    service = AdminManagementService(session)
    admin = await service.update_admin(
        admin_id,
        name=payload.name,
        role_id=payload.role_id,
        is_active=payload.is_active,
        updated_by=UUID(actor.admin_id) if actor.admin_id else None,
    )
    admin = await service.admins.get_by_telegram_id(admin.telegram_id)  # reload with role
    return _to_admin_read(admin)


@router.get("/roles", response_model=list[RoleRead])
async def list_roles(
    actor: AuthContext = Depends(require_permission(Permissions.ROLE_MANAGE)),
    session: AsyncSession = Depends(get_db),
):
    service = AdminManagementService(session)
    roles = await service.list_roles()
    result = []
    for role in roles:
        permissions = await service.get_role_permissions(role.id)
        result.append(
            RoleRead(
                id=role.id,
                created_at=role.created_at,
                updated_at=role.updated_at,
                name=role.name,
                description=role.description,
                permissions=permissions,
            )
        )
    return result


@router.put("/roles/{role_id}/permissions", response_model=list[str])
async def set_role_permissions(
    role_id: UUID,
    payload: RolePermissionsUpdate,
    actor: AuthContext = Depends(require_permission(Permissions.ROLE_MANAGE)),
    session: AsyncSession = Depends(get_db),
):
    service = AdminManagementService(session)
    return await service.set_role_permissions(
        role_id,
        permission_codes=payload.permission_codes,
        updated_by=UUID(actor.admin_id) if actor.admin_id else None,
    )
