"""
MediChain Database Module

Async SQLAlchemy setup for Neon Postgres with connection pooling,
session management, and health checks.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from src.config import settings

logger = structlog.get_logger(__name__)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""
    pass


# Global engine instance
_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """
    Get or create the database engine.
    
    Uses NullPool for serverless environments (Neon) to avoid
    connection pooling issues with scale-to-zero.
    """
    global _engine
    
    if _engine is None:
        # For serverless (Neon), use NullPool
        pool_class = NullPool if settings.is_production else None
        
        _engine = create_async_engine(
            settings.async_database_url,
            echo=settings.db_echo,
            pool_pre_ping=True,  # Verify connections before use
            poolclass=pool_class,
            pool_size=settings.db_pool_size if not settings.is_production else None,
            max_overflow=settings.db_max_overflow if not settings.is_production else None,
            connect_args={
                "ssl": "require" if settings.is_production else None,
                "server_settings": {
                    "application_name": "medichain",
                },
            } if settings.is_production else {},
        )
        logger.info("Database engine created", url=str(settings.database_url).split("@")[-1])
    
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Get the async session factory."""
    global _async_session_factory
    
    if _async_session_factory is None:
        _async_session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    
    return _async_session_factory


async def init_db() -> None:
    """
    Initialize database - create tables if they don't exist.
    
    In production, use Alembic migrations instead.
    """
    engine = get_engine()
    
    if not settings.is_production:
        async with engine.begin() as conn:
            # Import all models to register them
            from src.models import match, patient, trial  # noqa: F401
            
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created/verified")


async def close_db() -> None:
    """Close database connections gracefully."""
    global _engine, _async_session_factory
    
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _async_session_factory = None
        logger.info("Database connections closed")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection for database sessions.
    
    Usage:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Alias for backward compatibility
get_session = get_db


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database sessions.
    
    Usage:
        async with get_db_context() as db:
            result = await db.execute(query)
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_db_health() -> dict:
    """
    Check database connectivity and return status.
    
    Returns:
        dict with status, latency, and connection info
    """
    import time
    
    try:
        start = time.perf_counter()
        async with get_db_context() as session:
            result = await session.execute("SELECT 1")
            result.scalar()
        latency = (time.perf_counter() - start) * 1000
        
        return {
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "provider": "Neon Postgres",
        }
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return {
            "status": "unhealthy",
            "error": str(e),
            "provider": "Neon Postgres",
        }
