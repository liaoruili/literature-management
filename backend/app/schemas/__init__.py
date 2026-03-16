"""Pydantic schemas package."""

from app.schemas.citation import (
    CitationCreate,
    CitationHistory,
    CitationListResponse,
    CitationMetrics,
    CitationResponse,
    CitationUpdateRequest,
)
from app.schemas.journal import (
    JournalCreate,
    JournalListResponse,
    JournalResponse,
    JournalScrapeRequest,
    JournalUpdate,
)
from app.schemas.note import (
    NoteCreate,
    NoteListResponse,
    NoteResponse,
    NoteUpdate,
    NoteWithPaperResponse,
)
from app.schemas.paper import (
    BibTeXResponse,
    PaperCreate,
    PaperListResponse,
    PaperResponse,
    PaperSearchRequest,
    PaperStats,
    PaperUpdate,
)
from app.schemas.task import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskStatus,
    TaskUpdate,
)

__all__ = [
    # Paper
    "PaperCreate",
    "PaperUpdate",
    "PaperResponse",
    "PaperListResponse",
    "BibTeXResponse",
    "PaperSearchRequest",
    "PaperStats",
    # Note
    "NoteCreate",
    "NoteUpdate",
    "NoteResponse",
    "NoteListResponse",
    "NoteWithPaperResponse",
    # Journal
    "JournalCreate",
    "JournalUpdate",
    "JournalResponse",
    "JournalListResponse",
    "JournalScrapeRequest",
    # Citation
    "CitationCreate",
    "CitationResponse",
    "CitationListResponse",
    "CitationUpdateRequest",
    "CitationMetrics",
    "CitationHistory",
    # Task
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "TaskListResponse",
    "TaskStatus",
]
