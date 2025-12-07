"""
MediChain Patient Model

Patient profile matching database schema from migration 001_initial.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Boolean, Column, DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlmodel import SQLModel, Field as SQLField


class Patient(SQLModel, table=True):
    """Patient database model - matches actual DB schema."""
    __tablename__ = "patients"
    
    id: UUID = SQLField(
        default_factory=uuid4,
        sa_column=Column(PGUUID(as_uuid=True), primary_key=True),
    )
    clerk_user_id: str = SQLField(
        sa_column=Column(String(255), nullable=False, unique=True, index=True),
    )
    did: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(255), nullable=True, unique=True, index=True),
    )
    
    # Encrypted data
    encrypted_pii: Optional[str] = SQLField(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    encrypted_phi: Optional[str] = SQLField(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    
    # Semantic hash for matching
    semantic_hash: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(64), nullable=True, index=True),
    )
    
    # JSONB fields
    demographics: Optional[Dict[str, Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    conditions: Optional[List[Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    medications: Optional[List[Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    lab_results: Optional[Dict[str, Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    preferences: Optional[Dict[str, Any]] = SQLField(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    
    # Vector embedding - using ARRAY of Float for pgvector compatibility
    embedding: Optional[List[float]] = SQLField(
        default=None,
        sa_column=Column(ARRAY(item_type=Float), nullable=True),
    )
    embedding_model: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(100), nullable=True),
    )
    
    # Wallet
    wallet_address: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(42), nullable=True, index=True),
    )
    
    # Status
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
# API Schemas (Pydantic v2)
# ─────────────────────────────────────────────────────────────────────────────


class DemographicsSchema(BaseModel):
    """Patient demographics."""
    age: Optional[int] = None
    age_range: Optional[str] = Field(None, examples=["25-35", "65+"])
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    location: Optional[str] = None


class PatientProfile(BaseModel):
    """Patient medical profile for matching."""
    model_config = ConfigDict(extra="allow")
    
    demographics: Optional[DemographicsSchema] = None
    conditions: Optional[List[str]] = Field(
        default=None,
        examples=[["non-small cell lung cancer", "type 2 diabetes"]],
    )
    medications: Optional[List[str]] = Field(
        default=None,
        examples=[["metformin", "lisinopril"]],
    )
    lab_results: Optional[Dict[str, Any]] = Field(
        default=None,
        examples=[{"EGFR": "positive", "PD-L1": "50%"}],
    )
    preferences: Optional[Dict[str, Any]] = Field(
        default=None,
        examples=[{"travel_distance": "50 miles", "notify_email": True}],
    )


class PatientCreate(BaseModel):
    """Schema for creating a new patient."""
    model_config = ConfigDict(extra="forbid")
    
    clerk_user_id: str = Field(..., min_length=1)
    did: Optional[str] = None
    profile: Optional[PatientProfile] = None
    wallet_address: Optional[str] = Field(
        None,
        pattern=r"^0x[a-fA-F0-9]{40}$",
        description="Ethereum wallet address",
    )


class PatientUpdate(BaseModel):
    """Schema for updating a patient."""
    demographics: Optional[Dict[str, Any]] = None
    conditions: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    lab_results: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None
    wallet_address: Optional[str] = None
    is_active: Optional[bool] = None


class PatientRead(BaseModel):
    """Schema for patient API responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    clerk_user_id: str
    did: Optional[str] = None
    demographics: Optional[Dict[str, Any]] = None
    conditions: Optional[List[Any]] = None
    medications: Optional[List[Any]] = None
    lab_results: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None
    wallet_address: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PatientSummary(BaseModel):
    """Brief patient summary for listings."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    clerk_user_id: str
    did: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
