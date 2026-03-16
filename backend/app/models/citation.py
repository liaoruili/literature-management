"""Citation model for tracking citation records."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.paper import Paper


class Citation(Base):
    """Model for individual citation records."""

    __tablename__ = "citations"

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

    # Citing paper information
    citing_paper_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    citing_paper_title: Mapped[Optional[str]] = mapped_column(String(2000))
    citing_paper_doi: Mapped[Optional[str]] = mapped_column(
        String(200),
        index=True,
    )
    citation_date: Mapped[Optional[date]] = mapped_column(Date)

    # Source database (Google Scholar, Crossref, Semantic Scholar)
    source_database: Mapped[Optional[str]] = mapped_column(String(100))

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    paper: Mapped["Paper"] = relationship("Paper", back_populates="citations")

    def __repr__(self) -> str:
        return f"<Citation(id={self.id}, paper_id={self.paper_id}, citing='{self.citing_paper_title}')>"
