"""Pydantic schemas for Journal model."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class JournalBase(BaseModel):
    """Base schema for journal data."""

    name: str = Field(..., min_length=1, max_length=500)
    abbreviation: Optional[str] = Field(None, max_length=100)
    issn: Optional[str] = Field(None, max_length=20)
    publisher: Optional[str] = Field(None, max_length=200)
    website_url: Optional[str] = Field(None, max_length=500)
    metadata_source: Optional[str] = Field(None, max_length=100)


class JournalCreate(JournalBase):
    """Schema for creating a new journal."""

    auto_update_enabled: bool = True
    update_frequency_days: int = Field(30, ge=1, le=365)


class JournalUpdate(BaseModel):
    """Schema for updating an existing journal."""

    name: Optional[str] = Field(None, min_length=1, max_length=500)
    abbreviation: Optional[str] = Field(None, max_length=100)
    issn: Optional[str] = Field(None, max_length=20)
    publisher: Optional[str] = Field(None, max_length=200)
    website_url: Optional[str] = Field(None, max_length=500)
    metadata_source: Optional[str] = Field(None, max_length=100)
    auto_update_enabled: Optional[bool] = None
    update_frequency_days: Optional[int] = Field(None, ge=1, le=365)
    last_update: Optional[datetime] = None


class JournalResponse(JournalBase):
    """Schema for journal response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    auto_update_enabled: bool
    update_frequency_days: int
    last_update: Optional[datetime] = None
    created_at: datetime


class JournalListResponse(BaseModel):
    """Schema for paginated journal list response."""

    items: list[JournalResponse]
    total: int
    page: int = 1
    page_size: int = 20


class JournalScrapeRequest(BaseModel):
    """Schema for requesting journal metadata scraping."""

    journal_ids: Optional[list[uuid.UUID]] = None
    force_update: bool = False
