"""Metadata scraping tasks."""

import logging
from datetime import datetime
from typing import Any

from celery import Task
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.journal import Journal
from app.models.paper import Paper
from app.models.task import Task as TaskModel
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def scrape_journal_metadata(self: Task, journal_id: str) -> dict[str, Any]:
    """Scrape metadata from a specific journal."""
    import asyncio
    import uuid

    async def _scrape():
        async with AsyncSessionLocal() as db:
            # Get journal
            result = await db.execute(select(Journal).where(Journal.id == uuid.UUID(journal_id)))
            journal = result.scalar_one_or_none()

            if not journal:
                return {"status": "error", "message": "Journal not found"}

            # Create task record
            task = TaskModel(
                task_type="metadata_scrape",
                status="running",
                journal_id=journal.id,
                started_at=datetime.utcnow(),
            )
            db.add(task)
            await db.commit()

            try:
                # Implement actual scraping logic here
                # This is a placeholder for the scraping implementation
                papers_scraped = await _scrape_journal_website(journal)

                # Update task status
                task.status = "completed"
                task.completed_at = datetime.utcnow()
                task.progress = 100
                task.result = {"papers_scraped": papers_scraped}

                # Update journal last_update
                journal.last_update = datetime.utcnow()

                await db.commit()

                return {
                    "status": "success",
                    "journal_id": str(journal.id),
                    "papers_scraped": papers_scraped,
                }

            except Exception as e:
                task.status = "failed"
                task.error_message = str(e)
                await db.commit()
                raise

    try:
        return asyncio.run(_scrape())
    except Exception as e:
        logger.error(f"Error scraping journal {journal_id}: {e}")
        raise self.retry(exc=e, countdown=300)


@celery_app.task(bind=True)
def scrape_all_journals(self: Task) -> dict[str, Any]:
    """Scrape metadata from all configured journals."""
    import asyncio

    async def _scrape_all():
        async with AsyncSessionLocal() as db:
            # Get all journals with auto-update enabled
            result = await db.execute(
                select(Journal).where(Journal.auto_update_enabled == True)
            )
            journals = result.scalars().all()

            total_papers = 0
            results = []

            for journal in journals:
                try:
                    # Queue individual scraping tasks
                    papers_count = await _scrape_journal_website(journal)
                    total_papers += papers_count
                    journal.last_update = datetime.utcnow()

                    results.append({
                        "journal_id": str(journal.id),
                        "journal_name": journal.name,
                        "papers_scraped": papers_count,
                    })
                except Exception as e:
                    logger.error(f"Error scraping {journal.name}: {e}")
                    results.append({
                        "journal_id": str(journal.id),
                        "journal_name": journal.name,
                        "error": str(e),
                    })

            await db.commit()

            return {
                "status": "completed",
                "total_journals": len(journals),
                "total_papers_scraped": total_papers,
                "results": results,
            }

    try:
        return asyncio.run(_scrape_all())
    except Exception as e:
        logger.error(f"Error scraping all journals: {e}")
        raise self.retry(exc=e, countdown=600)


async def _scrape_journal_website(journal: Journal) -> int:
    """
    Actual scraping implementation for a journal website.

    This is a placeholder - implement actual scraping logic based on
    each journal's website structure.

    Returns:
        Number of papers scraped
    """
    # TODO: Implement actual scraping using Playwright/BeautifulSoup
    # Example sources:
    # - AEA Journals (aer.aeaweb.org)
    # - Elsevier journals
    # - JSTOR
    # - Publisher websites

    logger.info(f"Scraping {journal.name} from {journal.metadata_source or 'unknown source'}")

    # Placeholder implementation
    return 0
