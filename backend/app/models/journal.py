"""Journal model for tracking academic journals."""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Journal(Base):
    """Model for academic journal metadata and scraping configuration."""

    __tablename__ = "journals"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Journal information
    name: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    abbreviation: Mapped[Optional[str]] = mapped_column(String(100))
    issn: Mapped[Optional[str]] = mapped_column(String(20), index=True)
    publisher: Mapped[Optional[str]] = mapped_column(String(200))
    website_url: Mapped[Optional[str]] = mapped_column(String(500))

    # Scraping configuration
    metadata_source: Mapped[Optional[str]] = mapped_column(String(100))

    # Auto-update settings
    auto_update_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    update_frequency_days: Mapped[int] = mapped_column(Integer, default=30)
    last_update: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    def should_update(self) -> bool:
        """Check if journal metadata should be updated."""
        if not self.auto_update_enabled:
            return False

        if self.last_update is None:
            return True

        next_update = self.last_update + timedelta(days=self.update_frequency_days)
        return datetime.utcnow() >= next_update

    def __repr__(self) -> str:
        return f"<Journal(id={self.id}, name='{self.name}', abbreviation='{self.abbreviation}')>"
