"""Tasks package."""

from app.tasks.celery_app import celery_app
from app.tasks.citation_updater import update_all_citations, update_paper_citations
from app.tasks.metadata_scraper import scrape_all_journals, scrape_journal_metadata
from app.tasks.scheduled_tasks import cleanup_old_tasks

__all__ = [
    "celery_app",
    "update_all_citations",
    "update_paper_citations",
    "scrape_all_journals",
    "scrape_journal_metadata",
    "cleanup_old_tasks",
]
