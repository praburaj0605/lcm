"""normalize freight-related keys on enquiry JSON documents

Revision ID: 003_enquiry_freight_json
Revises: 002_avatar
Create Date: 2026-04-10

Enquiry rows store a flexible JSONB `data` blob (no new columns). This revision
ensures `cargoLines` and `additionalServiceTags` exist as JSON arrays so API
clients and migrations can rely on stable keys. Freight-only fields
(routePolText, routePodText, enquiryValidUntil, declaredValueUsd, etc.) remain
optional and are not backfilled here.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "003_enquiry_freight_json"
down_revision: Union[str, None] = "002_avatar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        r"""
        UPDATE enquiries
        SET data = COALESCE(data, '{}'::jsonb)
            || jsonb_build_object(
                'cargoLines', COALESCE(data->'cargoLines', '[]'::jsonb),
                'additionalServiceTags', COALESCE(data->'additionalServiceTags', '[]'::jsonb)
            );
        """
    )


def downgrade() -> None:
    # Do not strip keys: would discard user data. No-op.
    pass
