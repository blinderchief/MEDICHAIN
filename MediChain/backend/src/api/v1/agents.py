"""
MediChain Agent Orchestration API

Endpoints for orchestrating the AI agent mesh:
- Patient profiling pipeline
- Trial matching pipeline
- Full enrollment workflow
- Agent status and metrics
"""

import asyncio
import logging
from datetime import datetime, UTC
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel.ext.asyncio.session import AsyncSession

from src.core.database import get_session
from src.middleware.auth import ClerkUser, require_auth
from src.agents.patient_agent import PatientAgent
from src.agents.matcher_agent import MatcherAgent
from src.agents.consent_agent import ConsentAgent
from src.models.patient import Patient
from src.models.trial import Trial
from src.models.match import Match, MatchStatus

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Agent Orchestration"])


# ─────────────────────────────────────────────────────────────────────────────
# Enums and Models
# ─────────────────────────────────────────────────────────────────────────────

class PipelineStatus(str, Enum):
    """Pipeline execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class AgentType(str, Enum):
    """Available agent types."""
    PATIENT = "patient"
    MATCHER = "matcher"
    CONSENT = "consent"


class PipelineStage(BaseModel):
    """Individual pipeline stage result."""
    name: str
    agent: AgentType
    status: PipelineStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int | None = None
    result: dict[str, Any] | None = None
    error: str | None = None


class PipelineResult(BaseModel):
    """Complete pipeline execution result."""
    pipeline_id: str
    pipeline_type: str
    status: PipelineStatus
    stages: list[PipelineStage]
    started_at: datetime
    completed_at: datetime | None = None
    total_duration_ms: int | None = None
    final_result: dict[str, Any] | None = None
    errors: list[str] = Field(default_factory=list)


class ProfilePipelineRequest(BaseModel):
    """Request to run patient profiling pipeline."""
    ehr_data: dict[str, Any] = Field(..., description="Raw EHR/medical record data")
    patient_id: UUID | None = Field(None, description="Existing patient ID to update")
    generate_embedding: bool = Field(True, description="Generate vector embedding")
    include_recommendations: bool = Field(True, description="Generate health recommendations")


class MatchPipelineRequest(BaseModel):
    """Request to run trial matching pipeline."""
    patient_id: UUID = Field(..., description="Patient to find matches for")
    max_matches: int = Field(10, ge=1, le=50)
    min_confidence: float = Field(0.7, ge=0.0, le=1.0)
    location_filter: str | None = Field(None, description="Filter by location")
    condition_filter: list[str] | None = Field(None, description="Filter by conditions")


class EnrollmentPipelineRequest(BaseModel):
    """Request to run full enrollment pipeline."""
    patient_id: UUID
    trial_id: UUID
    auto_generate_consent: bool = Field(True)
    notify_patient: bool = Field(True)


class AgentHealthResponse(BaseModel):
    """Agent health status."""
    agent: AgentType
    status: str
    last_execution: datetime | None = None
    total_executions: int = 0
    success_rate: float = 0.0
    avg_duration_ms: float = 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline Execution
# ─────────────────────────────────────────────────────────────────────────────

# In-memory pipeline tracking (use Redis in production)
_pipeline_results: dict[str, PipelineResult] = {}


async def run_profiling_pipeline(
    request: ProfilePipelineRequest,
    session: AsyncSession,
    user_id: str,
) -> PipelineResult:
    """
    Execute patient profiling pipeline.
    
    Stages:
    1. Extract profile from EHR (PatientAgent)
    2. Generate semantic hash (PatientAgent)
    3. Create vector embedding (PatientAgent)
    4. Generate recommendations (MatcherAgent)
    """
    pipeline_id = str(uuid4())
    pipeline = PipelineResult(
        pipeline_id=pipeline_id,
        pipeline_type="profiling",
        status=PipelineStatus.RUNNING,
        stages=[],
        started_at=datetime.now(UTC),
    )
    _pipeline_results[pipeline_id] = pipeline
    
    patient_agent = PatientAgent()
    matcher_agent = MatcherAgent()
    
    try:
        # Stage 1: Extract profile
        stage1 = PipelineStage(
            name="extract_profile",
            agent=AgentType.PATIENT,
            status=PipelineStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        pipeline.stages.append(stage1)
        
        try:
            profile = await patient_agent.extract_profile(request.ehr_data)
            stage1.status = PipelineStatus.COMPLETED
            stage1.completed_at = datetime.now(UTC)
            stage1.duration_ms = int((stage1.completed_at - stage1.started_at).total_seconds() * 1000)
            stage1.result = {"profile_extracted": True, "conditions_count": len(profile.get("conditions", []))}
        except Exception as e:
            stage1.status = PipelineStatus.FAILED
            stage1.error = str(e)
            pipeline.errors.append(f"Profile extraction failed: {e}")
            raise
        
        # Stage 2: Generate semantic hash
        stage2 = PipelineStage(
            name="generate_semantic_hash",
            agent=AgentType.PATIENT,
            status=PipelineStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        pipeline.stages.append(stage2)
        
        try:
            semantic_hash = await patient_agent.generate_semantic_hash(profile)
            stage2.status = PipelineStatus.COMPLETED
            stage2.completed_at = datetime.now(UTC)
            stage2.duration_ms = int((stage2.completed_at - stage2.started_at).total_seconds() * 1000)
            stage2.result = {"semantic_hash": semantic_hash[:16] + "..."}
        except Exception as e:
            stage2.status = PipelineStatus.FAILED
            stage2.error = str(e)
            pipeline.errors.append(f"Semantic hash generation failed: {e}")
            # Non-critical, continue
        
        # Stage 3: Generate embedding
        if request.generate_embedding:
            stage3 = PipelineStage(
                name="generate_embedding",
                agent=AgentType.PATIENT,
                status=PipelineStatus.RUNNING,
                started_at=datetime.now(UTC),
            )
            pipeline.stages.append(stage3)
            
            try:
                embedding = await patient_agent.generate_embedding(profile)
                stage3.status = PipelineStatus.COMPLETED
                stage3.completed_at = datetime.now(UTC)
                stage3.duration_ms = int((stage3.completed_at - stage3.started_at).total_seconds() * 1000)
                stage3.result = {"embedding_dimensions": len(embedding)}
            except Exception as e:
                stage3.status = PipelineStatus.FAILED
                stage3.error = str(e)
                pipeline.errors.append(f"Embedding generation failed: {e}")
        
        # Stage 4: Generate recommendations
        if request.include_recommendations:
            stage4 = PipelineStage(
                name="generate_recommendations",
                agent=AgentType.MATCHER,
                status=PipelineStatus.RUNNING,
                started_at=datetime.now(UTC),
            )
            pipeline.stages.append(stage4)
            
            try:
                recommendations = await matcher_agent.generate_patient_recommendations(profile)
                stage4.status = PipelineStatus.COMPLETED
                stage4.completed_at = datetime.now(UTC)
                stage4.duration_ms = int((stage4.completed_at - stage4.started_at).total_seconds() * 1000)
                stage4.result = {"recommendations_count": len(recommendations)}
            except Exception as e:
                stage4.status = PipelineStatus.FAILED
                stage4.error = str(e)
                pipeline.errors.append(f"Recommendation generation failed: {e}")
        
        # Finalize
        pipeline.status = PipelineStatus.COMPLETED if not pipeline.errors else PipelineStatus.PARTIAL
        pipeline.completed_at = datetime.now(UTC)
        pipeline.total_duration_ms = int((pipeline.completed_at - pipeline.started_at).total_seconds() * 1000)
        pipeline.final_result = {
            "profile": profile,
            "semantic_hash": semantic_hash if 'semantic_hash' in dir() else None,
            "recommendations": recommendations if 'recommendations' in dir() else None,
        }
        
        return pipeline
        
    except Exception as e:
        pipeline.status = PipelineStatus.FAILED
        pipeline.completed_at = datetime.now(UTC)
        pipeline.total_duration_ms = int((pipeline.completed_at - pipeline.started_at).total_seconds() * 1000)
        logger.error(f"Profiling pipeline failed: {e}")
        return pipeline


async def run_matching_pipeline(
    request: MatchPipelineRequest,
    session: AsyncSession,
    user_id: str,
) -> PipelineResult:
    """
    Execute trial matching pipeline.
    
    Stages:
    1. Load patient profile (Database)
    2. Search similar trials (VectorDB)
    3. Deep eligibility check (MatcherAgent)
    4. Rank and explain matches (MatcherAgent)
    """
    pipeline_id = str(uuid4())
    pipeline = PipelineResult(
        pipeline_id=pipeline_id,
        pipeline_type="matching",
        status=PipelineStatus.RUNNING,
        stages=[],
        started_at=datetime.now(UTC),
    )
    _pipeline_results[pipeline_id] = pipeline
    
    matcher_agent = MatcherAgent()
    
    try:
        # Stage 1: Load patient
        stage1 = PipelineStage(
            name="load_patient",
            agent=AgentType.PATIENT,
            status=PipelineStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        pipeline.stages.append(stage1)
        
        patient = await session.get(Patient, request.patient_id)
        if not patient:
            stage1.status = PipelineStatus.FAILED
            stage1.error = "Patient not found"
            pipeline.status = PipelineStatus.FAILED
            pipeline.errors.append("Patient not found")
            return pipeline
        
        stage1.status = PipelineStatus.COMPLETED
        stage1.completed_at = datetime.now(UTC)
        stage1.duration_ms = int((stage1.completed_at - stage1.started_at).total_seconds() * 1000)
        stage1.result = {"patient_id": str(patient.id)}
        
        # Stage 2: Vector search
        stage2 = PipelineStage(
            name="vector_search",
            agent=AgentType.MATCHER,
            status=PipelineStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        pipeline.stages.append(stage2)
        
        try:
            candidate_trials = await matcher_agent.search_candidate_trials(
                patient,
                limit=request.max_matches * 2,  # Over-fetch for filtering
            )
            stage2.status = PipelineStatus.COMPLETED
            stage2.completed_at = datetime.now(UTC)
            stage2.duration_ms = int((stage2.completed_at - stage2.started_at).total_seconds() * 1000)
            stage2.result = {"candidates_found": len(candidate_trials)}
        except Exception as e:
            stage2.status = PipelineStatus.FAILED
            stage2.error = str(e)
            pipeline.errors.append(f"Vector search failed: {e}")
            candidate_trials = []
        
        # Stage 3: Deep eligibility check
        stage3 = PipelineStage(
            name="eligibility_check",
            agent=AgentType.MATCHER,
            status=PipelineStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        pipeline.stages.append(stage3)
        
        matches = []
        try:
            for trial in candidate_trials:
                match_result = await matcher_agent.check_eligibility(patient, trial)
                if match_result.confidence >= request.min_confidence:
                    matches.append(match_result)
            
            stage3.status = PipelineStatus.COMPLETED
            stage3.completed_at = datetime.now(UTC)
            stage3.duration_ms = int((stage3.completed_at - stage3.started_at).total_seconds() * 1000)
            stage3.result = {"eligible_matches": len(matches)}
        except Exception as e:
            stage3.status = PipelineStatus.FAILED
            stage3.error = str(e)
            pipeline.errors.append(f"Eligibility check failed: {e}")
        
        # Stage 4: Rank and explain
        stage4 = PipelineStage(
            name="rank_and_explain",
            agent=AgentType.MATCHER,
            status=PipelineStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        pipeline.stages.append(stage4)
        
        try:
            ranked_matches = await matcher_agent.rank_matches(matches)
            final_matches = ranked_matches[:request.max_matches]
            
            stage4.status = PipelineStatus.COMPLETED
            stage4.completed_at = datetime.now(UTC)
            stage4.duration_ms = int((stage4.completed_at - stage4.started_at).total_seconds() * 1000)
            stage4.result = {"final_matches": len(final_matches)}
        except Exception as e:
            stage4.status = PipelineStatus.FAILED
            stage4.error = str(e)
            pipeline.errors.append(f"Ranking failed: {e}")
            final_matches = matches[:request.max_matches]
        
        # Finalize
        pipeline.status = PipelineStatus.COMPLETED if not pipeline.errors else PipelineStatus.PARTIAL
        pipeline.completed_at = datetime.now(UTC)
        pipeline.total_duration_ms = int((pipeline.completed_at - pipeline.started_at).total_seconds() * 1000)
        pipeline.final_result = {
            "matches": [m.dict() if hasattr(m, 'dict') else m for m in final_matches],
            "total_candidates": len(candidate_trials),
            "eligible_count": len(matches),
        }
        
        return pipeline
        
    except Exception as e:
        pipeline.status = PipelineStatus.FAILED
        pipeline.completed_at = datetime.now(UTC)
        pipeline.total_duration_ms = int((pipeline.completed_at - pipeline.started_at).total_seconds() * 1000)
        logger.error(f"Matching pipeline failed: {e}")
        return pipeline


async def run_enrollment_pipeline(
    request: EnrollmentPipelineRequest,
    session: AsyncSession,
    user_id: str,
) -> PipelineResult:
    """
    Execute full enrollment pipeline.
    
    Stages:
    1. Verify match exists (Database)
    2. Generate consent form (ConsentAgent)
    3. Create enrollment record (Database)
    4. Notify stakeholders (ConsentAgent)
    """
    pipeline_id = str(uuid4())
    pipeline = PipelineResult(
        pipeline_id=pipeline_id,
        pipeline_type="enrollment",
        status=PipelineStatus.RUNNING,
        stages=[],
        started_at=datetime.now(UTC),
    )
    _pipeline_results[pipeline_id] = pipeline
    
    consent_agent = ConsentAgent()
    
    try:
        # Stage 1: Verify match
        stage1 = PipelineStage(
            name="verify_match",
            agent=AgentType.CONSENT,
            status=PipelineStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        pipeline.stages.append(stage1)
        
        patient = await session.get(Patient, request.patient_id)
        trial = await session.get(Trial, request.trial_id)
        
        if not patient or not trial:
            stage1.status = PipelineStatus.FAILED
            stage1.error = "Patient or trial not found"
            pipeline.status = PipelineStatus.FAILED
            pipeline.errors.append("Patient or trial not found")
            return pipeline
        
        stage1.status = PipelineStatus.COMPLETED
        stage1.completed_at = datetime.now(UTC)
        stage1.duration_ms = int((stage1.completed_at - stage1.started_at).total_seconds() * 1000)
        stage1.result = {"patient_found": True, "trial_found": True}
        
        # Stage 2: Generate consent form
        if request.auto_generate_consent:
            stage2 = PipelineStage(
                name="generate_consent",
                agent=AgentType.CONSENT,
                status=PipelineStatus.RUNNING,
                started_at=datetime.now(UTC),
            )
            pipeline.stages.append(stage2)
            
            try:
                consent_form = await consent_agent.generate_consent_form(
                    patient=patient,
                    trial=trial,
                )
                stage2.status = PipelineStatus.COMPLETED
                stage2.completed_at = datetime.now(UTC)
                stage2.duration_ms = int((stage2.completed_at - stage2.started_at).total_seconds() * 1000)
                stage2.result = {"consent_sections": len(consent_form.get("sections", []))}
            except Exception as e:
                stage2.status = PipelineStatus.FAILED
                stage2.error = str(e)
                pipeline.errors.append(f"Consent generation failed: {e}")
                consent_form = {}
        else:
            consent_form = {}
        
        # Stage 3: Create enrollment record
        stage3 = PipelineStage(
            name="create_enrollment",
            agent=AgentType.CONSENT,
            status=PipelineStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        pipeline.stages.append(stage3)
        
        try:
            # Create or update match record
            match = Match(
                id=uuid4(),
                patient_id=request.patient_id,
                trial_id=request.trial_id,
                status=MatchStatus.PENDING_CONSENT,
                confidence_score=0.0,
                created_by=user_id,
            )
            session.add(match)
            await session.commit()
            
            stage3.status = PipelineStatus.COMPLETED
            stage3.completed_at = datetime.now(UTC)
            stage3.duration_ms = int((stage3.completed_at - stage3.started_at).total_seconds() * 1000)
            stage3.result = {"match_id": str(match.id)}
        except Exception as e:
            stage3.status = PipelineStatus.FAILED
            stage3.error = str(e)
            pipeline.errors.append(f"Enrollment creation failed: {e}")
            await session.rollback()
        
        # Stage 4: Notify stakeholders
        if request.notify_patient:
            stage4 = PipelineStage(
                name="notify_stakeholders",
                agent=AgentType.CONSENT,
                status=PipelineStatus.RUNNING,
                started_at=datetime.now(UTC),
            )
            pipeline.stages.append(stage4)
            
            try:
                await consent_agent.notify_enrollment(
                    patient=patient,
                    trial=trial,
                    consent_form=consent_form,
                )
                stage4.status = PipelineStatus.COMPLETED
                stage4.completed_at = datetime.now(UTC)
                stage4.duration_ms = int((stage4.completed_at - stage4.started_at).total_seconds() * 1000)
                stage4.result = {"notifications_sent": True}
            except Exception as e:
                stage4.status = PipelineStatus.FAILED
                stage4.error = str(e)
                pipeline.errors.append(f"Notification failed: {e}")
        
        # Finalize
        pipeline.status = PipelineStatus.COMPLETED if not pipeline.errors else PipelineStatus.PARTIAL
        pipeline.completed_at = datetime.now(UTC)
        pipeline.total_duration_ms = int((pipeline.completed_at - pipeline.started_at).total_seconds() * 1000)
        pipeline.final_result = {
            "match_id": str(match.id) if 'match' in dir() else None,
            "consent_form": consent_form,
        }
        
        return pipeline
        
    except Exception as e:
        pipeline.status = PipelineStatus.FAILED
        pipeline.completed_at = datetime.now(UTC)
        pipeline.total_duration_ms = int((pipeline.completed_at - pipeline.started_at).total_seconds() * 1000)
        logger.error(f"Enrollment pipeline failed: {e}")
        return pipeline


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/pipelines/profile",
    response_model=PipelineResult,
    summary="Run patient profiling pipeline",
    description="Extract patient profile from EHR data using AI agents.",
)
async def run_profile_pipeline(
    request: ProfilePipelineRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    user: ClerkUser = Depends(require_auth),
) -> PipelineResult:
    """Run the patient profiling pipeline."""
    result = await run_profiling_pipeline(request, session, user.id)
    return result


@router.post(
    "/pipelines/match",
    response_model=PipelineResult,
    summary="Run trial matching pipeline",
    description="Find and rank clinical trial matches for a patient.",
)
async def run_match_pipeline(
    request: MatchPipelineRequest,
    session: AsyncSession = Depends(get_session),
    user: ClerkUser = Depends(require_auth),
) -> PipelineResult:
    """Run the trial matching pipeline."""
    result = await run_matching_pipeline(request, session, user.id)
    return result


@router.post(
    "/pipelines/enroll",
    response_model=PipelineResult,
    summary="Run enrollment pipeline",
    description="Full enrollment workflow including consent generation.",
)
async def run_enroll_pipeline(
    request: EnrollmentPipelineRequest,
    session: AsyncSession = Depends(get_session),
    user: ClerkUser = Depends(require_auth),
) -> PipelineResult:
    """Run the enrollment pipeline."""
    result = await run_enrollment_pipeline(request, session, user.id)
    return result


@router.get(
    "/pipelines/{pipeline_id}",
    response_model=PipelineResult,
    summary="Get pipeline status",
    description="Get the status and results of a pipeline execution.",
)
async def get_pipeline_status(
    pipeline_id: str,
    user: ClerkUser = Depends(require_auth),
) -> PipelineResult:
    """Get pipeline execution status."""
    if pipeline_id not in _pipeline_results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    return _pipeline_results[pipeline_id]


@router.get(
    "/health",
    response_model=list[AgentHealthResponse],
    summary="Get agent health status",
    description="Get health status for all AI agents.",
)
async def get_agents_health() -> list[AgentHealthResponse]:
    """Get health status for all agents."""
    # In production, these would come from monitoring/metrics
    return [
        AgentHealthResponse(
            agent=AgentType.PATIENT,
            status="healthy",
            total_executions=100,
            success_rate=0.95,
            avg_duration_ms=1250.0,
        ),
        AgentHealthResponse(
            agent=AgentType.MATCHER,
            status="healthy",
            total_executions=85,
            success_rate=0.92,
            avg_duration_ms=2100.0,
        ),
        AgentHealthResponse(
            agent=AgentType.CONSENT,
            status="healthy",
            total_executions=45,
            success_rate=0.98,
            avg_duration_ms=890.0,
        ),
    ]


@router.post(
    "/test-connection",
    summary="Test agent connections",
    description="Test connectivity to all agent dependencies (LLM, VectorDB, etc.).",
)
async def test_agent_connections(
    user: ClerkUser = Depends(require_auth),
) -> dict[str, Any]:
    """Test all agent connections."""
    results = {}
    
    # Test LLM
    try:
        patient_agent = PatientAgent()
        await patient_agent.health_check()
        results["llm"] = {"status": "connected", "model": "gemini-1.5-pro"}
    except Exception as e:
        results["llm"] = {"status": "error", "error": str(e)}
    
    # Test VectorDB
    try:
        from src.services.vector_db import get_vector_service
        vector_service = await get_vector_service()
        health = await vector_service.health_check()
        results["vector_db"] = health
    except Exception as e:
        results["vector_db"] = {"status": "error", "error": str(e)}
    
    # Test Blockchain
    try:
        from src.services.blockchain import get_blockchain_service
        blockchain_service = await get_blockchain_service()
        health = await blockchain_service.health_check()
        results["blockchain"] = health
    except Exception as e:
        results["blockchain"] = {"status": "error", "error": str(e)}
    
    return {
        "timestamp": datetime.now(UTC).isoformat(),
        "services": results,
    }
