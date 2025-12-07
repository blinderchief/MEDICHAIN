"""
MediChain SingularityNET API Endpoints

API routes for interacting with SingularityNET:
- Service discovery
- AI service calls
- Payment management
- Marketplace integration
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from src.services.snet_service import (
    PaymentStrategy,
    SNETCallResult,
    SNETServiceInfo,
    get_medical_ai_services,
    get_snet_service,
    SNET_MARKETPLACE_URL,
    SNET_PUBLISHER_URL,
)

router = APIRouter(tags=["SingularityNET"])


# ─────────────────────────────────────────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────────────────────────────────────────

class ServiceCallRequest(BaseModel):
    """Request to call a SingularityNET service."""
    org_id: str = Field(..., description="Organization ID")
    service_id: str = Field(..., description="Service ID")
    method_name: str = Field(..., description="gRPC method name")
    message_name: str = Field(..., description="gRPC message name")
    parameters: dict[str, Any] = Field(default_factory=dict, description="Method parameters")
    payment_strategy: PaymentStrategy = Field(
        default=PaymentStrategy.DEFAULT,
        description="Payment strategy to use"
    )


class ServiceCallResponse(BaseModel):
    """Response from a service call."""
    success: bool
    data: Any | None = None
    payment_channel_id: str | None = None
    amount_paid_cogs: int = 0
    error: str | None = None


class MedicalTextRequest(BaseModel):
    """Request for medical text analysis."""
    text: str = Field(..., min_length=1, max_length=50000, description="Medical text to analyze")


class MedicalEntitiesResponse(BaseModel):
    """Response with extracted medical entities."""
    entities: list[dict[str, Any]]
    source: str = "snet_marketplace"


class TrialCriteriaSummaryRequest(BaseModel):
    """Request for trial criteria summarization."""
    criteria_text: str = Field(..., min_length=1, description="Eligibility criteria text")
    max_length: int = Field(default=200, ge=50, le=1000, description="Max summary length")


class OrganizationInfo(BaseModel):
    """Information about a SNET organization."""
    org_id: str
    services: list[str]


class ServiceInfoResponse(BaseModel):
    """Detailed service information."""
    org_id: str
    service_id: str
    display_name: str
    description: str
    price_in_cogs: int
    free_calls_available: int
    endpoints: list[str]
    methods: list[dict[str, str]]


class SNETStatusResponse(BaseModel):
    """SingularityNET SDK status."""
    initialized: bool
    network: str
    organization_id: str
    available_services: list[str]
    marketplace_url: str = SNET_MARKETPLACE_URL
    publisher_url: str = SNET_PUBLISHER_URL


# ─────────────────────────────────────────────────────────────────────────────
# Service Discovery Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/status", response_model=SNETStatusResponse)
async def get_snet_status():
    """
    Get SingularityNET SDK status and configuration.
    
    Returns current initialization state and available services.
    """
    snet = get_snet_service()
    
    # Try to initialize if not already
    if not snet.is_initialized:
        await snet.initialize()
    
    # Get our organization's services
    from src.config import settings
    org_id = settings.snet_organization_id
    services = await snet.list_services(org_id)
    
    return SNETStatusResponse(
        initialized=snet.is_initialized,
        network=settings.snet_network,
        organization_id=org_id,
        available_services=services,
    )


@router.get("/organizations", response_model=list[OrganizationInfo])
async def list_organizations():
    """
    List all organizations on SingularityNET marketplace.
    
    Returns organizations with their available services.
    """
    snet = get_snet_service()
    
    if not snet.is_initialized:
        await snet.initialize()
    
    orgs = await snet.list_organizations()
    
    result = []
    for org_id in orgs[:10]:  # Limit to first 10
        services = await snet.list_services(org_id)
        result.append(OrganizationInfo(org_id=org_id, services=services))
    
    return result


@router.get("/services/{org_id}", response_model=list[str])
async def list_org_services(org_id: str):
    """
    List all services for an organization.
    
    Args:
        org_id: Organization identifier
    """
    snet = get_snet_service()
    
    if not snet.is_initialized:
        await snet.initialize()
    
    return await snet.list_services(org_id)


@router.get("/services/{org_id}/{service_id}", response_model=ServiceInfoResponse)
async def get_service_info(org_id: str, service_id: str):
    """
    Get detailed information about a service.
    
    Args:
        org_id: Organization identifier
        service_id: Service identifier
    """
    snet = get_snet_service()
    
    if not snet.is_initialized:
        await snet.initialize()
    
    info = await snet.get_service_metadata(org_id, service_id)
    
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service {org_id}/{service_id} not found"
        )
    
    # Get methods
    methods = await snet.get_service_methods(org_id, service_id)
    
    return ServiceInfoResponse(
        org_id=info.org_id,
        service_id=info.service_id,
        display_name=info.display_name,
        description=info.description,
        price_in_cogs=info.price_in_cogs,
        free_calls_available=info.free_calls_available,
        endpoints=info.endpoints,
        methods=methods,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Service Call Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/call", response_model=ServiceCallResponse)
async def call_service(request: ServiceCallRequest):
    """
    Call a SingularityNET AI service.
    
    Executes a gRPC method on the specified service with payment handling.
    """
    snet = get_snet_service()
    
    if not snet.is_initialized:
        await snet.initialize()
    
    # Create client with specified payment strategy
    await snet.create_service_client(
        org_id=request.org_id,
        service_id=request.service_id,
        payment_strategy=request.payment_strategy,
    )
    
    # Make the call
    result = await snet.call_service(
        org_id=request.org_id,
        service_id=request.service_id,
        method_name=request.method_name,
        message_name=request.message_name,
        **request.parameters,
    )
    
    return ServiceCallResponse(
        success=result.success,
        data=result.data,
        payment_channel_id=result.payment_channel_id,
        amount_paid_cogs=result.amount_paid_cogs,
        error=result.error,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Medical AI Services (Pre-configured SNET services)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/medical/analyze", response_model=dict[str, Any])
async def analyze_medical_text(request: MedicalTextRequest):
    """
    Analyze medical text using SingularityNET NLP service.
    
    Extracts conditions, medications, and other medical entities.
    """
    medical_ai = get_medical_ai_services()
    
    # Initialize SNET if needed
    snet = get_snet_service()
    if not snet.is_initialized:
        await snet.initialize()
    
    result = await medical_ai.analyze_medical_text(request.text)
    return result


@router.post("/medical/entities", response_model=MedicalEntitiesResponse)
async def extract_medical_entities(request: MedicalTextRequest):
    """
    Extract medical entities from text.
    
    Identifies conditions, medications, procedures, and biomarkers.
    """
    medical_ai = get_medical_ai_services()
    
    snet = get_snet_service()
    if not snet.is_initialized:
        await snet.initialize()
    
    entities = await medical_ai.extract_medical_entities(request.text)
    
    return MedicalEntitiesResponse(
        entities=entities,
        source="snet_marketplace"
    )


@router.post("/medical/summarize-criteria", response_model=dict[str, str])
async def summarize_trial_criteria(request: TrialCriteriaSummaryRequest):
    """
    Summarize clinical trial eligibility criteria.
    
    Uses SNET text summarization service.
    """
    medical_ai = get_medical_ai_services()
    
    snet = get_snet_service()
    if not snet.is_initialized:
        await snet.initialize()
    
    summary = await medical_ai.summarize_trial_criteria(request.criteria_text)
    
    return {
        "original_length": len(request.criteria_text),
        "summary": summary,
        "summary_length": len(summary),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Payment Management
# ─────────────────────────────────────────────────────────────────────────────

class DepositRequest(BaseModel):
    """Request to deposit to MPE."""
    amount_cogs: int = Field(..., gt=0, description="Amount in cogs to deposit")


@router.post("/deposit")
async def deposit_to_escrow(request: DepositRequest):
    """
    Deposit FET tokens to Multi-Party Escrow.
    
    Required for paid service calls.
    """
    snet = get_snet_service()
    
    if not snet.is_initialized:
        init_success = await snet.initialize()
        if not init_success:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SingularityNET SDK not properly configured"
            )
    
    success = await snet.deposit_to_escrow(request.amount_cogs)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deposit to escrow"
        )
    
    return {
        "success": True,
        "amount_deposited_cogs": request.amount_cogs,
        "message": "Deposit successful"
    }


@router.get("/price/{org_id}/{service_id}")
async def get_service_price(org_id: str, service_id: str):
    """
    Get the price for calling a service.
    
    Returns price in cogs (1 FET = 10^8 cogs).
    """
    snet = get_snet_service()
    
    if not snet.is_initialized:
        await snet.initialize()
    
    price = await snet.get_price(org_id, service_id)
    
    return {
        "org_id": org_id,
        "service_id": service_id,
        "price_cogs": price,
        "price_fet": price / 100_000_000,  # Convert to FET
    }
