import pytest

pytestmark = pytest.mark.asyncio


async def test_register_and_login(client):
    r = await client.post("/api/auth/register", json={
        "name": "Alice", "email": "alice@example.com",
        "password": "password123", "role": "learner",
    })
    assert r.status_code == 201
    assert r.json()["email"] == "alice@example.com"

    r = await client.post("/api/auth/login", data={
        "username": "alice@example.com", "password": "password123",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()


async def test_login_wrong_password_rejected(client):
    await client.post("/api/auth/register", json={
        "name": "Bob", "email": "bob@example.com",
        "password": "correct-password", "role": "learner",
    })
    r = await client.post("/api/auth/login", data={
        "username": "bob@example.com", "password": "wrong-password",
    })
    assert r.status_code == 401


async def test_duplicate_registration_rejected(client):
    payload = {
        "name": "Carl", "email": "carl@example.com",
        "password": "password123", "role": "learner",
    }
    r1 = await client.post("/api/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/api/auth/register", json=payload)
    assert r2.status_code == 400


async def test_protected_route_requires_token(client):
    r = await client.get("/api/users/me")
    assert r.status_code == 401


async def test_protected_route_with_token(client, auth_headers):
    r = await client.get("/api/users/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "pytest-user@example.com"


async def test_invalid_token_rejected(client):
    r = await client.get(
        "/api/users/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 401
