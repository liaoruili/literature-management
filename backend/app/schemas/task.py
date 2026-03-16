"""Pydantic schemas for Task model."""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class TaskBase(BaseModel):
    """Base schema for task data."""

    task_type: str = Field(..., max_length=50)
    status: str = Field(..., max_length=20)


class TaskCreate(TaskBase):
    """Schema for creating a new task."""

    paper_id: Optional[uuid.UUID] = None
    journal_id: Optional[uuid.UUID] = None


class TaskUpdate(BaseModel):
    """Schema for updating a task."""

    status: Optional[str] = Field(None, max_length=20)
    progress: Optional[int] = Field(None, ge=0, le=100)
    error_message: Optional[str] = None
    result: Optional[dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class TaskResponse(TaskBase):
    """Schema for task response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    paper_id: Optional[uuid.UUID] = None
    journal_id: Optional[uuid.UUID] = None
    progress: int = 0
    error_message: Optional[str] = None
    result: Optional[dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime


class TaskListResponse(BaseModel):
    """Schema for paginated task list response."""

    items: list[TaskResponse]
    total: int
    page: int = 1
    page_size: int = 20


class TaskStatus(BaseModel):
    """Schema for task status response."""

    task_id: uuid.UUID
    status: str
    progress: int
    error_message: Optional[str] = None
    result: Optional[dict[str, Any]] = None
