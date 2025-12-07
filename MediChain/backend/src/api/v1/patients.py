"""
MediChain Patient API Endpoints

Patient profile management - aligned with database schema.
"""

from typing import Annotated, Any
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.patient import (
    Patient,
    PatientCreate,
    PatientUpdate,
    PatientRead,
    PatientSummary,
)

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Patients"])


@router.post(
    "",
    response_model=PatientRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create patient profile",
)
async def create_patient(
    patient_data: PatientCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Patient:
    """Create a new patient profile."""
    logger.info("Creating patient", clerk_id=patient_data.clerk_user_id[:10] + "...")
    
    # Check if patient already exists
    existing = await db.execute(
        select(Patient).where(Patient.clerk_user_id == patient_data.clerk_user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Patient with this Clerk ID already exists",
        )
    
    # Create patient record
    patient = Patient(
        clerk_user_id=patient_data.clerk_user_id,
        did=patient_data.did,
        wallet_address=patient_data.wallet_address,
    )
    
    # Set profile fields if provided
    if patient_data.profile:
        if patient_data.profile.demographics:
            patient.demographics = patient_data.profile.demographics.model_dump()
        patient.conditions = patient_data.profile.conditions
        patient.medications = patient_data.profile.medications
        patient.lab_results = patient_data.profile.lab_results
        patient.preferences = patient_data.profile.preferences
    
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    
    logger.info("Patient created", patient_id=str(patient.id))
    
    return patient


@router.get(
    "/me",
    response_model=PatientRead,
    summary="Get current patient profile",
)
async def get_current_patient(
    clerk_user_id: str = Query(..., description="Clerk user ID"),
    db: AsyncSession = Depends(get_db),
) -> Patient:
    """Get patient profile by Clerk user ID."""
    result = await db.execute(
        select(Patient).where(Patient.clerk_user_id == clerk_user_id)
    )
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    
    return patient


@router.get(
    "/{patient_id}",
    response_model=PatientRead,
    summary="Get patient by ID",
)
async def get_patient(
    patient_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Patient:
    """Get patient profile by ID."""
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    
    return patient


@router.get(
    "/did/{did}",
    response_model=PatientRead,
    summary="Get patient by DID",
)
async def get_patient_by_did(
    did: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Patient:
    """Get patient profile by Decentralized Identifier."""
    result = await db.execute(
        select(Patient).where(Patient.did == did)
    )
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    
    return patient


@router.get(
    "",
    response_model=list[PatientSummary],
    summary="List patients",
)
async def list_patients(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    active_only: bool = Query(True),
) -> list[Patient]:
    """List all patients with pagination."""
    query = select(Patient)
    
    if active_only:
        query = query.where(Patient.is_active == True)
    
    query = query.order_by(Patient.created_at.desc())
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    patients = result.scalars().all()
    
    return list(patients)


@router.put(
    "/{patient_id}",
    response_model=PatientRead,
    summary="Update patient profile",
)
async def update_patient(
    patient_id: UUID,
    update_data: PatientUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Patient:
    """Update patient profile."""
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    
    # Update fields that were provided
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(patient, field, value)
    
    await db.commit()
    await db.refresh(patient)
    
    logger.info("Patient updated", patient_id=str(patient_id))
    
    return patient


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate patient",
)
async def deactivate_patient(
    patient_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Deactivate a patient (soft delete)."""
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    
    patient.is_active = False
    await db.commit()
    
    logger.info("Patient deactivated", patient_id=str(patient_id))


@router.get(
    "/stats/summary",
    summary="Get patient statistics",
)
async def get_patient_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Get summary statistics for patients."""
    # Total patients
    total_result = await db.execute(
        select(func.count(Patient.id))
    )
    total = total_result.scalar() or 0
    
    # Active patients
    active_result = await db.execute(
        select(func.count(Patient.id)).where(Patient.is_active == True)
    )
    active = active_result.scalar() or 0
    
    return {
        "total_patients": total,
        "active_patients": active,
        "inactive_patients": total - active,
    }
