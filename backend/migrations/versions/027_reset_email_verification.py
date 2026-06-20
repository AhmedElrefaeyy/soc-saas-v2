"""Reset email_verified for all users — no one is verified unless they clicked the link

All existing rows were auto-verified by migration 021 to avoid lockout.
This migration reverts that: every account starts unverified.
Users must use the Resend Verification flow to get a new link.

Revision ID: 027
Revises: 026
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE users
            SET email_verified            = FALSE,
                email_verification_token  = NULL,
                email_verification_sent_at = NULL
            """
        )
    )


def downgrade() -> None:
    # Re-apply the original migration 021 behaviour: all existing rows verified.
    op.execute(sa.text("UPDATE users SET email_verified = TRUE"))
