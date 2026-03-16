"""Search API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession
from app.models.paper import Paper
from app.schemas.paper import PaperListResponse, PaperResponse, PaperSearchRequest

router = APIRouter()


@router.get("", response_model=PaperListResponse)
async def search_papers(
    db: DbSession,
    q: Optional[str] = Query(None, description="Search query"),
    journal: Optional[str] = Query(None, description="Filter by journal"),
    year_from: Optional[int] = Query(None, ge=1900, description="Search from year"),
    year_to: Optional[int] = Query(None, ge=1900, description="Search to year"),
    jel_code: Optional[str] = Query(None, description="Filter by JEL code"),
    keywords: Optional[str] = Query(None, description="Filter by keywords (comma-separated)"),
    has_pdf: Optional[bool] = Query(None, description="Filter by PDF availability"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("year", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
) -> PaperListResponse:
    """Search papers with full-text search and filters."""
    # Build base query
    query = select(Paper)
    conditions = []

    # Full-text search
    if q:
        search_filter = or_(
            func.lower(Paper.title).like(f"%{q.lower()}%"),
            func.lower(Paper.abstract).like(f"%{q.lower()}%"),
        )
        conditions.append(search_filter)

    # Journal filter
    if journal:
        conditions.append(func.lower(Paper.journal) == func.lower(journal))

    # Year range
    if year_from:
        conditions.append(Paper.year >= year_from)
    if year_to:
        conditions.append(Paper.year <= year_to)

    # JEL code filter (JSONB array contains)
    if jel_code:
        conditions.append(Paper.jel_codes.contains([jel_code]))

    # Keywords filter
    if keywords:
        keyword_list = [k.strip().lower() for k in keywords.split(",")]
        for keyword in keyword_list:
            conditions.append(
                Paper.keywords.cast(str).ilike(f"%{keyword}%")
            )

    # PDF filter
    if has_pdf is not None:
        conditions.append(Paper.pdf_uploaded == has_pdf)

    # Apply all conditions
    if conditions:
        query = query.where(and_(*conditions))

    # Sorting
    sort_field = getattr(Paper, sort_by, Paper.year)
    if sort_order.lower() == "desc":
        query = query.order_by(sort_field.desc(), Paper.created_at.desc())
    else:
        query = query.order_by(sort_field.asc(), Paper.created_at.asc())

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    # Execute query
    result = await db.execute(query)
    papers = result.scalars().all()

    return PaperListResponse(
        items=[PaperResponse.model_validate(p) for p in papers],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/advanced")
async def advanced_search(
    db: DbSession,
    request: PaperSearchRequest = Depends(),
) -> PaperListResponse:
    """Advanced search with complex filtering options."""
    # This endpoint accepts a JSON body for more complex searches
    # Implementation similar to search_papers but with request body
    return await search_papers(
        db=db,
        q=request.query,
        journal=request.journal,
        year_from=request.year_from,
        year_to=request.year_to,
        jel_code=request.jel_code,
        keywords=",".join(request.keywords) if request.keywords else None,
        has_pdf=request.has_pdf,
        page=request.page,
        page_size=request.page_size,
        sort_by=request.sort_by,
        sort_order=request.sort_order,
    )
