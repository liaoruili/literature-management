# Literature Database Backend

Academic journal literature database with metadata scraping, PDF management, and note-taking capabilities.

## Features

- 📚 **Paper Management** - Store and manage academic paper metadata in BibTeX format
- 🔍 **Metadata Scraping** - Automatically fetch metadata from journal websites
- 📝 **Note Taking** - Create and manage reading notes with Markdown support
- 📊 **Citation Tracking** - Automatic citation count updates from multiple sources
- 🤖 **AI Assistant API** - RESTful API for AI-powered literature analysis
- 📄 **BibTeX Export** - Generate LaTeX-ready bibliography entries

## Tech Stack

- **Framework**: FastAPI 0.115+
- **Database**: PostgreSQL 15+ with asyncpg
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Task Queue**: Celery + Redis
- **PDF Processing**: PyMuPDF
- **Web Scraping**: Playwright + BeautifulSoup

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- UV package manager
- Redis (for background tasks)

### Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies with UV**
   ```bash
   uv sync
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up database**
   ```bash
   # Option 1: Using the setup script
   bash scripts/setup.sh

   # Option 2: Manual steps
   createdb literature_db
   alembic upgrade head
   python scripts/init_db.py
   ```

5. **Run the application**
   ```bash
   # Development mode
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

   # Production mode
   gunicorn app.main:app \
     --workers 4 \
     --worker-class uvicorn.workers.UvicornWorker \
     --bind 0.0.0.0:8000
   ```

6. **Access API documentation**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Database Schema

### Tables

- **papers** - Academic paper metadata (BibTeX fields)
- **notes** - Reading notes linked to papers
- **journals** - Journal information and scraping config
- **citations** - Individual citation records
- **tasks** - Background job tracking

### Key Features

- UUID primary keys for all tables
- JSONB columns for flexible metadata (authors, keywords, JEL codes)
- GIN indexes for efficient JSON querying
- Automatic timestamp tracking
- Cascade deletes for referential integrity

## API Endpoints

### Papers
- `GET /api/v1/papers` - List all papers
- `POST /api/v1/papers` - Create new paper
- `GET /api/v1/papers/{id}` - Get paper details
- `PUT /api/v1/papers/{id}` - Update paper
- `DELETE /api/v1/papers/{id}` - Delete paper
- `GET /api/v1/papers/{id}/bib` - Export BibTeX

### Notes
- `GET /api/v1/papers/{id}/notes` - Get all notes for a paper
- `POST /api/v1/papers/{id}/notes` - Create new note
- `PUT /api/v1/notes/{id}` - Update note
- `DELETE /api/v1/notes/{id}` - Delete note

### Search
- `GET /api/v1/search?q=query` - Full-text search
- `GET /api/v1/search/advanced` - Advanced search with filters

## Development

### Running Tests
```bash
pytest --cov=app tests/
```

### Code Formatting
```bash
black app/ tests/
ruff check app/ tests/
```

### Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback one migration:
```bash
alembic downgrade -1
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── models/              # SQLAlchemy models
│   │   ├── paper.py
│   │   ├── note.py
│   │   ├── journal.py
│   │   ├── citation.py
│   │   └── task.py
│   ├── schemas/             # Pydantic models
│   ├── api/                 # API routes
│   ├── services/            # Business logic
│   └── tasks/               # Celery tasks
├── alembic/                 # Database migrations
├── scripts/                 # Utility scripts
├── tests/                   # Test suite
├── pyproject.toml           # Dependencies
└── README.md
```

## BibTeX Format

The system uses standard BibTeX `@article` format with these fields:

**Required:**
- author, title, journal, year, volume, number, pages, doi

**Optional:**
- abstract, keywords, jelcodes (JEL classification), url, note

**Example:**
```bibtex
@article{smith2024aer,
  author = {Smith, John and Doe, Jane},
  title = {Economic Growth and Innovation},
  journal = {American Economic Review},
  year = {2024},
  volume = {114},
  number = {3},
  pages = {123--456},
  doi = {10.1257/aer.20240001},
  keywords = {growth, innovation, R&D},
  jelcodes = {O30, O40},
}
```

## License

MIT
