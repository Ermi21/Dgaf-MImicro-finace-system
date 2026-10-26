from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.api.v1.deps import AuthContext, get_current_actor
from app.core.config import Settings, get_settings
from app.core.security import create_access_token
from app.database.session import get_db
from app.models.system_settings import SystemSetting
from app.permissions.constants import Permissions
from app.repositories.admin_repository import AdminRepository
from app.services.activity_log_service import ActivityLogService
from app.services.telegram_auth_service import TelegramAuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return digest.hex(), salt


def verify_password(plain_password: str, stored_hash: str, salt: str) -> bool:
    computed_hash, _ = hash_password(plain_password, salt=salt)
    return hmac.compare_digest(computed_hash, stored_hash)


class TelegramLoginRequest(BaseModel):
    init_data: str = Field(
        ...,
        description="The raw `window.Telegram.WebApp.initData` string from the Mini App. "
        "Never send a parsed/edited version - the signature covers the exact raw string.",
    )


class TelegramLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool
    role: str | None
    permissions: list[str]


class AdminWebLoginRequest(BaseModel):
    username: str
    password: str


class AdminProfileResponse(BaseModel):
    username: str
    name: str
    email: str | None = None
    role: str | None = None
    is_super_admin: bool = False
    telegram_id: int = 0
    permissions: list[str] = []


class AdminProfileUpdateRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    username: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    message: str
    success: bool = True


