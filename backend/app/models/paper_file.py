"""Paper File model for storing multiple files per paper."""

import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class PaperFile(Base):
    """Model for files attached to papers (PDFs, supplementary materials, etc.)."""
    
    __tablename__ = "paper_files"
    
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    
    paper_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # File metadata
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)  # pdf, docx, zip, etc.
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # in bytes
    
    # File description (optional)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # File category (pdf, supplementary_data, code, other)
    category: Mapped[str] = mapped_column(
        String(50),
        default="other",
        nullable=False
    )
    
    # Storage path
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    def __repr__(self) -> str:
        return f"<PaperFile(id={self.id}, filename={self.filename}, size={self.file_size})>"
