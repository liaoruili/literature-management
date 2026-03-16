"""Citation API endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, PaperDependency
from app.models.citation import Citation
from app.models.paper import Paper
from app.schemas.citation import (
    CitationListResponse,
    CitationMetrics,
    CitationResponse,
    CitationUpdateRequest,
)
from app.schemas.task import TaskResponse

router = APIRouter()


@router.get("/papers/{paper_id}", response_model=CitationListResponse)
async def list_citations(
    paper_id: uuid.UUID,
    db: DbSession,
    paper: PaperDependency,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CitationListResponse:
    """List all citations for a specific paper."""
    query = select(Citation).where(Citation.paper_id == paper_id)
    query = query.order_by(Citation.created_at.desc())

    # Get total count
    from sqlalchemy import func

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    citations = result.scalars().all()

    return CitationListResponse(
        items=[CitationResponse.model_validate(c) for c in citations],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/update", response_model=TaskResponse)
async def update_citations(
    update_request: CitationUpdateRequest,
    db: DbSession,
) -> dict:
    """Trigger citation count update for papers."""
    from datetime import datetime
    import uuid as uuid_module

    from app.models.task import Task

    # If no paper IDs provided, update all papers
    paper_ids = update_request.paper_ids
    if not paper_ids:
        result = await db.execute(select(Paper.id))
        paper_ids = [row[0] for row in result.fetchall()]

    # Create a task record
    task = Task(
        id=uuid_module.uuid4(),
        task_type="citation_update",
        status="pending",
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


@router.get("/papers/{paper_id}/metrics", response_model=CitationMetrics)
async def get_citation_metrics(
    paper_id: uuid.UUID,
    db: DbSession,
    paper: PaperDependency,
) -> CitationMetrics:
    """Get citation metrics for a specific paper."""
    # Get citation history
    query = select(Citation).where(Citation.paper_id == paper_id)
    query = query.order_by(Citation.created_at.desc())

    result = await db.execute(query)
    citations = result.scalars().all()

    # Build history (grouped by date)
    from collections import defaultdict
    from datetime import date

    history_map = defaultdict(int)
    for citation in citations:
        if citation.citation_date:
            history_map[citation.citation_date] += 1

    history = [
        {"date": d, "citation_count": count}
        for d, count in sorted(history_map.items())
    ]

    return CitationMetrics(
        current_count=paper.citation_count,
        last_updated=paper.last_citation_update,
        history=history[:100],  # Limit to 100 entries
    )
