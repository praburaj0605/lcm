#!/usr/bin/env python3
"""CLI wrapper for app.demo_seed — run from repo: python backend/scripts/seed_sample_data.py [--force]"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from app.database import SessionLocal  # noqa: E402
from app.demo_seed import seed_demo_data  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed sample CRM data")
    parser.add_argument("--force", action="store_true", help="Remove previous sample_* rows and re-insert")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        out = seed_demo_data(db, replace=args.force)
        if not out.get("ok"):
            print(out.get("detail", "Nothing to do."))
            return
        print(
            "Seeded CRM demo data: curated sample_* rows plus 100 bulk_* rows per entity (clients, enquiries, quotations, invoices),",
            "client logo URLs + template branding logos (DiceBear), settings. Users get avatars from API startup seed.",
            "Log in as admin@demo.com (email-only) with VITE_API_BASE_URL set.",
            "Re-seed with replace if demo version changed: python backend/scripts/seed_sample_data.py --force",
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
