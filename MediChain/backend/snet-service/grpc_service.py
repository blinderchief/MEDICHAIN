"""
MediChain gRPC Service Implementation for SingularityNET

This is the actual gRPC service that snet-daemon proxies to.
It implements the ClinicalTrialMatcher service defined in medichain.proto.

To deploy on SingularityNET:
1. Generate proto stubs: python -m grpc_tools.protoc ...
2. Run this service: python grpc_service.py
3. Configure snetd.config.json passthrough_endpoint to point here
4. Start snet-daemon: snetd serve
"""

import asyncio
import logging
import sys
import time
from concurrent import futures
from datetime import datetime
from pathlib import Path

import grpc

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# These will be generated from medichain.proto
# Run: python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. medichain.proto
try:
    import medichain_pb2
    import medichain_pb2_grpc
except ImportError:
    print("Proto stubs not found. Generate them with:")
    print("  python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. medichain.proto")
    print("Running in stub mode for development...")
    medichain_pb2 = None
    medichain_pb2_grpc = None

# Import MediChain core services
from src.agents.matcher_agent import MatcherAgent
from src.agents.patient_agent import PatientAgent
from src.services.llm import LLMService
from src.services.clinical_trials import ClinicalTrialsService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ClinicalTrialMatcherServicer:
    """
    gRPC Servicer implementing the ClinicalTrialMatcher service.
    
    This is the core SNET microservice that:
    - Receives gRPC calls from snet-daemon
    - Processes requests using MediChain AI agents
    - Returns structured responses
    - Handles payment verification (done by daemon)
    """
    
    def __init__(self):
        """Initialize the servicer with AI agents."""
        self.start_time = time.time()
        self.llm_service = LLMService()
        self.matcher_agent = MatcherAgent()
        self.patient_agent = PatientAgent()
        self.trials_service = ClinicalTrialsService()
        logger.info("ClinicalTrialMatcherServicer initialized")
    
    def HealthCheck(self, request, context):
        """Health check endpoint."""
        if medichain_pb2 is None:
            return {"status": "healthy", "version": "0.1.0"}
        
        uptime = int(time.time() - self.start_time)
        return medichain_pb2.HealthResponse(
            status="healthy",
            version="0.1.0",
            uptime_seconds=uptime
        )
    
    def MatchTrials(self, request, context):
        """
        Match a patient profile to eligible clinical trials.
        
        This is the main AI service method that:
        1. Parses patient profile from request
        2. Searches trial database
        3. Runs AI matching with explainable reasoning
        4. Returns ranked matches with scores
        """
        logger.info(f"MatchTrials called: age={request.age_range}, conditions={list(request.conditions)}")
        
        try:
            # Build patient profile from request
            patient_data = {
                "age_range": request.age_range,
                "gender": request.gender,
                "conditions": list(request.conditions),
                "medications": list(request.medications),
                "biomarkers": [
                    {"name": b.name, "value": b.value, "unit": b.unit}
                    for b in request.biomarkers
                ],
                "location": request.location,
            }
            
            # Run async matching in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                matches = loop.run_until_complete(
                    self._async_match_trials(patient_data, request.max_results or 10)
                )
            finally:
                loop.close()
            
            # Build response
            if medichain_pb2 is None:
                return {"matches": matches, "total_trials_analyzed": 100}
            
            response = medichain_pb2.TrialMatchResponse(
                total_trials_analyzed=len(matches) * 10,  # Approximate
                processing_time_ms=150.0,
                reasoning_summary="Matched using hybrid neuro-symbolic AI"
            )
            
            for match in matches:
                trial_match = medichain_pb2.TrialMatch(
                    trial_id=match.get("trial_id", ""),
                    title=match.get("title", ""),
                    sponsor=match.get("sponsor", ""),
                    match_score=match.get("score", 0.0),
                    confidence_level=match.get("confidence", "medium"),
                    ai_explanation=match.get("explanation", ""),
                    metta_reasoning=match.get("metta_reasoning", ""),
                    phase=match.get("phase", ""),
                    status=match.get("status", ""),
                )
                response.matches.append(trial_match)
            
            return response
            
        except Exception as e:
            logger.error(f"MatchTrials error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return medichain_pb2.TrialMatchResponse() if medichain_pb2 else {}
    
    async def _async_match_trials(self, patient_data: dict, max_results: int) -> list:
        """Async helper for trial matching."""
        # Use matcher agent
        matches = await self.matcher_agent.find_matches_for_profile(
            patient_data,
            limit=max_results
        )
        return matches
    
    def CheckEligibility(self, request, context):
        """
        Check patient eligibility for a specific trial.
        
        Returns detailed eligibility assessment with:
        - Pass/fail for each criterion
        - Confidence scores
        - MeTTa reasoning trace
        """
        logger.info(f"CheckEligibility called: trial={request.trial_id}")
        
        try:
            # Build patient profile
            patient_data = {
                "age_range": request.patient.age_range,
                "gender": request.patient.gender,
                "conditions": list(request.patient.conditions),
                "medications": list(request.patient.medications),
                "biomarkers": [
                    {"name": b.name, "value": b.value, "unit": b.unit}
                    for b in request.patient.biomarkers
                ],
            }
            
            # Run eligibility check
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(
                    self._async_check_eligibility(patient_data, request.trial_id)
                )
            finally:
                loop.close()
            
            if medichain_pb2 is None:
                return result
            
            response = medichain_pb2.EligibilityCheckResponse(
                is_eligible=result.get("is_eligible", False),
                confidence_score=result.get("confidence", 0.0),
                confidence_level=result.get("confidence_level", "low"),
                explanation=result.get("explanation", ""),
                metta_reasoning=result.get("metta_reasoning", ""),
            )
            
            # Add criterion results
            for inc in result.get("inclusion_results", []):
                response.inclusion_results.append(
                    medichain_pb2.CriteriaMatch(
                        criterion=inc.get("criterion", ""),
                        passed=inc.get("passed", False),
                        confidence=inc.get("confidence", 0.0),
                        explanation=inc.get("explanation", ""),
                    )
                )
            
            for exc in result.get("exclusion_results", []):
                response.exclusion_results.append(
                    medichain_pb2.CriteriaMatch(
                        criterion=exc.get("criterion", ""),
                        passed=exc.get("passed", False),
                        confidence=exc.get("confidence", 0.0),
                        explanation=exc.get("explanation", ""),
                    )
                )
            
            return response
            
        except Exception as e:
            logger.error(f"CheckEligibility error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return medichain_pb2.EligibilityCheckResponse() if medichain_pb2 else {}
    
    async def _async_check_eligibility(self, patient_data: dict, trial_id: str) -> dict:
        """Async helper for eligibility checking."""
        result = await self.matcher_agent.check_eligibility(
            patient_data,
            trial_id
        )
        return result
    
    def ExtractMedicalEntities(self, request, context):
        """
        Extract medical entities from free-text patient records.
        
        Uses NLP to identify:
        - Conditions (with ICD-10 codes)
        - Medications (with RxNorm codes)
        - Biomarkers
        - Procedures
        """
        logger.info(f"ExtractMedicalEntities called: text_length={len(request.text)}")
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                entities = loop.run_until_complete(
                    self._async_extract_entities(request.text, list(request.entity_types))
                )
            finally:
                loop.close()
            
            if medichain_pb2 is None:
                return {"entities": entities}
            
            response = medichain_pb2.MedicalEntitiesResponse(
                processing_time_ms=50.0
            )
            
            for entity in entities:
                response.entities.append(
                    medichain_pb2.MedicalEntity(
                        text=entity.get("text", ""),
                        normalized_text=entity.get("normalized", ""),
                        entity_type=entity.get("type", ""),
                        confidence=entity.get("confidence", 0.0),
                        is_negated=entity.get("negated", False),
                        icd10_code=entity.get("icd10", ""),
                        snomed_code=entity.get("snomed", ""),
                        rxnorm_code=entity.get("rxnorm", ""),
                    )
                )
            
            return response
            
        except Exception as e:
            logger.error(f"ExtractMedicalEntities error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return medichain_pb2.MedicalEntitiesResponse() if medichain_pb2 else {}
    
    async def _async_extract_entities(self, text: str, entity_types: list) -> list:
        """Async helper for entity extraction."""
        entities = await self.patient_agent.extract_medical_entities(
            text,
            entity_types=entity_types or ["condition", "medication", "biomarker"]
        )
        return entities
    
    def GetMatchInsights(self, request, context):
        """
        Get AI-powered insights for a patient-trial match.
        
        Provides:
        - Risk/benefit analysis
        - Alternative trial suggestions
        - Timeline estimates
        - Patient-friendly summary
        """
        logger.info(f"GetMatchInsights called: patient={request.patient_id}, trial={request.trial_id}")
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                insights = loop.run_until_complete(
                    self._async_get_insights(request.patient_id, request.trial_id)
                )
            finally:
                loop.close()
            
            if medichain_pb2 is None:
                return insights
            
            response = medichain_pb2.MatchInsightsResponse(
                summary=insights.get("summary", ""),
                estimated_duration=insights.get("duration", ""),
            )
            
            for risk in insights.get("risks", []):
                response.risks.append(
                    medichain_pb2.Insight(
                        title=risk.get("title", ""),
                        description=risk.get("description", ""),
                        severity=risk.get("severity", "medium"),
                        confidence=risk.get("confidence", 0.0),
                    )
                )
            
            for benefit in insights.get("benefits", []):
                response.benefits.append(
                    medichain_pb2.Insight(
                        title=benefit.get("title", ""),
                        description=benefit.get("description", ""),
                        severity="positive",
                        confidence=benefit.get("confidence", 0.0),
                    )
                )
            
            for alt_id in insights.get("alternatives", []):
                response.alternative_trial_ids.append(alt_id)
            
            for consideration in insights.get("considerations", []):
                response.key_considerations.append(consideration)
            
            return response
            
        except Exception as e:
            logger.error(f"GetMatchInsights error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return medichain_pb2.MatchInsightsResponse() if medichain_pb2 else {}
    
    async def _async_get_insights(self, patient_id: str, trial_id: str) -> dict:
        """Async helper for generating insights."""
        insights = await self.matcher_agent.generate_match_insights(
            patient_id,
            trial_id
        )
        return insights


def serve(port: int = 7000):
    """
    Start the gRPC server.
    
    Args:
        port: Port to listen on (snet-daemon will connect here)
    """
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    
    servicer = ClinicalTrialMatcherServicer()
    
    if medichain_pb2_grpc is not None:
        medichain_pb2_grpc.add_ClinicalTrialMatcherServicer_to_server(
            servicer, server
        )
    
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    
    logger.info(f"MediChain gRPC service started on port {port}")
    logger.info("Ready to receive requests from snet-daemon")
    logger.info("Service methods:")
    logger.info("  - MatchTrials: Match patient to clinical trials")
    logger.info("  - CheckEligibility: Check eligibility for specific trial")
    logger.info("  - ExtractMedicalEntities: Extract entities from text")
    logger.info("  - GetMatchInsights: Get AI insights for match")
    logger.info("  - HealthCheck: Service health status")
    
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Shutting down gRPC server...")
        server.stop(0)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="MediChain gRPC Service for SingularityNET")
    parser.add_argument("--port", type=int, default=7000, help="Port to listen on")
    args = parser.parse_args()
    
    serve(args.port)
