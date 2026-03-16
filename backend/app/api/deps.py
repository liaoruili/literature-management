"""API dependency injection."""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.paper import Paper
from app.models.note import Note
from app.models.journal import Journal


# Type aliases for dependencies
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_paper_or_404(
    paper_id: uuid.UUID,
    db: DbSession,
) -> Paper:
    """Get paper by ID or raise 404."""
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()

    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with id {paper_id} not found",
        )

    return paper


async def get_note_or_404(
    note_id: uuid.UUID,
    db: DbSession,
) -> Note:
    """Get note by ID or raise 404."""
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note with id {note_id} not found",
        )

    return note


async def get_journal_or_404(
    journal_id: uuid.UUID,
    db: DbSession,
) -> Journal:
    """Get journal by ID or raise 404."""
    result = await db.execute(select(Journal).where(Journal.id == journal_id))
    journal = result.scalar_one_or_none()

    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journal with id {journal_id} not found",
        )

    return journal


# Reusable dependency types
PaperDependency = Annotated[Paper, Depends(get_paper_or_404)]
NoteDependency = Annotated[Note, Depends(get_note_or_404)]
JournalDependency = Annotated[Journal, Depends(get_journal_or_404)]
