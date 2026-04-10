from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Logistics CRM API"
    debug: bool = False

    database_url: str = "postgresql+psycopg://logistics:logistics@localhost:5432/logistics"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me-in-production-use-openssl-rand"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:3000,http://127.0.0.1:3000"
    )

    brevo_api_key: str = ""
    brevo_api_url: str = "https://api.brevo.com/v3/smtp/email"

    # When true, POST /auth/login accepts { email } only for seeded demo users (no password).
    auth_allow_email_only: bool = True

    cache_ttl_seconds: int = 30

    # When true (e.g. TESTING=true), skip demo user seed on startup — tests seed their own data.
    testing: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
