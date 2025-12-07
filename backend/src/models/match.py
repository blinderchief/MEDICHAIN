"""
MediChain Match Model

Patient-to-trial match matching database schema from migration 001_initial.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column, DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlmodel import SQLModel, Field as SQLField


class MatchStatus(str, Enum):
    """Match workflow status."""
    PENDING = "pending"
    INTERESTED = "interested"
    CONSENT_PENDING = "consent_pending"
    CONSENT_SIGNED = "consent_signed"
    VERIFIED = "verified"
    ENROLLED = "enrolled"
    REJECTED_PATIENT = "rejected_patient"
    REJECTED_TRIAL = "rejected_trial"
    EXPIRED = "expired"


class MatchConfidenceLevel(str, Enum):
    """Match confidence classification."""
    HIGH = "high"          # 80-100%
    MEDIUM = "medium"      # 60-79%
    LOW = "low"            # 40-59%
    MARGINAL = "marginal"  # <40%


class CriteriaCheck(BaseModel):
    """Result of a single criteria check."""
    criterion: str
    passed: bool
    confidence: float = Field(ge=0, le=1)
    reason: str = ""


class MatchReasoning(BaseModel):
    """AI reasoning for a match."""
    metta_reasoning: str = ""
    gemini_explanation: str = ""
    inclusion_checks: List[CriteriaCheck] = []
    exclusion_checks: List[CriteriaCheck] = []


class Match(SQLModel, table=True):
    """Patient-Trial match database model - matches actual DB schema."""
    __tablename__ = "matches"
    
    id: UUID = SQLField(
        default_factory=uuid4,
        sa_column=Column(PGUUID(as_uuid=True), primary_key=True),
    )
    patient_id: UUID = SQLField(
        sa_column=Column(PGUUID(as_uuid=True), nullable=False, index=True),
    )
    trial_id: UUID = SQLField(
        sa_column=Column(PGUUID(as_uuid=True), nullable=False, index=True),
    )
    
    # Match quality scores
    status: str = SQLField(
        default="pending",
        sa_column=Column(String(50), nullable=False, default="pending", index=True),
    )
    confidence_score: float = SQLField(
        default=0.0,
        sa_column=Column(Float, nullable=False, default=0.0, index=True),
    )
    eligibility_score: Optional[float] = SQLField(
        default=None,
        sa_column=Column(Float, nullable=True),
    )
    location_score: Optional[float] = SQLField(
        default=None,
        sa_column=Column(Float, nullable=True),
    )
    preference_score: Optional[float] = SQLField(
        default=None,
        sa_column=Column(Float, nullable=True),
    )
    
    # AI reasoning - use JSONB
    reasoning: Optional[Dict[str, Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    ai_explanation: Optional[str] = SQLField(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    matched_criteria: Optional[Dict[str, Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    unmatched_criteria: Optional[Dict[str, Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    
    # Consent tracking
    consent_hash: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(66), nullable=True),
    )
    consent_tx_hash: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(66), nullable=True),
    )
    consent_signed_at: Optional[datetime] = SQLField(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    
    # Token rewards
    asi_reward_amount: Optional[float] = SQLField(
        default=None,
        sa_column=Column(Float, nullable=True),
    )
    asi_reward_tx_hash: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(66), nullable=True),
    )
    
    # Metadata
    created_by: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(255), nullable=True),
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
# API Schemas
# ─────────────────────────────────────────────────────────────────────────────


class MatchBase(BaseModel):
    """Base match schema."""
    patient_id: UUID
    trial_id: UUID
    confidence_score: float = Field(default=0.0, ge=0, le=1)
    eligibility_score: Optional[float] = Field(default=None, ge=0, le=1)
    location_score: Optional[float] = Field(default=None, ge=0, le=1)
    preference_score: Optional[float] = Field(default=None, ge=0, le=1)
    reasoning: Optional[Dict[str, Any]] = None
    ai_explanation: Optional[str] = None


class MatchCreate(MatchBase):
    """Schema for creating a match."""
    status: str = "pending"
    matched_criteria: Optional[Dict[str, Any]] = None
    unmatched_criteria: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None


class MatchRead(MatchBase):
    """Schema for reading a match."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    status: str
    matched_criteria: Optional[Dict[str, Any]] = None
    unmatched_criteria: Optional[Dict[str, Any]] = None
    consent_hash: Optional[str] = None
    consent_tx_hash: Optional[str] = None
    consent_signed_at: Optional[datetime] = None
    asi_reward_amount: Optional[float] = None
    asi_reward_tx_hash: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class MatchUpdate(BaseModel):
    """Schema for updating a match."""
    status: Optional[str] = None
    confidence_score: Optional[float] = Field(default=None, ge=0, le=1)
    eligibility_score: Optional[float] = Field(default=None, ge=0, le=1)
    location_score: Optional[float] = Field(default=None, ge=0, le=1)
    preference_score: Optional[float] = Field(default=None, ge=0, le=1)
    reasoning: Optional[Dict[str, Any]] = None
    ai_explanation: Optional[str] = None
    matched_criteria: Optional[Dict[str, Any]] = None
    unmatched_criteria: Optional[Dict[str, Any]] = None


class ConsentUpdate(BaseModel):
    """Schema for recording consent."""
    consent_hash: str
    consent_tx_hash: Optional[str] = None


class MatchSummary(BaseModel):
    """Brief match summary."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    patient_id: UUID
    trial_id: UUID
    status: str
    confidence_score: float
    created_at: Optional[datetime] = None


class MatchingRequest(BaseModel):
    """Schema for requesting matches for a patient."""
    patient_id: UUID
    limit: int = Field(default=10, ge=1, le=50)
    min_confidence: float = Field(default=0.5, ge=0, le=1)
    status_filter: Optional[List[str]] = None
    conditions: Optional[List[str]] = None
    location: Optional[str] = None
