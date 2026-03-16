"""Pydantic schemas for Note model."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class NoteBase(BaseModel):
    """Base schema for note data."""

    content: str = Field(..., min_length=1)
    tags: list[str] = Field(default_factory=list)


class NoteCreate(NoteBase):
    """Schema for creating a new note."""

    ai_generated: bool = False
    ai_model: Optional[str] = Field(None, max_length=100)


class NoteUpdate(BaseModel):
    """Schema for updating an existing note."""

    content: Optional[str] = Field(None, min_length=1)
    tags: Optional[list[str]] = None


class NoteResponse(NoteBase):
    """Schema for note response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    paper_id: uuid.UUID
    ai_generated: bool = False
    ai_model: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class NoteListResponse(BaseModel):
    """Schema for paginated note list response."""

    items: list[NoteResponse]
    total: int
    page: int = 1
    page_size: int = 20


class NoteWithPaperResponse(NoteResponse):
    """Schema for note response with paper information."""

    paper_title: str
    paper_citation_key: str
