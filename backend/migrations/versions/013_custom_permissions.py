"""Add custom_permissions to tenant_members and token_hash index on invitations

Revision ID: 013_custom_permissions
Revises: 012_investigation_ai_analysis
Create Date: 2026-06-12
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "013_custom_permissions"
down_revision: Union[str, None] = "012_investigation_ai_analysis"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tenant_members",
        sa.Column(
            "custom_permissions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text('\'{"grant":[],"revoke":[]}\'::jsonb'),
        ),
    )
    op.create_index(
        "idx_invitation_token_hash",
        "invitations",
        ["token_hash"],
    )


def downgrade() -> None:
    op.drop_index("idx_invitation_token_hash", table_name="invitations")
    op.drop_column("tenant_members", "custom_permissions")
