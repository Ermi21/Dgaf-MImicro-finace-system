from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import TimestampedRead


class CityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

    @field_validator("name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("City name cannot be blank")
        return v


class CityRead(TimestampedRead):
    name: str
    is_active: bool


class SubcityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    city_id: UUID


class SubcityRead(TimestampedRead):
    name: str
    city_id: UUID
    is_active: bool


class WoredaCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    subcity_id: UUID


class WoredaRead(TimestampedRead):
    name: str
    subcity_id: UUID
    is_active: bool
