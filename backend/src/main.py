"""
MediChain Main Application Entry Point

FastAPI application with modular router registration,
middleware configuration, and startup/shutdown lifecycle management.
"""

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse

from src.api.v1 import health, matches, patients, trials, agents, webhooks, snet
from src.config import settings
from src.core.database import close_db, init_db
from src.core.logging import setup_logging
from src.middleware.auth import ClerkAuthMiddleware

# Initialize structured logging
setup_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.
    
    Handles startup and shutdown events:
    - Initialize database connections
    - Load AI models
    - Setup background tasks
    """
    logger.info(
        "Starting MediChain",
        version=settings.app_version,
        environment=settings.environment,
    )
    
    # Startup
    await init_db()
    logger.info("Database initialized")
    
    # Load AI models (lazy loading in services)
    logger.info("AI services ready")
    
    yield
    
    # Shutdown
    await close_db()
    logger.info("MediChain shutdown complete")


def create_application() -> FastAPI:
    """
    Application factory pattern.
    
    Creates and configures the FastAPI application with:
    - Metadata for OpenAPI docs
    - Middleware stack
    - API routers
    - Exception handlers
    """
    app = FastAPI(
        title=settings.app_name,
        description="""
## 🏥 MediChain - Decentralized Clinical Trial Matching

**The right trial. The right patient. Verified, instantly — no middlemen.**

MediChain is a decentralized AI agent mesh for privacy-first clinical trial matching,
built on SingularityNET's ecosystem with on-chain verification.

### Features
- 🔐 **Privacy-First**: Zero-knowledge patient profiles with DID
- 🤖 **AI-Powered**: Gemini + MeTTa hybrid reasoning engine
- ⛓️ **On-Chain**: Verified matches on Base L2
- 💰 **Token Economy**: ASI-based incentives for all participants

### API Sections
- **Patients**: Profile management, EHR upload, DID generation
- **Trials**: Clinical trial database, eligibility criteria
- **Matches**: AI-powered matching with confidence scores
- **Health**: System status and monitoring
        """,
        version=settings.app_version,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
        license_info={
            "name": "MIT",
            "url": "https://opensource.org/licenses/MIT",
        },
        contact={
            "name": "MediChain Team",
            "email": "support@medichain.io",
            "url": "https://medichain.io",
        },
    )

    # ─────────────────────────────────────────────────────────────────────────
    # Middleware Stack (order matters: first added = outermost)
    # ─────────────────────────────────────────────────────────────────────────
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Process-Time"],
    )
    
    # GZip compression for responses > 1KB
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # ─────────────────────────────────────────────────────────────────────────
    # Request Timing Middleware
    # ─────────────────────────────────────────────────────────────────────────
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        """Add processing time to response headers."""
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        return response

    # ─────────────────────────────────────────────────────────────────────────
    # API Routers
    # ─────────────────────────────────────────────────────────────────────────
    api_prefix = "/api/v1"
    
    app.include_router(
        health,
        prefix=f"{api_prefix}/health",
        tags=["Health"],
    )
    app.include_router(
        patients,
        prefix=f"{api_prefix}/patients",
        tags=["Patients"],
    )
    app.include_router(
        trials,
        prefix=f"{api_prefix}/trials",
        tags=["Trials"],
    )
    app.include_router(
        matches,
        prefix=f"{api_prefix}/matches",
        tags=["Matches"],
    )
    app.include_router(
        agents,
        prefix=f"{api_prefix}/agents",
        tags=["Agent Orchestration"],
    )
    
    # Webhook routes (no auth middleware - uses signature verification)
    app.include_router(
        webhooks,
        prefix=f"{api_prefix}/webhooks",
        tags=["Webhooks"],
    )
    
    # SingularityNET integration routes
    app.include_router(
        snet,
        prefix=f"{api_prefix}/snet",
        tags=["SingularityNET"],
    )
    
    # Add Clerk authentication middleware
    app.add_middleware(ClerkAuthMiddleware)

    # ─────────────────────────────────────────────────────────────────────────
    # Root Endpoint
    # ─────────────────────────────────────────────────────────────────────────
    @app.get(
        "/",
        response_class=ORJSONResponse,
        include_in_schema=False,
    )
    async def root():
        """Root endpoint with API info."""
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "description": "Decentralized Clinical Trial Matching via AI Agent Mesh",
            "docs": "/docs",
            "health": "/api/v1/health",
        }

    return app


# Create the application instance
app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        workers=settings.workers,
        log_level=settings.log_level.lower(),
    )
