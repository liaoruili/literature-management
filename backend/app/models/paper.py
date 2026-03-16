"""Paper model for academic literature."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.note import Note
    from app.models.citation import Citation


class Paper(Base):
    """Model for academic paper metadata."""

    __tablename__ = "papers"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Citation key for LaTeX (e.g., smith2024aer)
    citation_key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    # Core BibTeX fields
    title: Mapped[str] = mapped_column(Text, nullable=False)
    authors: Mapped[dict] = mapped_column(JSONB, nullable=False)  # [{name, affiliation}]
    journal: Mapped[Optional[str]] = mapped_column(String(500), index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    volume: Mapped[Optional[str]] = mapped_column(String(50))
    number: Mapped[Optional[str]] = mapped_column(String(50))
    pages: Mapped[Optional[str]] = mapped_column(String(100))
    doi: Mapped[Optional[str]] = mapped_column(
        String(200),
        unique=True,
        index=True,
    )

    # Recommended fields
    abstract: Mapped[Optional[str]] = mapped_column(Text)
    keywords: Mapped[Optional[list]] = mapped_column(
        JSONB,
        default=list,
    )
    jel_codes: Mapped[Optional[list]] = mapped_column(
        JSONB,
        default=list,
    )  # JEL classification codes
    url: Mapped[Optional[str]] = mapped_column(String(1000))
    note: Mapped[Optional[str]] = mapped_column(Text)

    # PDF storage
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500))
    pdf_uploaded: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Temporary field for file count (not persisted to database)
    has_files: bool = False

    # Citation metrics
    citation_count: Mapped[int] = mapped_column(Integer, default=0)
    last_citation_update: Mapped[Optional[datetime]] = mapped_column(DateTime)

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
    notes: Mapped[list["Note"]] = relationship(
        "Note",
        back_populates="paper",
        cascade="all, delete-orphan",
    )
    citations: Mapped[list["Citation"]] = relationship(
        "Citation",
        back_populates="paper",
        cascade="all, delete-orphan",
    )

    # Table indexes
    __table_args__ = (
        Index("idx_papers_authors", "authors", postgresql_using="gin"),
        Index("idx_papers_keywords", "keywords", postgresql_using="gin"),
        Index("idx_papers_jel_codes", "jel_codes", postgresql_using="gin"),
        Index("idx_papers_year_journal", "year", "journal"),
    )

    def generate_citation_key(self) -> str:
        """Generate LaTeX citation key from authors and year."""
        if not self.authors:
            return f"unknown{self.year}"

        # Get first author's last name
        first_author = self.authors[0].get("name", "")
        last_name = first_author.split()[-1].lower() if first_author else "unknown"

        # Remove non-alphabetic characters
        last_name = "".join(c for c in last_name if c.isalpha())

        # Generate key: lastname + year
        citation_key = f"{last_name}{self.year}"

        return citation_key

    def to_bibtex(self) -> str:
        """Convert paper to BibTeX format."""
        bibtex = f"@article{{{self.citation_key},\n"
        bibtex += f'  author = {{{" and ".join(a["name"] for a in self.authors)}}},\n'
        bibtex += f'  title = {{{self.title}}},\n'

        if self.journal:
            bibtex += f"  journal = {{{self.journal}}},\n"

        bibtex += f"  year = {{{self.year}}},\n"

        if self.volume:
            bibtex += f"  volume = {{{self.volume}}},\n"

        if self.number:
            bibtex += f"  number = {{{self.number}}},\n"

        if self.pages:
            bibtex += f"  pages = {{{self.pages}}},\n"

        if self.doi:
            bibtex += f"  doi = {{{self.doi}}},\n"

        if self.abstract:
            bibtex += f"  abstract = {{{self.abstract}}},\n"

        if self.keywords:
            bibtex += f'  keywords = {{{", ".join(self.keywords)}}},\n'

        if self.jel_codes:
            bibtex += f'  jelcodes = {{{", ".join(self.jel_codes)}}},\n'

        if self.url:
            bibtex += f"  url = {{{self.url}}},\n"

        if self.note:
            bibtex += f"  note = {{{self.note}}},\n"

        bibtex += "}\n"
        return bibtex

    def __repr__(self) -> str:
        return f"<Paper(id={self.id}, citation_key='{self.citation_key}', title='{self.title[:50]}...')>"
