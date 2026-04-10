import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_log = logging.getLogger(__name__)


def ensure_schema_patches() -> None:
    """
    Idempotent patches for Postgres DBs that were created before a column was added to the ORM.
    Matches Alembic 002_user_avatar_url; safe if the column already exists.
    """
    if "postgresql" not in settings.database_url.lower():
        return
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512)"))
    except Exception:
        _log.warning("ensure_schema_patches(users.avatar_url) failed", exc_info=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
