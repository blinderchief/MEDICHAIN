"""
MediChain Trials API Endpoints

Clinical trial management and search - aligned with database schema.
"""

from typing import Annotated, Any
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.trial import (
    Trial,
    TrialCreate,
    TrialRead,
    TrialUpdate,
    TrialSearch,
)

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Trials"])


@router.post(
    "",
    response_model=TrialRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create/import clinical trial",
)
async def create_trial(
    trial_data: TrialCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Trial:
    """Create or import a clinical trial."""
    logger.info("Creating trial", nct_id=trial_data.nct_id)
    
    # Check if trial already exists
    existing = await db.execute(
        select(Trial).where(Trial.nct_id == trial_data.nct_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Trial {trial_data.nct_id} already exists",
        )
    
    # Create trial record
    trial = Trial(
        nct_id=trial_data.nct_id,
        title=trial_data.title,
        official_title=trial_data.official_title,
        description=trial_data.description,
        detailed_description=trial_data.detailed_description,
        status=trial_data.status,
        phase=trial_data.phase,
        study_type=trial_data.study_type,
        sponsor=trial_data.sponsor,
        conditions=trial_data.conditions,
        interventions=trial_data.interventions,
        eligibility_criteria=trial_data.eligibility_criteria,
        contacts=trial_data.contacts,
        locations=trial_data.locations,
        start_date=trial_data.start_date,
        completion_date=trial_data.completion_date,
        enrollment_count=trial_data.enrollment_count,
        source_url=trial_data.source_url or f"https://clinicaltrials.gov/study/{trial_data.nct_id}",
    )
    
    db.add(trial)
    await db.commit()
    await db.refresh(trial)
    
    logger.info("Trial created", trial_id=str(trial.id), nct_id=trial.nct_id)
    
    return trial


@router.get(
    "/{trial_id}",
    response_model=TrialRead,
    summary="Get trial by ID",
)
async def get_trial(
    trial_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Trial:
    """Get clinical trial by internal ID."""
    result = await db.execute(
        select(Trial).where(Trial.id == trial_id)
    )
    trial = result.scalar_one_or_none()
    
    if not trial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trial not found",
        )
    
    return trial


@router.get(
    "/nct/{nct_id}",
    response_model=TrialRead,
    summary="Get trial by NCT ID",
)
async def get_trial_by_nct(
    nct_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Trial:
    """Get clinical trial by ClinicalTrials.gov NCT ID."""
    result = await db.execute(
        select(Trial).where(Trial.nct_id == nct_id.upper())
    )
    trial = result.scalar_one_or_none()
    
    if not trial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trial {nct_id} not found",
        )
    
    return trial


@router.get(
    "",
    response_model=list[TrialRead],
    summary="Search trials",
)
async def search_trials(
    db: Annotated[AsyncSession, Depends(get_db)],
    query: str | None = Query(None, min_length=2, description="Search query"),
    status_filter: list[str] | None = Query(None, alias="status"),
    phase_filter: list[str] | None = Query(None, alias="phase"),
    conditions: list[str] | None = Query(None),
    location: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[Trial]:
    """
    Search clinical trials with filters.
    
    Supports:
    - Full-text search on title and description
    - Filter by status, phase
    - Filter by conditions
    """
    base_query = select(Trial)
    
    # Text search
    if query:
        search_term = f"%{query}%"
        base_query = base_query.where(
            or_(
                Trial.title.ilike(search_term),
                Trial.description.ilike(search_term),
                Trial.nct_id.ilike(search_term),
            )
        )
    
    # Status filter
    if status_filter:
        base_query = base_query.where(Trial.status.in_(status_filter))
    
    # Phase filter
    if phase_filter:
        base_query = base_query.where(Trial.phase.in_(phase_filter))
    
    # Pagination
    base_query = base_query.order_by(Trial.created_at.desc())
    base_query = base_query.offset(offset).limit(limit)
    
    result = await db.execute(base_query)
    trials = result.scalars().all()
    
    return list(trials)


@router.put(
    "/{trial_id}",
    response_model=TrialRead,
    summary="Update trial",
)
async def update_trial(
    trial_id: UUID,
    trial_data: TrialUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Trial:
    """Update clinical trial information."""
    result = await db.execute(
        select(Trial).where(Trial.id == trial_id)
    )
    trial = result.scalar_one_or_none()
    
    if not trial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trial not found",
        )
    
    # Update fields that were provided
    update_data = trial_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trial, field, value)
    
    await db.commit()
    await db.refresh(trial)
    
    logger.info("Trial updated", trial_id=str(trial_id), nct_id=trial.nct_id)
    
    return trial


@router.delete(
    "/{trial_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete trial",
)
async def delete_trial(
    trial_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a clinical trial."""
    result = await db.execute(
        select(Trial).where(Trial.id == trial_id)
    )
    trial = result.scalar_one_or_none()
    
    if not trial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trial not found",
        )
    
    await db.delete(trial)
    await db.commit()
    
    logger.info("Trial deleted", trial_id=str(trial_id))


@router.get(
    "/stats/summary",
    summary="Get trial statistics",
)
async def get_trial_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Get summary statistics for trials in the database."""
    # Total trials
    total_result = await db.execute(select(func.count(Trial.id)))
    total = total_result.scalar() or 0
    
    # By status
    status_result = await db.execute(
        select(Trial.status, func.count(Trial.id))
        .group_by(Trial.status)
    )
    by_status = {row[0] or "unknown": row[1] for row in status_result.fetchall()}
    
    # By phase
    phase_result = await db.execute(
        select(Trial.phase, func.count(Trial.id))
        .group_by(Trial.phase)
    )
    by_phase = {row[0] or "unknown": row[1] for row in phase_result.fetchall()}
    
    return {
        "total_trials": total,
        "by_status": by_status,
        "by_phase": by_phase,
    }


# Sample data endpoint for demo
@router.post(
    "/seed-sample-data",
    summary="Seed sample trials (demo only)",
    include_in_schema=False,
)
async def seed_sample_trials(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Seed database with sample clinical trials for demo purposes."""
    
    sample_trials = [
        {
            "nct_id": "NCT04567890",
            "title": "Phase 3 Study of Novel EGFR Inhibitor in Advanced Non-Small Cell Lung Cancer",
            "description": "A randomized, double-blind study evaluating the efficacy and safety of XYZ-001 compared to standard of care in patients with EGFR-positive NSCLC.",
            "status": "RECRUITING",
            "phase": "Phase 3",
            "study_type": "Interventional",
            "sponsor": "PharmaCorp Research",
            "conditions": ["non-small cell lung cancer", "NSCLC", "EGFR-positive lung cancer"],
            "eligibility_criteria": {
                "age_min": 18,
                "age_max": 75,
                "gender": "all",
                "inclusion": ["EGFR-positive NSCLC", "ECOG 0-1"],
                "exclusion": ["brain metastases", "active autoimmune disease"]
            },
            "locations": ["United States", "Canada", "Germany"],
            "enrollment_count": 500,
        },
        {
            "nct_id": "NCT04567891",
            "title": "Immunotherapy Combination Trial for Triple-Negative Breast Cancer",
            "description": "Evaluating pembrolizumab plus chemotherapy in patients with locally advanced or metastatic triple-negative breast cancer.",
            "status": "RECRUITING",
            "phase": "Phase 2",
            "study_type": "Interventional",
            "sponsor": "OncoResearch Institute",
            "conditions": ["triple-negative breast cancer", "TNBC", "breast cancer"],
            "eligibility_criteria": {
                "age_min": 18,
                "gender": "female",
                "inclusion": ["Triple-negative breast cancer", "Measurable disease"],
                "exclusion": ["Prior checkpoint inhibitor", "Active autoimmune disease"]
            },
            "locations": ["United States", "United Kingdom", "France"],
            "enrollment_count": 300,
        },
        {
            "nct_id": "NCT04567892",
            "title": "Novel GLP-1 Agonist for Type 2 Diabetes with Cardiovascular Risk",
            "description": "A phase 3 cardiovascular outcomes trial of once-weekly GLP-001 in patients with type 2 diabetes and established cardiovascular disease.",
            "status": "RECRUITING",
            "phase": "Phase 3",
            "study_type": "Interventional",
            "sponsor": "Diabetes Research Foundation",
            "conditions": ["type 2 diabetes", "T2D", "diabetes mellitus type 2", "cardiovascular disease"],
            "eligibility_criteria": {
                "age_min": 40,
                "age_max": 85,
                "gender": "all",
                "inclusion": ["HbA1c >= 7.0%", "Established CV disease"],
                "exclusion": ["Type 1 diabetes", "Pancreatitis history"]
            },
            "locations": ["United States", "Japan", "Australia", "Brazil"],
            "enrollment_count": 1000,
        },
        {
            "nct_id": "NCT04567893",
            "title": "Gene Therapy for Rare Inherited Retinal Dystrophy",
            "description": "A single-dose gene replacement therapy for patients with confirmed biallelic RPE65-mediated inherited retinal dystrophy.",
            "status": "RECRUITING",
            "phase": "Phase 1",
            "study_type": "Interventional",
            "sponsor": "GeneSight Therapeutics",
            "conditions": ["inherited retinal dystrophy", "RPE65 mutation", "Leber congenital amaurosis"],
            "eligibility_criteria": {
                "age_min": 3,
                "age_max": 65,
                "gender": "all",
                "inclusion": ["Confirmed biallelic RPE65 mutation", "Viable retinal cells"],
                "exclusion": ["Total blindness", "Previous gene therapy"]
            },
            "locations": ["United States", "Netherlands"],
            "enrollment_count": 30,
        },
        {
            "nct_id": "NCT04567894",
            "title": "Anti-Amyloid Antibody in Early Alzheimer's Disease",
            "description": "Evaluating the efficacy of monthly infusions of anti-amyloid antibody ABC-123 in patients with early Alzheimer's disease and confirmed amyloid pathology.",
            "status": "RECRUITING",
            "phase": "Phase 3",
            "study_type": "Interventional",
            "sponsor": "NeuroScience Partners",
            "conditions": ["Alzheimer's disease", "early Alzheimer's", "mild cognitive impairment"],
            "eligibility_criteria": {
                "age_min": 50,
                "age_max": 85,
                "gender": "all",
                "inclusion": ["Positive amyloid PET", "MMSE >= 20"],
                "exclusion": ["Non-Alzheimer's dementia", "Recent stroke"]
            },
            "locations": ["United States", "Canada", "Spain", "South Korea"],
            "enrollment_count": 1500,
        },
    ]
    
    created = []
    for trial_data in sample_trials:
        # Check if exists
        existing = await db.execute(
            select(Trial).where(Trial.nct_id == trial_data["nct_id"])
        )
        if existing.scalar_one_or_none():
            continue
        
        trial = Trial(**trial_data)
        db.add(trial)
        created.append(trial_data["nct_id"])
    
    await db.commit()
    
    return {
        "message": "Sample trials seeded",
        "created": created,
        "count": len(created),
    }
