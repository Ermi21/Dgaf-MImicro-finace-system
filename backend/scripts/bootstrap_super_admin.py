"""Bootstrap the first Super Admin.

Run this ONCE after migrations, against your real Supabase database:

    SUPER_ADMIN_TELEGRAM_ID=123456789 SUPER_ADMIN_NAME="Jane Doe" \\
        python -m scripts.bootstrap_super_admin

It is idempotent - re-running it with the same telegram_id is a no-op
if that admin already exists. After this, use the Admin Mini App /
`/api/v1/admin-management/admins` endpoint (which requires admin.manage,
held by this Super Admin) to create every other administrator.
"""

from __future__ import annotations

import asyncio
import os
import sys

from app.database.session import session_scope
from app.models.admin import Admin
from app.repositories.admin_repository import AdminRepository, RoleRepository


async def main() -> None:
    telegram_id_raw = os.environ.get("SUPER_ADMIN_TELEGRAM_ID")
    name = os.environ.get("SUPER_ADMIN_NAME", "Super Admin")

    if not telegram_id_raw:
        print("SUPER_ADMIN_TELEGRAM_ID environment variable is required.", file=sys.stderr)
        sys.exit(1)

    telegram_id = int(telegram_id_raw)

    async with session_scope() as session:
        admin_repo = AdminRepository(session)
        role_repo = RoleRepository(session)

        existing = await admin_repo.get_by_telegram_id(telegram_id)
        if existing:
            print(f"Admin with telegram_id={telegram_id} already exists (id={existing.id}). Nothing to do.")
            return

        role = await role_repo.get_by_name("SUPER_ADMIN")
        if not role:
            print(
                "SUPER_ADMIN role not found - make sure you've run "
                "`alembic upgrade head` (including the seed migration) first.",
                file=sys.stderr,
            )
            sys.exit(1)

        admin = Admin(telegram_id=telegram_id, name=name, role_id=role.id, is_active=True)
        await admin_repo.add(admin)
        print(f"Created Super Admin: telegram_id={telegram_id}, name={name!r}")


if __name__ == "__main__":
    asyncio.run(main())
