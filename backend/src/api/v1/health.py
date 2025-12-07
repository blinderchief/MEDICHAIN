"""
MediChain Health Check Endpoints

System health, readiness, and liveness probes for
Kubernetes/container orchestration.
"""

from datetime import datetime
from typing import Any

import structlog
from fastapi import APIRouter, status
from fastapi.responses import ORJSONResponse

from src.config import settings
from src.core.database import check_db_health

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Health"])


@router.get(
    "",
    response_class=ORJSONResponse,
    summary="Health check",
    description="Basic health check endpoint",
)
async def health_check() -> dict[str, Any]:
    """Basic health check - always returns OK if service is running."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get(
    "/ready",
    response_class=ORJSONResponse,
    summary="Readiness probe",
    description="Check if service is ready to accept traffic",
)
async def readiness_check() -> dict[str, Any]:
    """
    Readiness probe for Kubernetes.
    
    Checks:
    - Database connectivity
    - Required services availability
    """
    checks = {
        "database": await check_db_health(),
    }
    
    # Overall status
    all_healthy = all(
        c.get("status") == "healthy" 
        for c in checks.values()
    )
    
    return {
        "status": "ready" if all_healthy else "not_ready",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get(
    "/live",
    response_class=ORJSONResponse,
    summary="Liveness probe",
    description="Check if service is alive",
)
async def liveness_check() -> dict[str, Any]:
    """
    Liveness probe for Kubernetes.
    
    Simple check to verify the service process is running.
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get(
    "/info",
    response_class=ORJSONResponse,
    summary="Service information",
    description="Detailed service information and configuration",
)
async def service_info() -> dict[str, Any]:
    """Get detailed service information."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "features": {
            "ai_engine": "Gemini 1.5 Pro",
            "reasoning": "MeTTa-style symbolic logic",
            "database": "Neon Postgres",
            "vector_db": "Qdrant",
            "blockchain": f"Base L2 (Chain ID: {settings.chain_id})",
            "token": "ASI (Artificial Superintelligence Alliance)",
        },
        "endpoints": {
            "patients": "/api/v1/patients",
            "trials": "/api/v1/trials",
            "matches": "/api/v1/matches",
            "health": "/api/v1/health",
        },
        "documentation": {
            "openapi": "/docs",
            "redoc": "/redoc",
        },
    }
