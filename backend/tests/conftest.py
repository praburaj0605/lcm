"""
Pytest configuration. Requires PostgreSQL (default: logistics_test on localhost:5432).

  createdb -U logistics logistics_test   # once

Or use the same DB as Docker: DATABASE_URL=postgresql+psycopg://logistics:logistics@localhost:5432/logistics
"""
from __future__ import annotations

import os

# Must run before importing application modules that read settings/engine.
os.environ.setdefault("TESTING", "true")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://logistics:logistics@127.0.0.1:5432/logistics_test",
)
os.environ.setdefault("JWT_SECRET", "pytest-jwt-secret-key-min-32-chars-long!!")
os.environ.setdefault("AUTH_ALLOW_EMAIL_ONLY", "true")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:6379/15")
os.environ.setdefault("CORS_ORIGINS", "http://testserver")
os.environ.setdefault("BREVO_API_KEY", "test-brevo-key")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings

get_settings.cache_clear()

from app.database import Base, engine, get_db, SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.demo_image_urls import dicebear_user_avatar  # noqa: E402
from app.models import User  # noqa: E402
from app import redis_cache  # noqa: E402


@pytest.fixture(scope="session")
def check_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        pytest.skip(f"PostgreSQL not reachable ({e}). Set DATABASE_URL or start Docker postgres.")


@pytest.fixture(scope="session", autouse=True)
def prepare_schema(check_db):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    # Optional: leave schema for inspection; next run drops again


@pytest.fixture(scope="session", autouse=True)
def seed_test_user(check_db, prepare_schema):
    with SessionLocal() as db:
        db.merge(
            User(
                id="u_test_admin",
                email="admin@test.com",
                name="Test Admin",
                role="admin",
                hashed_password=None,
                avatar_url=dicebear_user_avatar("admin@test.com:Test Admin"),
            )
        )
        db.merge(
            User(
                id="u_test_sales",
                email="sales@test.com",
                name="Test Sales",
                role="sales",
                hashed_password=None,
                avatar_url=dicebear_user_avatar("sales@test.com:Test Sales"),
            )
        )
        db.commit()


_DATA_TABLES = (
    "clients",
    "enquiries",
    "quotations",
    "invoices",
    "app_settings",
    "email_templates",
)


@pytest.fixture(autouse=True)
def clean_entity_tables():
    yield
    with SessionLocal() as db:
        for t in _DATA_TABLES:
            db.execute(text(f'TRUNCATE TABLE "{t}" RESTART IDENTITY CASCADE'))
        db.commit()


@pytest.fixture(autouse=True)
def fake_redis(monkeypatch):
    import fakeredis

    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(redis_cache, "_client", fake)


@pytest.fixture
def client() -> TestClient:
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def auth_token(client: TestClient) -> str:
    r = client.post("/api/auth/login", json={"email": "admin@test.com"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def db_session() -> Session:
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()
