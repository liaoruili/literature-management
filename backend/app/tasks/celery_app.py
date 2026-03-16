"""Celery configuration and application."""

from celery import Celery
from celery.schedules import crontab

from app.config import settings


# Create Celery application
celery_app = Celery(
    "literature_database",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.scheduled_tasks",
        "app.tasks.metadata_scraper",
        "app.tasks.citation_updater",
    ],
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    task_soft_time_limit=3300,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)

# Scheduled tasks configuration
celery_app.conf.beat_schedule = {
    # Update citations daily at 2 AM
    "update-citations-daily": {
        "task": "app.tasks.citation_updater.update_all_citations",
        "schedule": crontab(hour=2, minute=0),
    },
    # Scrape journals weekly on Sunday at 3 AM
    "scrape-journals-weekly": {
        "task": "app.tasks.metadata_scraper.scrape_all_journals",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),
    },
    # Clean up old tasks monthly
    "cleanup-old-tasks": {
        "task": "app.tasks.scheduled_tasks.cleanup_old_tasks",
        "schedule": crontab(hour=4, minute=0, day_of_month=1),
    },
}
