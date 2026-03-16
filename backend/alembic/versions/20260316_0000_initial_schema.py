"""Initial database schema creation.

Revision ID: initial_schema
Revises: 
Create Date: 2026-03-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema."""
    # Enable UUID extension
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # Create papers table
    op.create_table(
        "papers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("citation_key", sa.String(100), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("authors", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("journal", sa.String(500), nullable=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("volume", sa.String(50), nullable=True),
        sa.Column("number", sa.String(50), nullable=True),
        sa.Column("pages", sa.String(100), nullable=True),
        sa.Column("doi", sa.String(200), nullable=True),
        sa.Column("abstract", sa.Text(), nullable=True),
        sa.Column("keywords", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("jel_codes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("url", sa.String(1000), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("pdf_path", sa.String(500), nullable=True),
        sa.Column("pdf_uploaded", sa.Boolean(), nullable=False, default=False),
        sa.Column("citation_count", sa.Integer(), nullable=False, default=0),
        sa.Column("last_citation_update", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for papers table
    op.create_index("ix_papers_id", "papers", ["id"])
    op.create_index("ix_papers_citation_key", "papers", ["citation_key"], unique=True)
    op.create_index("ix_papers_year", "papers", ["year"])
    op.create_index("ix_papers_journal", "papers", ["journal"])
    op.create_index("ix_papers_doi", "papers", ["doi"], unique=True)
    op.create_index(
        "ix_papers_authors",
        "papers",
        ["authors"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_papers_keywords",
        "papers",
        ["keywords"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_papers_jel_codes",
        "papers",
        ["jel_codes"],
        postgresql_using="gin",
    )
    op.create_index("ix_papers_year_journal", "papers", ["year", "journal"])

    # Create notes table
    op.create_table(
        "notes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "paper_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ai_generated", sa.Boolean(), nullable=False, default=False),
        sa.Column("ai_model", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["paper_id"],
            ["papers.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for notes table
    op.create_index("ix_notes_id", "notes", ["id"])
    op.create_index("ix_notes_paper_id", "notes", ["paper_id"])
    op.create_index(
        "ix_notes_tags",
        "notes",
        ["tags"],
        postgresql_using="gin",
    )

    # Create journals table
    op.create_table(
        "journals",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("abbreviation", sa.String(100), nullable=True),
        sa.Column("issn", sa.String(20), nullable=True),
        sa.Column("publisher", sa.String(200), nullable=True),
        sa.Column("website_url", sa.String(500), nullable=True),
        sa.Column("metadata_source", sa.String(100), nullable=True),
        sa.Column("auto_update_enabled", sa.Boolean(), nullable=False, default=True),
        sa.Column("update_frequency_days", sa.Integer(), nullable=False, default=30),
        sa.Column("last_update", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Create indexes for journals table
    op.create_index("ix_journals_id", "journals", ["id"])
    op.create_index("ix_journals_issn", "journals", ["issn"])

    # Create citations table
    op.create_table(
        "citations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "paper_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("citing_paper_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("citing_paper_title", sa.String(2000), nullable=True),
        sa.Column("citing_paper_doi", sa.String(200), nullable=True),
        sa.Column("citation_date", sa.Date(), nullable=True),
        sa.Column("source_database", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["paper_id"],
            ["papers.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for citations table
    op.create_index("ix_citations_id", "citations", ["id"])
    op.create_index("ix_citations_paper_id", "citations", ["paper_id"])
    op.create_index("ix_citations_citing_paper_doi", "citations", ["citing_paper_doi"])

    # Create tasks table
    op.create_table(
        "tasks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("task_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, default="pending"),
        sa.Column("paper_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("journal_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("progress", sa.Integer(), nullable=False, default=0),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(["paper_id"], ["papers.id"]),
        sa.ForeignKeyConstraint(["journal_id"], ["journals.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for tasks table
    op.create_index("ix_tasks_id", "tasks", ["id"])
    op.create_index("ix_tasks_task_type", "tasks", ["task_type"])
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_paper_id", "tasks", ["paper_id"])
    op.create_index("ix_tasks_journal_id", "tasks", ["journal_id"])


def downgrade() -> None:
    """Downgrade database schema."""
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table("tasks")
    op.drop_table("citations")
    op.drop_table("journals")
    op.drop_table("notes")
    op.drop_table("papers")

    # Drop extension
    op.execute("DROP EXTENSION IF EXISTS pgcrypto")
