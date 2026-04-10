from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud.json_entity import create_doc, delete_doc, get_doc, list_docs, replace_doc
from app.database import get_db
from app.deps import CurrentUser
from app.models.documents import InvoiceRow

router = APIRouter()
_PREFIX = "invoices"


@router.get("")
def list_invoices(_user: CurrentUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_docs(db, InvoiceRow, _PREFIX)


@router.get("/{invoice_id}")
def get_invoice(invoice_id: str, _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = get_doc(db, InvoiceRow, invoice_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return row


@router.post("", status_code=status.HTTP_201_CREATED)
def create_invoice(body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    return create_doc(db, InvoiceRow, body, _PREFIX)


@router.put("/{invoice_id}")
def update_invoice(
    invoice_id: str, body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    out = replace_doc(db, InvoiceRow, invoice_id, body, _PREFIX)
    if not out:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return out


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_invoice(invoice_id: str, _user: CurrentUser, db: Session = Depends(get_db)) -> None:
    if not delete_doc(db, InvoiceRow, invoice_id, _PREFIX):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
