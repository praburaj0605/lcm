from typing import Any

from pydantic import BaseModel, Field


class JsonDocument(BaseModel):
    """Arbitrary JSON body for CRM entities (matches frontend shapes)."""

    data: dict[str, Any] = Field(default_factory=dict)


class BrevoProxyRequest(BaseModel):
    payload: dict[str, Any]


class QuoteRespondRequest(BaseModel):
    token: str
    action: str  # accept | reject