@router.post("/telegram-login", response_model=TelegramLoginResponse)
async def telegram_login(
    body: TelegramLoginRequest,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TelegramLoginResponse:
    """Validates Telegram Mini App `initData` (HMAC-signed by Telegram using
    the bot token) and, only if valid, issues a short-lived session token.
    This is the ONLY place a Telegram identity claim is accepted - every
    other endpoint requires this token instead of raw initData."""
    service = TelegramAuthService(session, settings)
    result = await service.authenticate(body.init_data)
    return TelegramLoginResponse(
        access_token=result.access_token,
        is_admin=result.is_admin,
        role=result.role_name,
        permissions=result.permissions,
    )


@router.post("/admin-web-login", response_model=TelegramLoginResponse)
async def admin_web_login(
    body: AdminWebLoginRequest,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TelegramLoginResponse:
    """Allows administrators to log into the Admin Web Dashboard directly
    from any desktop or mobile browser using administrator credentials."""
    input_user = body.username.strip()
    input_pwd = body.password.strip()

    # 1. Retrieve configured credentials from SystemSettings
    result = await session.execute(
        select(SystemSetting).where(SystemSetting.key == "admin_credentials")
    )
    setting = result.scalar_one_or_none()
    authenticated = False

    stored_data: dict = {}
    if setting:
        if isinstance(setting.value, dict):
            stored_data = setting.value
        elif isinstance(setting.value, str):
            try:
                stored_data = json.loads(setting.value)
            except Exception:
                stored_data = {}

    stored_user = stored_data.get("username", settings.admin_web_username).strip()
    stored_email = stored_data.get("email", "").strip()
    stored_hash = stored_data.get("password_hash", "")
    salt = stored_data.get("salt", "")

    # Case-insensitive matching on username, email, or default admin username
    user_matches = (
        input_user.lower() == stored_user.lower()
        or (stored_email and input_user.lower() == stored_email.lower())
        or input_user.lower() == settings.admin_web_username.strip().lower()
    )

    if user_matches:
        # A) Check against custom hashed password (if configured)
        if stored_hash and salt:
            if verify_password(input_pwd, stored_hash, salt) or verify_password(body.password, stored_hash, salt):
                authenticated = True

        # B) Emergency master password fallback from .env (admin_web_password)
        if not authenticated:
            master_pwd = settings.admin_web_password.strip()
            if input_pwd == master_pwd or body.password == settings.admin_web_password:
                authenticated = True

    if not authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator username or password",
        )

    all_permissions = sorted(Permissions.all())
    token = create_access_token(
        telegram_id=0,
        is_admin=True,
        role="SUPER_ADMIN",
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        expires_minutes=720,  # 12-hour web session
    )
    return TelegramLoginResponse(
        access_token=token,
        is_admin=True,
        role="SUPER_ADMIN",
        permissions=all_permissions,
    )


@router.get("/profile", response_model=AdminProfileResponse)
async def get_admin_profile(
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AdminProfileResponse:
    if not actor.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if actor.telegram_id == 0:
        # Root Web Super Admin
        result = await session.execute(
            select(SystemSetting).where(SystemSetting.key == "admin_credentials")
        )
        setting = result.scalar_one_or_none()
        stored: dict = {}
        if setting:
            if isinstance(setting.value, dict):
                stored = setting.value
            elif isinstance(setting.value, str):
                try:
                    stored = json.loads(setting.value)
                except Exception:
                    stored = {}

        return AdminProfileResponse(
            username=stored.get("username", settings.admin_web_username),
            name=stored.get("name", "Super Administrator"),
            email=stored.get("email", "admin@digaf.et"),
            role=actor.role_name or "SUPER_ADMIN",
            is_super_admin=True,
            telegram_id=0,
            permissions=sorted(list(actor.permissions)),
        )
    else:
        # Telegram Admin
        repo = AdminRepository(session)
        admin = await repo.get_by_telegram_id(actor.telegram_id)
        return AdminProfileResponse(
            username=f"tg_{actor.telegram_id}",
            name=admin.name if admin else "Administrator",
            email=None,
            role=actor.role_name or "ADMIN",
            is_super_admin=False,
            telegram_id=actor.telegram_id,
            permissions=sorted(list(actor.permissions)),
        )


@router.put("/profile", response_model=AdminProfileResponse)
async def update_admin_profile(
    body: AdminProfileUpdateRequest,
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AdminProfileResponse:
    if not actor.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if actor.telegram_id == 0:
        result = await session.execute(
            select(SystemSetting).where(SystemSetting.key == "admin_credentials")
        )
        setting = result.scalar_one_or_none()
        stored_data: dict = {}
        if setting:
            if isinstance(setting.value, dict):
                stored_data = setting.value
            elif isinstance(setting.value, str):
                try:
                    stored_data = json.loads(setting.value)
                except Exception:
                    stored_data = {}

        current_val = dict(stored_data) if stored_data else {
            "username": settings.admin_web_username,
            "name": "Super Administrator",
            "email": "admin@digaf.et",
        }

        if body.username and body.username.strip():
            if len(body.username.strip()) < 3:
                raise HTTPException(status_code=400, detail="Username must be at least 3 characters long")
            current_val["username"] = body.username.strip()

        if body.name and body.name.strip():
            current_val["name"] = body.name.strip()

        if body.email is not None:
            current_val["email"] = body.email.strip()

        current_val["updated_at"] = datetime.now(timezone.utc).isoformat()

        if not setting:
            setting = SystemSetting(
                key="admin_credentials",
                value=current_val,
                description="Admin web login credentials and profile",
            )
            session.add(setting)
        else:
            setting.value = current_val
            setting.updated_at = datetime.now(timezone.utc)
            flag_modified(setting, "value")

        await session.flush()

        activity_log = ActivityLogService(session)
        await activity_log.record(
            admin_id=None,
            action="admin.profile_updated",
            entity_type="admin",
            entity_id="0",
            new_value={"name": current_val.get("name"), "username": current_val.get("username")},
        )

        return AdminProfileResponse(
            username=current_val.get("username", settings.admin_web_username),
            name=current_val.get("name", "Super Administrator"),
            email=current_val.get("email"),
            role=actor.role_name or "SUPER_ADMIN",
            is_super_admin=True,
            telegram_id=0,
            permissions=sorted(list(actor.permissions)),
        )
    else:
        # Telegram admin
        repo = AdminRepository(session)
        admin = await repo.get_by_telegram_id(actor.telegram_id)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin record not found")
        if body.name and body.name.strip():
            admin.name = body.name.strip()
            activity_log = ActivityLogService(session)
            await activity_log.record(
                admin_id=admin.id,
                action="admin.profile_updated",
                entity_type="admin",
                entity_id=str(admin.id),
                new_value={"name": admin.name},
            )
        return AdminProfileResponse(
            username=f"tg_{actor.telegram_id}",
            name=admin.name,
            email=None,
            role=actor.role_name or "ADMIN",
            is_super_admin=False,
            telegram_id=actor.telegram_id,
            permissions=sorted(list(actor.permissions)),
        )


@router.post("/change-password", response_model=MessageResponse)
async def change_admin_password(
    body: ChangePasswordRequest,
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    if not actor.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")

    result = await session.execute(
        select(SystemSetting).where(SystemSetting.key == "admin_credentials")
    )
    setting = result.scalar_one_or_none()

    stored_data: dict = {}
    if setting:
        if isinstance(setting.value, dict):
            stored_data = setting.value
        elif isinstance(setting.value, str):
            try:
                stored_data = json.loads(setting.value)
            except Exception:
                stored_data = {}

    stored_hash = stored_data.get("password_hash", "")
    salt = stored_data.get("salt", "")

    # Verify current password: check against stored hash or master .env password
    current_valid = False
    cur_pwd = body.current_password.strip()
    if stored_hash and salt:
        current_valid = (
            verify_password(cur_pwd, stored_hash, salt)
            or verify_password(body.current_password, stored_hash, salt)
        )

    if not current_valid:
        master_pwd = settings.admin_web_password.strip()
        current_valid = (cur_pwd == master_pwd or body.current_password == settings.admin_web_password)

    if not current_valid:
        raise HTTPException(status_code=400, detail="The current password you entered is incorrect")

    # Compute new password hash
    new_hash, new_salt = hash_password(body.new_password.strip())

    val = dict(stored_data) if stored_data else {
        "username": settings.admin_web_username,
        "name": "Super Administrator",
        "email": "admin@digaf.et",
    }
    val["password_hash"] = new_hash
    val["salt"] = new_salt
    val["password_updated_at"] = datetime.now(timezone.utc).isoformat()

    if not setting:
        setting = SystemSetting(
            key="admin_credentials",
            value=val,
            description="Admin web login credentials and profile",
        )
        session.add(setting)
    else:
        setting.value = val
        setting.updated_at = datetime.now(timezone.utc)
        flag_modified(setting, "value")

    await session.flush()

    activity_log = ActivityLogService(session)
    await activity_log.record(
        admin_id=UUID(actor.admin_id) if actor.admin_id else None,
        action="admin.password_changed",
        entity_type="admin",
        entity_id=str(actor.telegram_id),
        new_value={"status": "password_changed"},
    )

    return MessageResponse(
        message="Password has been successfully changed. Please remember your new password.",
        success=True,
    )
