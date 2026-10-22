from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationFailedError
from app.models.admin import Admin
from app.models.role import Permission, Role, RolePermission
from app.permissions.constants import Permissions
from app.repositories.admin_repository import AdminRepository, RoleRepository
from app.services.activity_log_service import ActivityLogService


class AdminManagementService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.admins = AdminRepository(session)
        self.roles = RoleRepository(session)
        self.activity_log = ActivityLogService(session)

    async def list_admins(self) -> list[Admin]:
        return await self.admins.list_with_roles()

    async def create_admin(
        self, *, telegram_id: int, name: str, role_id: uuid.UUID, created_by: uuid.UUID
    ) -> Admin:
        existing = await self.admins.get_by_telegram_id(telegram_id)
        if existing:
            raise ValidationFailedError("An administrator with this Telegram ID already exists")
        role = await self.roles.get_by_id(role_id)
        if not role:
            raise NotFoundError("Role not found")

        admin = Admin(telegram_id=telegram_id, name=name, role_id=role_id, is_active=True)
        admin = await self.admins.add(admin)

        await self.activity_log.record(
            admin_id=created_by,
            action="admin.created",
            entity_type="admin",
            entity_id=str(admin.id),
            new_value={"telegram_id": telegram_id, "role": role.name},
        )
        return admin

    async def update_admin(
        self,
        admin_id: uuid.UUID,
        *,
        name: str | None,
        role_id: uuid.UUID | None,
        is_active: bool | None,
        updated_by: uuid.UUID,
    ) -> Admin:
        admin = await self.admins.get_by_id(admin_id)
        if not admin:
            raise NotFoundError("Admin not found")

        old_value = {
            "name": admin.name,
            "role_id": str(admin.role_id),
            "is_active": admin.is_active,
        }

        if name is not None:
            admin.name = name
        if role_id is not None:
            if not await self.roles.get_by_id(role_id):
                raise NotFoundError("Role not found")
            admin.role_id = role_id
        if is_active is not None:
            admin.is_active = is_active

        await self.activity_log.record(
            admin_id=updated_by,
            action="admin.updated",
            entity_type="admin",
            entity_id=str(admin.id),
            old_value=old_value,
            new_value={
                "name": admin.name,
                "role_id": str(admin.role_id),
                "is_active": admin.is_active,
            },
        )
        return admin

    async def list_roles(self) -> list[Role]:
        return await self.roles.list_all()

    async def get_role_permissions(self, role_id: uuid.UUID) -> list[str]:
        return sorted(await self.admins.get_permission_codes(role_id))

    async def set_role_permissions(
        self, role_id: uuid.UUID, *, permission_codes: list[str], updated_by: uuid.UUID
    ) -> list[str]:
        role = await self.roles.get_by_id(role_id)
        if not role:
            raise NotFoundError("Role not found")

        invalid = set(permission_codes) - set(Permissions.all())
        if invalid:
            raise ValidationFailedError(f"Unknown permission code(s): {', '.join(sorted(invalid))}")

        old_codes = sorted(await self.admins.get_permission_codes(role_id))

        await self.session.execute(delete(RolePermission).where(RolePermission.role_id == role_id))

        result = await self.session.execute(
            select(Permission).where(Permission.code.in_(permission_codes))
        )
        permissions_by_code = {p.code: p for p in result.scalars().all()}

        missing = set(permission_codes) - set(permissions_by_code.keys())
        for code in missing:
            perm = Permission(code=code)
            self.session.add(perm)
            await self.session.flush()
            permissions_by_code[code] = perm

        for code in permission_codes:
            self.session.add(
                RolePermission(role_id=role_id, permission_id=permissions_by_code[code].id)
            )

        await self.activity_log.record(
            admin_id=updated_by,
            action="role.permissions_updated",
            entity_type="role",
            entity_id=str(role_id),
            old_value={"permissions": old_codes},
            new_value={"permissions": sorted(permission_codes)},
        )
        return sorted(permission_codes)
