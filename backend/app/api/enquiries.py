"""
Enquiry API — documents are stored as JSONB (`EnquiryRow.data`).

FreightDesk / CRM fields (all optional unless your client sends them) include:
`cargoLines`, `additionalServiceTags`, `routePolText`, `routePodText`,
`enquiryValidUntil`, `declaredValueUsd`, plus existing keys such as `lineItems`,
`commodityDescription`, `serviceType`, etc. No request body schema is enforced here;
the frontend builds the payload. Migration `003_enquiry_freight_json` normalizes
`cargoLines` and `additionalServiceTags` to JSON arrays on existing DB rows.
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud.json_entity import create_doc, delete_doc, get_doc, list_docs, replace_doc
from app.database import get_db
from app.deps import CurrentUser
from app.models.documents import EnquiryRow

router = APIRouter()
_PREFIX = "enquiries"


@router.get("")
def list_enquiries(_user: CurrentUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_docs(db, EnquiryRow, _PREFIX)


@router.get("/{enquiry_id}")
def get_enquiry(enquiry_id: str, _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = get_doc(db, EnquiryRow, enquiry_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return row


@router.post("", status_code=status.HTTP_201_CREATED)
def create_enquiry(body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    return create_doc(db, EnquiryRow, body, _PREFIX)


@router.put("/{enquiry_id}")
def update_enquiry(
    enquiry_id: str, body: dict[str, Any], _user: CurrentUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    out = replace_doc(db, EnquiryRow, enquiry_id, body, _PREFIX)
    if not out:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return out


@router.delete("/{enquiry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_enquiry(enquiry_id: str, _user: CurrentUser, db: Session = Depends(get_db)) -> None:
    if not delete_doc(db, EnquiryRow, enquiry_id, _PREFIX):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
