"""
Create (or promote) an administrator account.

    python -m app.scripts.create_admin you@example.com "Your Name"

The password is read from the prompt (or ADMIN_PASSWORD) -- never from the
command line, so it does not end up in shell history. This is the only way to
make the first administrator: registration cannot create one.
"""

import asyncio
import getpass
import os
import sys

from app.core.roles import ADMINISTRATOR
from app.core.security import hash_password
from app.db.database import init_db
from app.models.user import User


async def main(email: str, name: str) -> None:
    await init_db()
    existing = await User.find_one(User.email == email)
    if existing:
        existing.role = ADMINISTRATOR
        existing.is_active = True
        await existing.save()
        print(f"Promoted existing user {email} to administrator.")
        return
    password = os.environ.get("ADMIN_PASSWORD") or getpass.getpass("Password (min 8 chars): ")
    if len(password) < 8:
        sys.exit("Password must be at least 8 characters.")
    await User(name=name, email=email, password=hash_password(password), role=ADMINISTRATOR).insert()
    print(f"Created administrator {email}.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit('Usage: python -m app.scripts.create_admin EMAIL "Full Name"')
    asyncio.run(main(sys.argv[1], sys.argv[2]))
