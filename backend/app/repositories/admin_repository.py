from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.admin import Admin
from app.models.role import Permission, Role, RolePermission
from app.repositories.base import BaseRepository


class AdminRepository(BaseRepository[Admin]):
    model = Admin

    async def get_by_telegram_id(self, telegram_id: int) -> Admin | None:
        result = await self.session.execute(
            select(Admin).options(selectinload(Admin.role)).where(Admin.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def get_permission_codes(self, role_id) -> set[str]:
        result = await self.session.execute(
            select(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == role_id)
        )
        return set(result.scalars().all())

    async def list_with_roles(self) -> list[Admin]:
        result = await self.session.execute(select(Admin).options(selectinload(Admin.role)))
        return list(result.scalars().all())


class RoleRepository(BaseRepository[Role]):
    model = Role

    async def get_by_name(self, name: str) -> Role | None:
        result = await self.session.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()
