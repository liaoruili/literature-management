"""Note model for reading notes."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.paper import Paper


class Note(Base):
    """Model for reading notes on academic papers."""

    __tablename__ = "notes"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Foreign key
    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Content (Markdown format)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Tags
    tags: Mapped[Optional[list]] = mapped_column(
        JSONB,
        default=list,
    )

    # AI assistance fields
    ai_generated: Mapped[bool] = mapped_column(default=False)
    ai_model: Mapped[Optional[str]] = mapped_column(String(100))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    paper: Mapped["Paper"] = relationship("Paper", back_populates="notes")

    def __repr__(self) -> str:
        return f"<Note(id={self.id}, paper_id={self.paper_id}, created_at={self.created_at})>"
