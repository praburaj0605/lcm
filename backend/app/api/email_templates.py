from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser
from app.models.app_data import EmailTemplateRow
from app.redis_cache import cache_delete, cache_get, cache_set

router = APIRouter()
_PREFIX = "email-templates"
_CACHE_LIST = "crm:email-templates:list"


@router.get("")
def list_templates(_user: CurrentUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    hit = cache_get(_CACHE_LIST)
    if hit is not None:
        return hit
    rows = db.scalars(select(EmailTemplateRow).order_by(EmailTemplateRow.created_at)).all()
    out = []
    for r in rows:
        d = dict(r.data)
        d["id"] = r.id
        out.append(d)
    cache_set(_CACHE_LIST, out)
    return out


@router.post("", status_code=status.HTTP_201_CREATED)
def create_template(body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    tid = str(body.get("id") or uuid.uuid4())
    data = {k: v for k, v in body.items() if k != "id"}
    row = EmailTemplateRow(id=tid, data=data)
    db.add(row)
    db.commit()
    db.refresh(row)
    cache_delete(_CACHE_LIST)
    d = dict(row.data)
    d["id"] = row.id
    return d


@router.put("/{template_id}")
def update_template(
    template_id: str, body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    row = db.get(EmailTemplateRow, template_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    data = {k: v for k, v in body.items() if k != "id"}
    row.data = data
    db.commit()
    db.refresh(row)
    cache_delete(_CACHE_LIST)
    d = dict(row.data)
    d["id"] = row.id
    return d


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: str, _user: CurrentUser, db: Session = Depends(get_db)) -> None:
    row = db.get(EmailTemplateRow, template_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    db.delete(row)
    db.commit()
    cache_delete(_CACHE_LIST)
