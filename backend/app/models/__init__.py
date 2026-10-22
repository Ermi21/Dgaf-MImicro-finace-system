"""Import every model here so `Base.metadata` (used by Alembic autogenerate
and by tests that create tables) always sees the full schema."""

from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.job import Job
from app.models.location import City, Subcity, Woreda
from app.models.notification import Notification, NotificationRecipient
from app.models.registration import Registration
from app.models.role import Permission, Role, RolePermission
from app.models.system_settings import SystemSetting
from app.models.user import User

__all__ = [
    "ActivityLog",
    "Admin",
    "Job",
    "City",
    "Subcity",
    "Woreda",
    "Notification",
    "NotificationRecipient",
    "Registration",
    "Permission",
    "Role",
    "RolePermission",
    "SystemSetting",
    "User",
]
