"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import papers, notes, journals, citations, search, tasks, paper_files
from app.config import settings
from app.models import Paper, Note, Journal, Citation, Task, PaperFile  # Import models to register them


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Database: {settings.POSTGRES_DB} at {settings.POSTGRES_HOST}")
    
    # Create storage directories
    Path(settings.PDF_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    Path(settings.EXPORT_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    
    yield
    
    # Shutdown
    print("Shutting down application")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Academic journal literature database with metadata scraping and note-taking",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


# Include routers
app.include_router(papers.router, prefix=f"{settings.API_PREFIX}/papers", tags=["Papers"])
app.include_router(notes.router, prefix=f"{settings.API_PREFIX}", tags=["Notes"])  # Notes routes are under /papers/{id}/notes
app.include_router(journals.router, prefix=f"{settings.API_PREFIX}/journals", tags=["Journals"])
app.include_router(citations.router, prefix=f"{settings.API_PREFIX}/citations", tags=["Citations"])
app.include_router(search.router, prefix=f"{settings.API_PREFIX}/search", tags=["Search"])
app.include_router(tasks.router, prefix=f"{settings.API_PREFIX}/tasks", tags=["Tasks"])
app.include_router(paper_files.router, prefix=f"{settings.API_PREFIX}/papers", tags=["Paper Files"])  # Files routes are under /papers/{id}/files


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.APP_VERSION}


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "note": "Running on port 8001",
    }
