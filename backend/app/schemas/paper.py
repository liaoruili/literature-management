"""Pydantic schemas for Paper model."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AuthorBase(BaseModel):
    """Author information schema."""

    name: str
    affiliation: Optional[str] = None


class PaperBase(BaseModel):
    """Base schema for paper data."""

    title: str = Field(..., min_length=1, max_length=2000)
    authors: list[AuthorBase]
    journal: Optional[str] = Field(None, max_length=500)
    year: int = Field(..., ge=1900, le=2100)
    volume: Optional[str] = Field(None, max_length=50)
    number: Optional[str] = Field(None, max_length=50)
    pages: Optional[str] = Field(None, max_length=100)
    doi: Optional[str] = Field(None, max_length=200)
    abstract: Optional[str] = None
    keywords: list[str] = Field(default_factory=list)
    jel_codes: list[str] = Field(default_factory=list)
    url: Optional[str] = Field(None, max_length=1000)
    note: Optional[str] = None


class PaperCreate(PaperBase):
    """Schema for creating a new paper."""

    pass


class PaperUpdate(BaseModel):
    """Schema for updating an existing paper."""

    title: Optional[str] = Field(None, min_length=1, max_length=2000)
    authors: Optional[list[AuthorBase]] = None
    journal: Optional[str] = Field(None, max_length=500)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    volume: Optional[str] = Field(None, max_length=50)
    number: Optional[str] = Field(None, max_length=50)
    pages: Optional[str] = Field(None, max_length=100)
    doi: Optional[str] = Field(None, max_length=200)
    abstract: Optional[str] = None
    keywords: Optional[list[str]] = None
    jel_codes: Optional[list[str]] = None
    url: Optional[str] = Field(None, max_length=1000)
    note: Optional[str] = None
    citation_count: Optional[int] = None
    last_citation_update: Optional[datetime] = None


class PaperResponse(PaperBase):
    """Schema for paper response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    citation_key: str
    pdf_path: Optional[str] = None
    pdf_uploaded: bool = False
    has_files: bool = False  # Indicates if paper has any attached files
    citation_count: int = 0
    last_citation_update: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    @property
    def author_names(self) -> list[str]:
        """Get list of author names."""
        return [author.name for author in self.authors]


class PaperListResponse(BaseModel):
    """Schema for paginated paper list response."""

    items: list[PaperResponse]
    total: int
    page: int
    page_size: int
    pages: int


class BibTeXResponse(BaseModel):
    """Schema for BibTeX export response."""

    citation_key: str
    bibtex: str


class PaperSearchRequest(BaseModel):
    """Schema for paper search request."""

    query: Optional[str] = None
    journal: Optional[str] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    jel_code: Optional[str] = None
    keywords: Optional[list[str]] = None
    has_pdf: Optional[bool] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    sort_by: str = "year"  # year, created_at, citation_count
    sort_order: str = "desc"  # asc, desc


class PaperStats(BaseModel):
    """Schema for paper statistics."""

    total_papers: int
    papers_with_pdf: int
    total_notes: int
    avg_citation_count: float
    journals_count: int
    year_distribution: dict[int, int]


class BibtexParseRequest(BaseModel):
    """Schema for BibTeX parse request."""

    bibtex: str


class BibtexParseResponse(PaperBase):
    """Schema for parsed BibTeX data."""

    pass
