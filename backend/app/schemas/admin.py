from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import TimestampedRead


class AdminCreate(BaseModel):
    telegram_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=2, max_length=150)
    role_id: UUID


class AdminUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    role_id: UUID | None = None
    is_active: bool | None = None


class AdminRead(TimestampedRead):
    telegram_id: int
    name: str
    role_id: UUID
    role_name: str
    is_active: bool


class RoleRead(TimestampedRead):
    name: str
    description: str | None
    permissions: list[str] = []


class RolePermissionsUpdate(BaseModel):
    permission_codes: list[str]
