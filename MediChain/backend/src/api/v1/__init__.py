"""
MediChain API v1 Router

Exports all API routers for version 1.
"""

from src.api.v1.health import router as health
from src.api.v1.patients import router as patients
from src.api.v1.trials import router as trials
from src.api.v1.matches import router as matches
from src.api.v1.agents import router as agents
from src.api.v1.webhooks import router as webhooks
from src.api.v1.snet import router as snet

__all__ = ["health", "patients", "trials", "matches", "agents", "webhooks", "snet"]
