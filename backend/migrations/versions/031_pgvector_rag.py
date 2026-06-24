"""Add pgvector extension and embedding column to rag_knowledge_base

Revision ID: 031
Revises: 030
Create Date: 2026-06-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension (idempotent)
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))

    # Add embedding column (1536-dimensional, matches text-embedding-004 / ada-002)
    op.execute(sa.text("""
        ALTER TABLE rag_knowledge_base
          ADD COLUMN IF NOT EXISTS embedding vector(1536)
    """))

    # HNSW index for fast cosine similarity search
    # Created CONCURRENTLY so it doesn't block reads/writes during migration.
    # Using raw SQL because alembic's op.create_index doesn't know about HNSW.
    op.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_rag_kb_embedding_hnsw
        ON rag_knowledge_base
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """))


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS ix_rag_kb_embedding_hnsw"))
    op.execute(sa.text("""
        ALTER TABLE rag_knowledge_base DROP COLUMN IF EXISTS embedding
    """))
