"""
MediChain Logging Module

Structured logging with structlog for JSON output in production,
pretty printing in development, and request correlation.
"""

import logging
import sys
from typing import Any

import structlog

from src.config import settings


def setup_logging() -> None:
    """
    Configure structured logging for the application.
    
    - Development: Pretty printed, colorized output
    - Production: JSON format for log aggregation
    """
    # Determine if we should use JSON output
    json_output = settings.is_production

    # Shared processors for all environments
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if json_output:
        # Production: JSON output
        shared_processors.extend([
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ])
    else:
        # Development: Pretty printing
        shared_processors.extend([
            structlog.processors.ExceptionPrettyPrinter(),
            structlog.dev.ConsoleRenderer(
                colors=True,
                exception_formatter=structlog.dev.plain_traceback,
            ),
        ])

    structlog.configure(
        processors=shared_processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(settings.log_level)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure standard library logging to work with structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.getLevelName(settings.log_level),
    )

    # Suppress noisy loggers
    for logger_name in ["uvicorn.access", "httpx", "httpcore"]:
        logging.getLogger(logger_name).setLevel(logging.WARNING)


def get_logger(name: str) -> structlog.BoundLogger:
    """Get a logger instance with the given name."""
    return structlog.get_logger(name)


class RequestLogger:
    """
    Request logging utility for FastAPI middleware.
    
    Logs request/response details with correlation IDs.
    """
    
    def __init__(self):
        self.logger = structlog.get_logger("request")
    
    def log_request(
        self,
        request_id: str,
        method: str,
        path: str,
        client_ip: str | None = None,
        user_id: str | None = None,
    ) -> None:
        """Log incoming request."""
        self.logger.info(
            "Request started",
            request_id=request_id,
            method=method,
            path=path,
            client_ip=client_ip,
            user_id=user_id,
        )
    
    def log_response(
        self,
        request_id: str,
        status_code: int,
        duration_ms: float,
    ) -> None:
        """Log response details."""
        level = "info" if status_code < 400 else "warning" if status_code < 500 else "error"
        getattr(self.logger, level)(
            "Request completed",
            request_id=request_id,
            status_code=status_code,
            duration_ms=round(duration_ms, 2),
        )
