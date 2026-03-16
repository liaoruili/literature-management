"""Task model for background job tracking."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Task(Base):
    """Model for tracking background tasks."""

    __tablename__ = "tasks"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Task information
    task_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # metadata_scrape, citation_update, pdf_process
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        index=True,
    )  # pending, running, completed, failed

    # Foreign keys
    paper_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("papers.id"),
        index=True,
    )
    journal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("journals.id"),
        index=True,
    )

    # Progress tracking
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    error_message: Mapped[Optional[str]] = mapped_column(String)
    result: Mapped[Optional[dict]] = mapped_column(JSONB)

    # Timestamps
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, type='{self.task_type}', status='{self.status}')>"
