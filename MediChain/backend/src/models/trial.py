"""Trial model - matches database schema from migration 001_initial."""
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlmodel import SQLModel, Field as SQLField


class Trial(SQLModel, table=True):
    """Clinical trial database model - matches actual DB schema."""
    __tablename__ = "trials"
    
    id: UUID = SQLField(
        default_factory=uuid4,
        sa_column=Column(PGUUID(as_uuid=True), primary_key=True),
    )
    nct_id: str = SQLField(
        sa_column=Column(String(20), nullable=False, unique=True, index=True),
    )
    title: str = SQLField(
        sa_column=Column(String(500), nullable=False),
    )
    official_title: Optional[str] = SQLField(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    description: Optional[str] = SQLField(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    detailed_description: Optional[str] = SQLField(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    status: str = SQLField(
        sa_column=Column(String(50), nullable=False, index=True),
    )
    phase: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(50), nullable=True, index=True),
    )
    study_type: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(50), nullable=True),
    )
    sponsor: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(255), nullable=True),
    )
    
    # JSONB fields
    conditions: Optional[List[Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    interventions: Optional[Dict[str, Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    eligibility_criteria: Optional[Dict[str, Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    locations: Optional[List[Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    contacts: Optional[Dict[str, Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    
    enrollment_count: Optional[int] = SQLField(
        default=None,
        sa_column=Column(Integer, nullable=True),
    )
    start_date: Optional[date] = SQLField(
        default=None,
        sa_column=Column(Date, nullable=True),
    )
    completion_date: Optional[date] = SQLField(
        default=None,
        sa_column=Column(Date, nullable=True),
    )
    
    # Vector embedding
    embedding: Optional[List[float]] = SQLField(
        default=None,
        sa_column=Column(ARRAY(Float), nullable=True),
    )
    embedding_model: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(100), nullable=True),
    )
    
    source_url: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )
    last_synced_at: Optional[datetime] = SQLField(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    is_active: bool = SQLField(
        default=True,
        sa_column=Column(Boolean, nullable=False, default=True),
    )
    created_at: Optional[datetime] = SQLField(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow),
    )
    updated_at: Optional[datetime] = SQLField(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas for API
# ─────────────────────────────────────────────────────────────────────────────


class TrialBase(BaseModel):
    """Base trial schema."""
    nct_id: str
    title: str
    official_title: Optional[str] = None
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    status: str
    phase: Optional[str] = None
    study_type: Optional[str] = None
    sponsor: Optional[str] = None
    conditions: Optional[List[Any]] = None
    interventions: Optional[Dict[str, Any]] = None
    eligibility_criteria: Optional[Dict[str, Any]] = None
    locations: Optional[List[Any]] = None
    contacts: Optional[Dict[str, Any]] = None
    enrollment_count: Optional[int] = None
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    source_url: Optional[str] = None


class TrialCreate(TrialBase):
    """Schema for creating a trial."""
    pass


class TrialRead(TrialBase):
    """Schema for reading a trial."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TrialUpdate(BaseModel):
    """Schema for updating a trial."""
    title: Optional[str] = None
    official_title: Optional[str] = None
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    status: Optional[str] = None
    phase: Optional[str] = None
    study_type: Optional[str] = None
    sponsor: Optional[str] = None
    conditions: Optional[List[Any]] = None
    interventions: Optional[Dict[str, Any]] = None
    eligibility_criteria: Optional[Dict[str, Any]] = None
    locations: Optional[List[Any]] = None
    contacts: Optional[Dict[str, Any]] = None
    enrollment_count: Optional[int] = None
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    source_url: Optional[str] = None
    is_active: Optional[bool] = None


class TrialSearch(BaseModel):
    """Schema for searching trials."""
    query: Optional[str] = None
    conditions: Optional[List[str]] = None
    phase: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    limit: int = Field(default=20, le=100)
    offset: int = Field(default=0, ge=0)


class EligibilityRequest(BaseModel):
    """Schema for eligibility check request."""
    patient_id: UUID
    trial_id: UUID


class EligibilityResponse(BaseModel):
    """Schema for eligibility check response."""
    eligible: bool
    score: float = Field(ge=0, le=1)
    reasons: List[str] = []
    missing_data: List[str] = []
