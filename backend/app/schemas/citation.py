"""Pydantic schemas for Citation model."""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CitationBase(BaseModel):
    """Base schema for citation data."""

    citing_paper_title: Optional[str] = Field(None, max_length=2000)
    citing_paper_doi: Optional[str] = Field(None, max_length=200)
    citation_date: Optional[date] = None
    source_database: Optional[str] = Field(None, max_length=100)


class CitationCreate(CitationBase):
    """Schema for creating a new citation record."""

    paper_id: uuid.UUID


class CitationResponse(CitationBase):
    """Schema for citation response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    paper_id: uuid.UUID
    citing_paper_id: Optional[uuid.UUID] = None
    created_at: datetime


class CitationListResponse(BaseModel):
    """Schema for paginated citation list response."""

    items: list[CitationResponse]
    total: int
    page: int = 1
    page_size: int = 20


class CitationUpdateRequest(BaseModel):
    """Schema for requesting citation count update."""

    paper_ids: Optional[list[uuid.UUID]] = None
    force_update: bool = False


class CitationHistory(BaseModel):
    """Schema for citation count history."""

    date: date
    citation_count: int
    source: str


class CitationMetrics(BaseModel):
    """Schema for citation metrics."""

    current_count: int
    last_updated: Optional[datetime] = None
    history: list[CitationHistory] = Field(default_factory=list)
