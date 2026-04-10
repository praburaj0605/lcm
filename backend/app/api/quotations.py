from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud.json_entity import create_doc, delete_doc, get_doc, list_docs, replace_doc
from app.database import get_db
from app.deps import CurrentUser
from app.models.documents import QuotationRow

router = APIRouter()
_PREFIX = "quotations"


@router.get("")
def list_quotations(_user: CurrentUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_docs(db, QuotationRow, _PREFIX)


@router.get("/{quotation_id}")
def get_quotation(quotation_id: str, _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = get_doc(db, QuotationRow, quotation_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return row


@router.post("", status_code=status.HTTP_201_CREATED)
def create_quotation(body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    return create_doc(db, QuotationRow, body, _PREFIX)


@router.put("/{quotation_id}")
def update_quotation(
    quotation_id: str, body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    out = replace_doc(db, QuotationRow, quotation_id, body, _PREFIX)
    if not out:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return out


@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_quotation(quotation_id: str, _user: CurrentUser, db: Session = Depends(get_db)) -> None:
    if not delete_doc(db, QuotationRow, quotation_id, _PREFIX):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
