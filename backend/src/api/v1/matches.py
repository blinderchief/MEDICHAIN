"""
MediChain Matches API Endpoints

Patient-to-trial matching - aligned with database schema.
"""

from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.match import (
    Match,
    MatchCreate,
    MatchRead,
    MatchUpdate,
    MatchSummary,
    ConsentUpdate,
    MatchingRequest,
)
from src.models.patient import Patient
from src.models.trial import Trial

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Matches"])


@router.post(
    "",
    response_model=MatchRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a match",
)
async def create_match(
    match_data: MatchCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Match:
    """Create a new patient-trial match."""
    logger.info(
        "Creating match",
        patient_id=str(match_data.patient_id),
        trial_id=str(match_data.trial_id),
    )
    
    # Verify patient exists
    patient_result = await db.execute(
        select(Patient).where(Patient.id == match_data.patient_id)
    )
    if not patient_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    
    # Verify trial exists
    trial_result = await db.execute(
        select(Trial).where(Trial.id == match_data.trial_id)
    )
    if not trial_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trial not found",
        )
    
    # Check for existing match
    existing = await db.execute(
        select(Match).where(
            and_(
                Match.patient_id == match_data.patient_id,
                Match.trial_id == match_data.trial_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Match already exists for this patient-trial pair",
        )
    
    # Create match
    match = Match(
        patient_id=match_data.patient_id,
        trial_id=match_data.trial_id,
        status=match_data.status,
        confidence_score=match_data.confidence_score,
        eligibility_score=match_data.eligibility_score,
        location_score=match_data.location_score,
        preference_score=match_data.preference_score,
        reasoning=match_data.reasoning,
        ai_explanation=match_data.ai_explanation,
        matched_criteria=match_data.matched_criteria,
        unmatched_criteria=match_data.unmatched_criteria,
        created_by=match_data.created_by,
    )
    
    db.add(match)
    await db.commit()
    await db.refresh(match)
    
    logger.info("Match created", match_id=str(match.id))
    
    return match


@router.get(
    "/{match_id}",
    response_model=MatchRead,
    summary="Get match by ID",
)
async def get_match(
    match_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Match:
    """Get match by ID."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )
    
    return match


@router.get(
    "",
    response_model=list[MatchSummary],
    summary="List matches",
)
async def list_matches(
    db: Annotated[AsyncSession, Depends(get_db)],
    patient_id: UUID | None = Query(None),
    trial_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    min_confidence: float = Query(0.0, ge=0, le=1),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[Match]:
    """List matches with filters."""
    query = select(Match)
    
    if patient_id:
        query = query.where(Match.patient_id == patient_id)
    
    if trial_id:
        query = query.where(Match.trial_id == trial_id)
    
    if status_filter:
        query = query.where(Match.status == status_filter)
    
    if min_confidence > 0:
        query = query.where(Match.confidence_score >= min_confidence)
    
    query = query.order_by(Match.confidence_score.desc())
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    matches = result.scalars().all()
    
    return list(matches)


@router.get(
    "/patient/{patient_id}",
    response_model=list[MatchRead],
    summary="Get matches for patient",
)
async def get_patient_matches(
    patient_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
) -> list[Match]:
    """Get all matches for a specific patient."""
    query = select(Match).where(Match.patient_id == patient_id)
    
    if status_filter:
        query = query.where(Match.status == status_filter)
    
    query = query.order_by(Match.confidence_score.desc()).limit(limit)
    
    result = await db.execute(query)
    matches = result.scalars().all()
    
    return list(matches)


@router.get(
    "/trial/{trial_id}",
    response_model=list[MatchRead],
    summary="Get matches for trial",
)
async def get_trial_matches(
    trial_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
) -> list[Match]:
    """Get all matches for a specific trial."""
    query = select(Match).where(Match.trial_id == trial_id)
    
    if status_filter:
        query = query.where(Match.status == status_filter)
    
    query = query.order_by(Match.confidence_score.desc()).limit(limit)
    
    result = await db.execute(query)
    matches = result.scalars().all()
    
    return list(matches)


@router.put(
    "/{match_id}",
    response_model=MatchRead,
    summary="Update match",
)
async def update_match(
    match_id: UUID,
    update_data: MatchUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Match:
    """Update match details."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(match, field, value)
    
    await db.commit()
    await db.refresh(match)
    
    logger.info("Match updated", match_id=str(match_id), status=match.status)
    
    return match


@router.put(
    "/{match_id}/status",
    response_model=MatchRead,
    summary="Update match status",
)
async def update_match_status(
    match_id: UUID,
    new_status: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> Match:
    """Update match status only."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )
    
    match.status = new_status
    await db.commit()
    await db.refresh(match)
    
    logger.info("Match status updated", match_id=str(match_id), status=new_status)
    
    return match


@router.post(
    "/{match_id}/consent",
    response_model=MatchRead,
    summary="Record consent",
)
async def record_consent(
    match_id: UUID,
    consent_data: ConsentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Match:
    """Record patient consent for a match."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )
    
    match.consent_hash = consent_data.consent_hash
    match.consent_tx_hash = consent_data.consent_tx_hash
    match.consent_signed_at = datetime.utcnow()
    match.status = "consent_signed"
    
    await db.commit()
    await db.refresh(match)
    
    logger.info("Consent recorded", match_id=str(match_id))
    
    return match


@router.delete(
    "/{match_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete match",
)
async def delete_match(
    match_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a match."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )
    
    await db.delete(match)
    await db.commit()
    
    logger.info("Match deleted", match_id=str(match_id))


@router.get(
    "/stats/summary",
    summary="Get match statistics",
)
async def get_match_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Get summary statistics for matches."""
    # Total matches
    total_result = await db.execute(select(func.count(Match.id)))
    total = total_result.scalar() or 0
    
    # By status
    status_result = await db.execute(
        select(Match.status, func.count(Match.id))
        .group_by(Match.status)
    )
    by_status = {row[0] or "unknown": row[1] for row in status_result.fetchall()}
    
    # Average confidence
    avg_result = await db.execute(
        select(func.avg(Match.confidence_score))
    )
    avg_confidence = avg_result.scalar() or 0
    
    return {
        "total_matches": total,
        "by_status": by_status,
        "average_confidence": round(avg_confidence, 3),
    }
