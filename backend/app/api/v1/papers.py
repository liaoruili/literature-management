"""Paper API endpoints."""

import uuid
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, PaperDependency
from app.models.paper import Paper
from app.schemas.paper import (
    BibTeXResponse,
    BibtexParseResponse,
    PaperCreate,
    PaperListResponse,
    PaperResponse,
    PaperUpdate,
)

router = APIRouter()


@router.get("/fetch-doi", response_model=BibtexParseResponse)
async def fetch_doi_metadata(doi: str = Query(..., description="DOI to fetch metadata for")) -> BibtexParseResponse:
    """Fetch metadata from Crossref API using DOI."""
    from app.services.doi_fetcher import DOIMetadataFetcher
    
    result = await DOIMetadataFetcher.fetch_by_doi(doi)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not fetch metadata for DOI: {doi}"
        )
    
    return BibtexParseResponse(**result)


@router.post("", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def create_paper(
    paper_data: PaperCreate,
    db: DbSession,
) -> Paper:
    """Create a new academic paper."""
    # Generate citation key
    citation_key = await _generate_unique_citation_key(paper_data.authors[0].name, paper_data.year, db)

    # Create paper instance
    paper = Paper(
        citation_key=citation_key,
        title=paper_data.title,
        authors=[author.model_dump() for author in paper_data.authors],
        journal=paper_data.journal,
        year=paper_data.year,
        volume=paper_data.volume,
        number=paper_data.number,
        pages=paper_data.pages,
        doi=paper_data.doi,
        abstract=paper_data.abstract,
        keywords=paper_data.keywords,
        jel_codes=paper_data.jel_codes,
        url=paper_data.url,
        note=paper_data.note,
    )

    db.add(paper)
    await db.commit()
    await db.refresh(paper)

    return paper


@router.get("", response_model=PaperListResponse)
async def list_papers(
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    journal: str | None = None,
    year: int | None = None,
    has_pdf: bool | None = None,
) -> PaperListResponse:
    """List all papers with pagination and filtering."""
    from sqlalchemy import text
    
    # Build query with files count
    query = text("""
        SELECT p.*, 
               CASE WHEN COUNT(pf.id) > 0 THEN true ELSE false END as has_files
        FROM papers p
        LEFT JOIN paper_files pf ON p.id = pf.paper_id
        WHERE 1=1
    """)
    
    conditions = []
    params = {}
    
    if journal:
        conditions.append("LOWER(p.journal) = LOWER(:journal)")
        params['journal'] = journal
    
    if year:
        conditions.append("p.year = :year")
        params['year'] = year
    
    if has_pdf is not None:
        conditions.append("p.pdf_uploaded = :has_pdf")
        params['has_pdf'] = has_pdf
    
    where_clause = " AND ".join(conditions)
    if where_clause:
        query = text(str(query) + " AND " + where_clause)
    
    # Group by paper id
    query = text(str(query) + " GROUP BY p.id ORDER BY p.year DESC, p.created_at DESC")
    
    # Get total count
    count_query = text("""
        SELECT COUNT(DISTINCT p.id) 
        FROM papers p
        WHERE 1=1
    """ + (" AND " + where_clause if where_clause else ""))
    
    total_result = await db.execute(count_query, params)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    params['limit'] = page_size
    params['offset'] = offset
    
    paginated_query = text(str(query) + " LIMIT :limit OFFSET :offset")
    
    # Execute query
    result = await db.execute(paginated_query, params)
    rows = result.fetchall()
    
    # Convert to Paper objects
    papers = []
    for row in rows:
        paper_dict = dict(row._mapping)
        has_files = paper_dict.pop('has_files', False)
        paper = Paper(**{k: v for k, v in paper_dict.items() if k != 'has_files'})
        paper.has_files = has_files  # type: ignore
        papers.append(paper)
    
    return PaperListResponse(
        items=[PaperResponse.model_validate(p) for p in papers],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/{paper_id}", response_model=PaperResponse)
async def get_paper(paper: PaperDependency) -> Paper:
    """Get a specific paper by ID."""
    return paper


@router.put("/{paper_id}", response_model=PaperResponse)
async def update_paper(
    paper_data: PaperUpdate,
    paper: PaperDependency,
    db: DbSession,
) -> Paper:
    """Update an existing paper."""
    update_data = paper_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(paper, field, value)

    await db.commit()
    await db.refresh(paper)

    return paper


@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_paper(
    paper: PaperDependency,
    db: DbSession,
) -> None:
    """Delete a paper."""
    await db.delete(paper)
    await db.commit()


@router.get("/{paper_id}/bib", response_model=BibTeXResponse)
async def export_bibtex(paper: PaperDependency) -> BibTeXResponse:
    """Export paper as BibTeX format."""
    return BibTeXResponse(
        citation_key=paper.citation_key,
        bibtex=paper.to_bibtex(),
    )


@router.post("/{paper_id}/pdf", response_model=PaperResponse)
async def upload_pdf(
    paper_id: uuid.UUID,
    file: Annotated[UploadFile, File()],
    paper: PaperDependency,
    db: DbSession,
) -> Paper:
    """Upload PDF file for a paper."""
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a PDF",
        )

    # Save file
    from pathlib import Path
    from app.config import settings

    pdf_path = Path(settings.PDF_STORAGE_PATH) / f"{paper_id}.pdf"
    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    with open(pdf_path, "wb") as f:
        f.write(content)

    # Update paper record
    paper.pdf_path = str(pdf_path)
    paper.pdf_uploaded = True
    
    await db.commit()
    await db.refresh(paper)
    
    return paper





@router.get("/{paper_id}/pdf")
async def download_pdf(paper: PaperDependency) -> None:
    """Download PDF file for a paper."""
    from fastapi.responses import FileResponse

    if not paper.pdf_uploaded or not paper.pdf_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not found for this paper",
        )

    # 处理包含非 ASCII 字符的文件名
    filename = f"{paper.citation_key}.pdf"
    try:
        filename.encode('ascii')
        content_disposition = f'inline; filename="{filename}"'
    except UnicodeEncodeError:
        encoded_filename = quote(filename, safe='')
        content_disposition = f"inline; filename*=UTF-8''{encoded_filename}"

    return FileResponse(
        path=paper.pdf_path,
        filename=filename,
        media_type="application/pdf",
        headers={
            'Content-Disposition': content_disposition,
        },
    )


async def _generate_unique_citation_key(
    first_author: str,
    year: int,
    db: AsyncSession,
) -> str:
    """Generate a unique citation key."""
    import re

    # Extract last name
    last_name = first_author.split()[-1] if first_author else "unknown"
    last_name = re.sub(r"[^a-zA-Z]", "", last_name).lower()

    base_key = f"{last_name}{year}"

    # Check for uniqueness
    counter = 0
    citation_key = base_key

    while True:
        query = select(Paper).where(Paper.citation_key == citation_key)
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if not existing:
            break

        counter += 1
        citation_key = f"{base_key}{chr(97 + counter - 1)}"  # a, b, c...

        if counter > 26:
            citation_key = f"{base_key}{counter}"

    return citation_key
