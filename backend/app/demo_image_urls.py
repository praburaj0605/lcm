"""Deterministic placeholder image URLs (DiceBear SVG) for demo / seed data."""
from __future__ import annotations

from urllib.parse import quote


def dicebear_company_logo(seed: str) -> str:
    """Abstract mark suitable as a client / company logo (SVG)."""
    q = quote(str(seed)[:80], safe="")
    return f"https://api.dicebear.com/7.x/shapes/svg?seed={q}"


def dicebear_user_avatar(seed: str) -> str:
    """Portrait-style avatar for users (SVG)."""
    q = quote(str(seed)[:80], safe="")
    return f"https://api.dicebear.com/7.x/avataaars/svg?seed={q}"
