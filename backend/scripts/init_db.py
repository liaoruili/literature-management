"""Database initialization script."""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.database import Base


async def init_database():
    """Initialize database with all tables."""
    print(f"Connecting to database: {settings.POSTGRES_DB} at {settings.POSTGRES_HOST}")

    # Create engine
    engine = create_async_engine(
        settings.database_url,
        echo=True,
        pool_pre_ping=True,
    )

    try:
        # Test connection
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            db_version = result.scalar()
            print(f"✓ Connected to PostgreSQL: {db_version[:50]}...")

        # Create all tables
        print("\nCreating database tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        print("✓ All tables created successfully!")

        # Verify tables
        async with engine.connect() as conn:
            result = await conn.execute(
                text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
                """)
            )
            tables = result.fetchall()
            print(f"\nCreated tables: {[t[0] for t in tables]}")

    except Exception as e:
        print(f"✗ Error initializing database: {e}")
        raise
    finally:
        await engine.dispose()

    print("\n✓ Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(init_database())
