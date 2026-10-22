from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import TimestampedRead


class JobCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=5000)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Job name cannot be blank")
        return v


class JobUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=5000)


class JobRead(TimestampedRead):
    name: str
    description: str | None
    is_active: bool
