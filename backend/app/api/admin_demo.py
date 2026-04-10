import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import AdminUser
from app.demo_seed import demo_data_status, remove_demo_data, seed_demo_data

log = logging.getLogger(__name__)

router = APIRouter()


class DemoSeedRequest(BaseModel):
    replace: bool = False


@router.get("/demo-data/status")
def get_demo_data_status(_admin: AdminUser, db: Session = Depends(get_db)):
    return demo_data_status(db)


@router.post("/demo-data/seed")
def post_demo_data_seed(
    _admin: AdminUser,
    db: Session = Depends(get_db),
    body: DemoSeedRequest = DemoSeedRequest(),
):
    try:
        return seed_demo_data(db, replace=body.replace)
    except Exception as e:
        log.exception("POST /admin/demo-data/seed failed")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e) or type(e).__name__,
        ) from e


@router.delete("/demo-data")
def delete_demo_data(_admin: AdminUser, db: Session = Depends(get_db)):
    try:
        return remove_demo_data(db)
    except Exception as e:
        log.exception("DELETE /admin/demo-data failed")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e) or type(e).__name__,
        ) from e
