"""Canonical permission codes.

These strings are the single source of truth referenced by API
dependencies (`require_permission(...)`). The actual role -> permission
mapping lives in the `role_permissions` table and is editable at runtime
by a Super Admin (see spec section 17: "Admin can ... if authorized").
The constants below just prevent typos when routes declare what they need.
"""

from __future__ import annotations


class Permissions:
    # Registrations
    REGISTRATION_VIEW = "registration.view"
    REGISTRATION_APPROVE = "registration.approve"
    REGISTRATION_REJECT = "registration.reject"
    REGISTRATION_SUSPEND = "registration.suspend"

    # Users
    USER_VIEW = "user.view"

    # Jobs
    JOB_VIEW = "job.view"
    JOB_CREATE = "job.create"
    JOB_UPDATE = "job.update"
    JOB_ACTIVATE = "job.activate"

    # Locations
    LOCATION_VIEW = "location.view"
    LOCATION_CREATE = "location.create"
    LOCATION_UPDATE = "location.update"

    # Notifications
    NOTIFICATION_VIEW = "notification.view"
    NOTIFICATION_SEND = "notification.send"

    # Reports & dashboard
    REPORT_VIEW = "report.view"
    DASHBOARD_VIEW = "dashboard.view"

    # Activity logs
    ACTIVITY_LOG_VIEW = "activity_log.view"

    # Admin management (Super Admin territory)
    ADMIN_MANAGE = "admin.manage"
    ROLE_MANAGE = "role.manage"
    SETTINGS_MANAGE = "settings.manage"

    @classmethod
    def all(cls) -> list[str]:
        return [v for k, v in vars(cls).items() if not k.startswith("_") and isinstance(v, str)]


# Default seed mapping (used only by the initial Alembic data migration -
# NOT re-applied at runtime, so a Super Admin's later changes persist).
DEFAULT_ROLE_PERMISSIONS: dict[str, list[str]] = {
    "SUPER_ADMIN": Permissions.all(),
    "ADMIN": [
        Permissions.REGISTRATION_VIEW,
        Permissions.REGISTRATION_APPROVE,
        Permissions.REGISTRATION_REJECT,
        Permissions.USER_VIEW,
        Permissions.JOB_VIEW,
        Permissions.LOCATION_VIEW,
        Permissions.NOTIFICATION_VIEW,
        Permissions.REPORT_VIEW,
        Permissions.DASHBOARD_VIEW,
        Permissions.ACTIVITY_LOG_VIEW,
    ],
    "VIEWER": [
        Permissions.REGISTRATION_VIEW,
        Permissions.USER_VIEW,
        Permissions.JOB_VIEW,
        Permissions.LOCATION_VIEW,
        Permissions.REPORT_VIEW,
        Permissions.DASHBOARD_VIEW,
    ],
}
