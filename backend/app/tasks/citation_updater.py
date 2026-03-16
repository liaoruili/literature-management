"""Citation update tasks."""

import logging
from datetime import datetime
from typing import Any

import httpx
from celery import Task
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.citation import Citation
from app.models.paper import Paper
from app.models.task import Task as TaskModel
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def update_paper_citations(self: Task, paper_id: str) -> dict[str, Any]:
    """Update citation count for a specific paper."""
    import asyncio
    import uuid

    async def _update():
        async with AsyncSessionLocal() as db:
            # Get paper
            result = await db.execute(select(Paper).where(Paper.id == uuid.UUID(paper_id)))
            paper = result.scalar_one_or_none()

            if not paper:
                return {"status": "error", "message": "Paper not found"}

            if not paper.doi:
                return {"status": "skipped", "reason": "No DOI available"}

            try:
                # Fetch citation count from Crossref
                citation_count = await _fetch_citations_from_crossref(paper.doi)

                if citation_count is not None and citation_count != paper.citation_count:
                    # Create citation record if count increased
                    if citation_count > paper.citation_count:
                        # Log the update (in production, track individual citations)
                        pass

                    # Update paper citation count
                    paper.citation_count = citation_count
                    paper.last_citation_update = datetime.utcnow()

                await db.commit()

                return {
                    "status": "success",
                    "paper_id": str(paper.id),
                    "citation_count": citation_count or paper.citation_count,
                    "updated": citation_count is not None,
                }

            except Exception as e:
                logger.error(f"Error updating citations for {paper.title}: {e}")
                raise

    try:
        return asyncio.run(_update())
    except Exception as e:
        logger.error(f"Error in update_paper_citations: {e}")
        raise self.retry(exc=e, countdown=300)


@celery_app.task(bind=True)
def update_all_citations(self: Task) -> dict[str, Any]:
    """Update citation counts for all papers with DOI."""
    import asyncio

    async def _update_all():
        async with AsyncSessionLocal() as db:
            # Get all papers with DOI
            result = await db.execute(select(Paper).where(Paper.doi.isnot(None)))
            papers = result.scalars().all()

            total_updated = 0
            results = []

            for paper in papers:
                try:
                    citation_count = await _fetch_citations_from_crossref(paper.doi)

                    if citation_count is not None:
                        if citation_count != paper.citation_count:
                            paper.citation_count = citation_count
                            paper.last_citation_update = datetime.utcnow()
                            total_updated += 1

                        results.append({
                            "paper_id": str(paper.id),
                            "doi": paper.doi,
                            "citation_count": citation_count,
                        })
                except Exception as e:
                    logger.error(f"Error updating citations for {paper.doi}: {e}")
                    results.append({
                        "paper_id": str(paper.id),
                        "doi": paper.doi,
                        "error": str(e),
                    })

            await db.commit()

            return {
                "status": "completed",
                "total_papers": len(papers),
                "papers_updated": total_updated,
                "results": results[:100],  # Limit output
            }

    try:
        return asyncio.run(_update_all())
    except Exception as e:
        logger.error(f"Error updating all citations: {e}")
        raise self.retry(exc=e, countdown=600)


async def _fetch_citations_from_crossref(doi: str) -> int | None:
    """
    Fetch citation count from Crossref API.

    Args:
        doi: Digital Object Identifier of the paper

    Returns:
        Citation count or None if unavailable
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            url = f"{settings.CROSSREF_API_URL}/{doi}"
            response = await client.get(url)

            if response.status_code == 200:
                data = response.json()
                message = data.get("message", {})
                return message.get("is-referenced-by-count", 0)

        except httpx.HTTPError as e:
            logger.warning(f"Crossref API error for DOI {doi}: {e}")
        except Exception as e:
            logger.warning(f"Error fetching citations from Crossref: {e}")

    return None


async def _fetch_citations_from_semantic_scholar(doi: str) -> int | None:
    """
    Fetch citation count from Semantic Scholar API.

    Alternative source when Crossref doesn't have data.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            url = f"{settings.SEMANTIC_SCHOLAR_API_URL}/DOI:{doi}"
            params = {"fields": "citationCount"}
            response = await client.get(url, params=params)

            if response.status_code == 200:
                data = response.json()
                return data.get("citationCount", 0)

        except httpx.HTTPError as e:
            logger.warning(f"Semantic Scholar API error for DOI {doi}: {e}")
        except Exception as e:
            logger.warning(f"Error fetching citations from Semantic Scholar: {e}")

    return None
