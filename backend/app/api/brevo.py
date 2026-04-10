import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.config import get_settings
from app.deps import CurrentUser
from app.schemas.json_doc import BrevoProxyRequest

router = APIRouter()


@router.post("/send")
async def brevo_send(_user: CurrentUser, body: BrevoProxyRequest):
    settings = get_settings()
    if not settings.brevo_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Brevo API key not configured on server (set BREVO_API_KEY).",
        )
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            settings.brevo_api_url,
            headers={
                "api-key": settings.brevo_api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=body.payload,
        )
    if r.status_code >= 400:
        try:
            detail = r.json()
        except Exception:
            detail = r.text
        raise HTTPException(status_code=r.status_code, detail=detail)
    try:
        return r.json()
    except Exception:
        return {"ok": True, "raw": r.text}
