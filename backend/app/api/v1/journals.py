"""Journal API endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, JournalDependency
from app.models.journal import Journal
from app.schemas.journal import (
    JournalCreate,
    JournalListResponse,
    JournalResponse,
    JournalScrapeRequest,
    JournalUpdate,
)
from app.schemas.task import TaskResponse

router = APIRouter()


@router.post("", response_model=JournalResponse, status_code=status.HTTP_201_CREATED)
async def create_journal(
    journal_data: JournalCreate,
    db: DbSession,
) -> Journal:
    """Create a new journal to track."""
    journal = Journal(**journal_data.model_dump())

    db.add(journal)
    await db.commit()
    await db.refresh(journal)

    return journal


@router.get("", response_model=JournalListResponse)
async def list_journals(
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    auto_update: bool | None = None,
) -> JournalListResponse:
    """List all tracked journals."""
    query = select(Journal)

    if auto_update is not None:
        query = query.where(Journal.auto_update_enabled == auto_update)

    query = query.order_by(Journal.name)

    # Get total count
    from sqlalchemy import func

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    journals = result.scalars().all()

    return JournalListResponse(
        items=[JournalResponse.model_validate(j) for j in journals],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{journal_id}", response_model=JournalResponse)
async def get_journal(journal: JournalDependency) -> Journal:
    """Get a specific journal by ID."""
    return journal


@router.put("/{journal_id}", response_model=JournalResponse)
async def update_journal(
    journal_data: JournalUpdate,
    journal: JournalDependency,
    db: DbSession,
) -> Journal:
    """Update an existing journal."""
    update_data = journal_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(journal, field, value)

    await db.commit()
    await db.refresh(journal)

    return journal


@router.delete("/{journal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal(
    journal: JournalDependency,
    db: DbSession,
) -> None:
    """Delete a journal."""
    await db.delete(journal)
    await db.commit()


@router.post("/scrape", response_model=TaskResponse)
async def scrape_journals(
    scrape_request: JournalScrapeRequest,
    db: DbSession,
) -> dict:
    """Trigger metadata scraping for journals."""
    from datetime import datetime
    import uuid as uuid_module

    # Create a task record
    from app.models.task import Task

    task = Task(
        id=uuid_module.uuid4(),
        task_type="metadata_scrape",
        status="pending",
        journal_id=scrape_request.journal_ids[0] if scrape_request.journal_ids else None,
        progress=0,
        created_at=datetime.utcnow(),
    )

    db.add(task)
    await db.commit()
    await db.refresh(task)

    # In production, this would trigger a Celery task
    # For now, return the task info
    return {
        "id": task.id,
        "task_type": task.task_type,
        "status": task.status,
        "progress": task.progress,
        "created_at": task.created_at,
    }
