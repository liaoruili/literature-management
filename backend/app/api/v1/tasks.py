"""Task API endpoints."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession
from app.models.task import Task
from app.schemas.task import TaskListResponse, TaskResponse, TaskStatus

router = APIRouter()


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    task_type: str | None = None,
    status: str | None = None,
) -> TaskListResponse:
    """List all background tasks."""
    query = select(Task)

    if task_type:
        query = query.where(Task.task_type == task_type)

    if status:
        query = query.where(Task.status == status)

    query = query.order_by(Task.created_at.desc())

    # Get total count
    from sqlalchemy import func

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    tasks = result.scalars().all()

    return TaskListResponse(
        items=[TaskResponse.model_validate(t) for t in tasks],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID,
    db: DbSession,
) -> Task:
    """Get a specific task by ID."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Task not found")

    return task


@router.get("/{task_id}/status", response_model=TaskStatus)
async def get_task_status(
    task_id: uuid.UUID,
    db: DbSession,
) -> dict:
    """Get task status and progress."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "task_id": task.id,
        "status": task.status,
        "progress": task.progress,
        "error_message": task.error_message,
        "result": task.result,
    }
