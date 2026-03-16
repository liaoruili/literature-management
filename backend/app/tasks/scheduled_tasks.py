"""Scheduled background tasks."""

import logging
from datetime import datetime, timedelta

from celery import Task
from sqlalchemy import delete, select

from app.database import AsyncSessionLocal
from app.models.task import Task
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def cleanup_old_tasks(self: Task, days_old: int = 30) -> dict:
    """Clean up completed tasks older than specified days."""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        import asyncio

        async def _cleanup():
            async with AsyncSessionLocal() as db:
                # Delete old completed/failed tasks
                stmt = delete(Task).where(
                    (Task.status.in_(["completed", "failed"]))
                    & (Task.created_at < cutoff_date)
                )
                result = await db.execute(stmt)
                await db.commit()
                return result.rowcount

        deleted_count = asyncio.run(_cleanup())

        logger.info(f"Cleaned up {deleted_count} old tasks")

        return {
            "status": "success",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
        }

    except Exception as e:
        logger.error(f"Error cleaning up tasks: {e}")
        raise self.retry(exc=e, countdown=300)
