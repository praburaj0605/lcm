from typing import Any
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.redis_cache import cache_delete, cache_get, cache_set


def _doc(row: Any) -> dict[str, Any]:
    d = dict(row.data or {})
    d["id"] = row.id
    return d


def _invalidate(cache_prefix: str) -> None:
    cache_delete(f"crm:{cache_prefix}:list")


def list_docs(db: Session, model: type, cache_prefix: str) -> list[dict[str, Any]]:
    key = f"crm:{cache_prefix}:list"
    cached = cache_get(key)
    if cached is not None:
        return cached
    rows = db.scalars(select(model).order_by(model.created_at.desc())).all()
    out = [_doc(r) for r in rows]
    cache_set(key, out)
    return out


def get_doc(db: Session, model: type, id_: str) -> dict[str, Any] | None:
    row = db.get(model, id_)
    return _doc(row) if row else None


def create_doc(db: Session, model: type, body: dict[str, Any], cache_prefix: str) -> dict[str, Any]:
    cid = str(body.get("id") or uuid.uuid4())
    data = {k: v for k, v in body.items() if k != "id"}
    row = model(id=cid, data=data)
    db.add(row)
    db.commit()
    db.refresh(row)
    _invalidate(cache_prefix)
    return _doc(row)


def replace_doc(db: Session, model: type, id_: str, body: dict[str, Any], cache_prefix: str) -> dict[str, Any] | None:
    row = db.get(model, id_)
    if not row:
        return None
    data = {k: v for k, v in body.items() if k != "id"}
    row.data = data
    db.commit()
    db.refresh(row)
    _invalidate(cache_prefix)
    return _doc(row)


def delete_doc(db: Session, model: type, id_: str, cache_prefix: str) -> bool:
    row = db.get(model, id_)
    if not row:
        return False
    db.delete(row)
    db.commit()
    _invalidate(cache_prefix)
    return True
