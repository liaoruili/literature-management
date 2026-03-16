"""Schemas for paper files."""

from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class PaperFileBase(BaseModel):
    """Base schema for paper file."""
    
    description: str | None = Field(None, max_length=1000)
    category: str = Field(default="other", description="File category: pdf, supplementary_data, code, other")


class PaperFileCreate(PaperFileBase):
    """Schema for creating a paper file."""
    pass


class PaperFileUpdate(PaperFileBase):
    """Schema for updating a paper file."""
    pass


class PaperFileResponse(PaperFileBase):
    """Schema for paper file response."""
    
    id: uuid.UUID
    paper_id: uuid.UUID
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    file_path: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PaperFileListResponse(BaseModel):
    """Schema for list of paper files."""
    
    items: list[PaperFileResponse]
    total: int
