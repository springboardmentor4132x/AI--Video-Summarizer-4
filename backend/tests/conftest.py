"""
Shared pytest fixtures.

Uses mongomock-motor as an in-memory stand-in for MongoDB so these
tests run anywhere without a real database — including in CI. This
exercises real application code (real Beanie models, real FastAPI
routes, real JWT auth, real password hashing) end-to-end; only the
database driver itself is swapped for an in-memory fake.

A couple of mongomock's async shim methods don't accept the exact
keyword arguments the installed Beanie version passes (e.g.
`list_collection_names(authorizedCollections=...)`); the small patches
below only relax that shim for the test run and are not part of the
shipped application.
"""
import os
import sys

os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest_asyncio
from httpx import AsyncClient, ASGITransport


@pytest_asyncio.fixture
async def client():
    from mongomock_motor import AsyncMongoMockClient
    import app.db.database as dbmod

    dbmod.client = AsyncMongoMockClient()
    dbmod.database = dbmod.client["clipmindAI_test"]

    orig_list_collections = dbmod.database.list_collection_names

    async def patched_list_collections(*args, **kwargs):
        return await orig_list_collections()

    dbmod.database.list_collection_names = patched_list_collections

    from app.db.database import init_db
    await init_db()

    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client):
    """Registers and logs in a fresh Content Creator (a role allowed to
    upload videos), returns Bearer auth headers."""
    await client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "pytest-user@example.com",
        "password": "password123",
        "role": "content_creator",
    })
    r = await client.post("/api/auth/login", data={
        "username": "pytest-user@example.com",
        "password": "password123",
    })
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def learner_headers(client):
    """A Learner account -- a consumer role that should be blocked
    from uploading (see test_rbac.py)."""
    await client.post("/api/auth/register", json={
        "name": "Learner User",
        "email": "pytest-learner@example.com",
        "password": "password123",
        "role": "learner",
    })
    r = await client.post("/api/auth/login", data={
        "username": "pytest-learner@example.com",
        "password": "password123",
    })
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
