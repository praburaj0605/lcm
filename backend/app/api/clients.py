from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud.json_entity import create_doc, delete_doc, get_doc, list_docs, replace_doc
from app.database import get_db
from app.deps import CurrentUser
from app.models.documents import ClientRow

router = APIRouter()
_PREFIX = "clients"


@router.get("")
def list_clients(_user: CurrentUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_docs(db, ClientRow, _PREFIX)


@router.get("/{client_id}")
def get_client(client_id: str, _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = get_doc(db, ClientRow, client_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return row


@router.post("", status_code=status.HTTP_201_CREATED)
def create_client(body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    return create_doc(db, ClientRow, body, _PREFIX)


@router.put("/{client_id}")
def update_client(
    client_id: str, body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    out = replace_doc(db, ClientRow, client_id, body, _PREFIX)
    if not out:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return out


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_client(client_id: str, _user: CurrentUser, db: Session = Depends(get_db)) -> None:
    if not delete_doc(db, ClientRow, client_id, _PREFIX):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
