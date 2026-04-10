import logging
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.api import api_router, public_router
from app.config import get_settings
from app.database import SessionLocal, ensure_schema_patches
from app.models import User
from app.demo_image_urls import dicebear_user_avatar
from app.security import hash_password

settings = get_settings()
_log = logging.getLogger(__name__)

# Local dev: any port on localhost / 127.0.0.1 (Vite etc.) — pairs with CORSMiddleware regex below.
_LOCAL_DEV_ORIGIN = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")


def _cors_headers_for_request(request: Request) -> dict[str, str]:
    origin = request.headers.get("origin")
    if not origin:
        return {}
    allowed = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    if origin in allowed or _LOCAL_DEV_ORIGIN.match(origin):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


def _seed_demo_users() -> None:
    demo = [
        ("u_admin", "admin@demo.com", "Admin User", "admin"),
        ("u_sales", "sales@demo.com", "Sales Rep", "sales"),
        ("u_pricing1", "pricing@demo.com", "Pricing Team", "pricing"),
        ("u_pricing2", "pricing2@demo.com", "Pricing Analyst", "pricing"),
        ("u_boss", "boss@demo.com", "Management (Boss)", "boss"),
    ]
    with SessionLocal() as db:
        existing = db.scalars(select(User.id).limit(1)).first()
        if existing:
            return
        for uid, email, name, role in demo:
            db.add(
                User(
                    id=uid,
                    email=email.lower(),
                    name=name,
                    role=role,
                    hashed_password=hash_password("demo") if not settings.auth_allow_email_only else None,
                    avatar_url=dicebear_user_avatar(f"{email}:{name}"),
                )
            )
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not get_settings().testing:
        ensure_schema_patches()
        _seed_demo_users()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    headers = {**_cors_headers_for_request(request)}
    if exc.headers:
        headers.update(exc.headers)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=_cors_headers_for_request(request),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    _log.exception("Unhandled exception")
    detail = str(exc) or type(exc).__name__
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
        headers=_cors_headers_for_request(request),
    )


app.include_router(api_router, prefix="/api")
app.include_router(public_router, prefix="/api/public")


@app.get("/")
def root():
    return {"service": settings.app_name, "docs": "/docs", "health": "/api/health"}
