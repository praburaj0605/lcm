from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.documents import QuotationRow
from app.schemas.json_doc import QuoteRespondRequest
from app.redis_cache import cache_delete

router = APIRouter()


def _apply_respond(db: Session, quotation_id: str, token: str, action: str) -> tuple[bool, str, str]:
    """Returns (success, status_or_error_code, message)."""
    row = db.get(QuotationRow, quotation_id)
    if not row:
        return False, "not_found", "Quotation not found."

    data = dict(row.data or {})
    t = str(data.get("clientResponseToken") or "")
    if not t or t != str(token).strip():
        return False, "forbidden", "Invalid or missing token."

    st = data.get("status")
    if st in ("Accepted", "Rejected"):
        return False, "conflict", "This quotation has already been accepted or declined."

    act = str(action).lower().strip()
    if act not in ("accept", "reject"):
        return False, "bad_action", "Invalid action."

    data["status"] = "Accepted" if act == "accept" else "Rejected"
    data["clientRespondedAt"] = datetime.now(timezone.utc).isoformat()
    data["clientResponseAction"] = data["status"]
    row.data = data
    db.commit()
    cache_delete("crm:quotations:list")
    return True, data["status"], "Recorded successfully."


def _html_page(title: str, body: str, ok: bool) -> str:
    color = "#059669" if ok else "#b91c1c"
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{title}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;">
<h1 style="color:{color};font-size:1.25rem;">{title}</h1>
<p style="color:#334155;line-height:1.5">{body}</p>
</body></html>"""


@router.get("/quotations/{quotation_id}/respond", response_class=HTMLResponse)
def respond_quotation_get(
    quotation_id: str,
    action: str,
    token: str,
    db: Session = Depends(get_db),
):
    ok, code, msg = _apply_respond(db, quotation_id, token, action)
    if ok:
        title = "Quotation accepted" if code == "Accepted" else "Quotation declined"
        return HTMLResponse(_html_page(title, f"{msg} Status is now <strong>{code}</strong>.", True))
    if code == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
    if code == "forbidden":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)
    if code == "conflict":
        return HTMLResponse(_html_page("Already responded", msg, False), status_code=409)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/quotations/{quotation_id}/respond")
def respond_quotation_post(
    quotation_id: str,
    body: QuoteRespondRequest,
    db: Session = Depends(get_db),
):
    ok, code, msg = _apply_respond(db, quotation_id, body.token, body.action)
    if not ok:
        if code == "not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        if code == "forbidden":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)
        if code == "conflict":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"ok": True, "status": code}
