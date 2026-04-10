from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser
from app.models.app_data import AppSettingsRow
from app.redis_cache import cache_delete, cache_get, cache_set

router = APIRouter()
_BREVO_KEY = "brevo"
_UI_KEY = "ui"
_CACHE = "crm:settings"


@router.get("/brevo")
def get_brevo_settings(_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ck = f"{_CACHE}:brevo"
    hit = cache_get(ck)
    if hit is not None:
        return hit
    row = db.get(AppSettingsRow, _BREVO_KEY)
    data = dict(row.data or {}) if row else {}
    cache_set(ck, data)
    return data


@router.put("/brevo")
def put_brevo_settings(
    body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    row = db.get(AppSettingsRow, _BREVO_KEY)
    if not row:
        row = AppSettingsRow(key=_BREVO_KEY, data=body)
        db.add(row)
    else:
        row.data = {**(row.data or {}), **body}
    db.commit()
    db.refresh(row)
    cache_delete(f"{_CACHE}:brevo")
    return dict(row.data or {})


@router.get("/ui")
def get_ui_settings(_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(AppSettingsRow, _UI_KEY)
    return dict(row.data or {}) if row else {}


@router.put("/ui")
def put_ui_settings(body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(AppSettingsRow, _UI_KEY)
    if not row:
        row = AppSettingsRow(key=_UI_KEY, data=body)
        db.add(row)
    else:
        row.data = {**(row.data or {}), **body}
    db.commit()
    db.refresh(row)
    return dict(row.data or {})
