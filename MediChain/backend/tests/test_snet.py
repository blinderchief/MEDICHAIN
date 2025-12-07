"""
MediChain SingularityNET Integration Tests

Tests for the SingularityNET SDK service wrapper and API endpoints.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.services.snet_service import (
    SingularityNETService,
    MedicalAIServices,
    PaymentStrategy,
    SNETServiceInfo,
    SNETCallResult,
    get_snet_service,
    get_medical_ai_services,
)


# ═══════════════════════════════════════════════════════════════════════════════
# SingularityNET Service Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestSingularityNETService:
    """Tests for the SingularityNETService class."""
    
    def setup_method(self):
        """Reset singleton for each test."""
        from src.services import snet_service
        snet_service._snet_service = None
    
    @pytest.mark.asyncio
    async def test_service_initialization_without_sdk(self):
        """Test service initialization when SDK is not available."""
        service = SingularityNETService()
        
        # Should not be initialized without SDK
        assert not service.is_initialized
        
        # Initialize should return False when SDK not configured
        result = await service.initialize()
        assert not result
    
    @pytest.mark.asyncio
    async def test_mock_organizations(self):
        """Test mock organization listing."""
        service = SingularityNETService()
        
        orgs = await service.list_organizations()
        
        assert isinstance(orgs, list)
        assert len(orgs) > 0
        assert "medichain-health" in orgs
    
    @pytest.mark.asyncio
    async def test_mock_services(self):
        """Test mock service listing."""
        service = SingularityNETService()
        
        services = await service.list_services("medichain-health")
        
        assert isinstance(services, list)
        assert "trial-matcher" in services
        assert "medical-nlp" in services
    
    @pytest.mark.asyncio
    async def test_mock_service_info(self):
        """Test mock service metadata retrieval."""
        service = SingularityNETService()
        
        info = await service.get_service_metadata(
            org_id="medichain-health",
            service_id="trial-matcher"
        )
        
        assert info is not None
        assert isinstance(info, SNETServiceInfo)
        assert info.org_id == "medichain-health"
        assert info.service_id == "trial-matcher"
        assert info.price_in_cogs >= 0
        assert info.free_calls_available >= 0
    
    @pytest.mark.asyncio
    async def test_create_mock_service_client(self):
        """Test creating a mock service client."""
        service = SingularityNETService()
        
        result = await service.create_service_client(
            org_id="snet",
            service_id="medical-nlp",
            payment_strategy=PaymentStrategy.FREE_CALL,
        )
        
        assert result is True
        assert "snet/medical-nlp" in service._service_clients
    
    @pytest.mark.asyncio
    async def test_mock_service_call(self):
        """Test mock service call."""
        service = SingularityNETService()
        
        result = await service.call_service(
            org_id="medichain-health",
            service_id="trial-matcher",
            method_name="match",
            message_name="PatientInput",
            patient_id="test-123",
        )
        
        assert isinstance(result, SNETCallResult)
        assert result.success is True
        assert result.data is not None
        assert "matches" in result.data
    
    @pytest.mark.asyncio
    async def test_mock_nlp_service_call(self):
        """Test mock NLP service call."""
        service = SingularityNETService()
        
        result = await service.call_service(
            org_id="snet",
            service_id="medical-nlp",
            method_name="analyze",
            message_name="TextInput",
            text="Patient has diabetes",
        )
        
        assert result.success is True
        assert "entities" in result.data
    
    @pytest.mark.asyncio
    async def test_mock_eligibility_service_call(self):
        """Test mock eligibility checker service call."""
        service = SingularityNETService()
        
        result = await service.call_service(
            org_id="medichain-health",
            service_id="eligibility-checker",
            method_name="check",
            message_name="CheckRequest",
            patient_id="test-123",
            trial_id="NCT001",
        )
        
        assert result.success is True
        assert "eligible" in result.data
        assert "confidence" in result.data
    
    @pytest.mark.asyncio
    async def test_get_service_methods(self):
        """Test getting service methods."""
        service = SingularityNETService()
        
        methods = await service.get_service_methods(
            org_id="medichain-health",
            service_id="trial-matcher"
        )
        
        assert isinstance(methods, list)
        assert len(methods) > 0
        assert all("method" in m for m in methods)
    
    @pytest.mark.asyncio
    async def test_get_price(self):
        """Test getting service price."""
        service = SingularityNETService()
        
        price = await service.get_price("medichain-health", "trial-matcher")
        
        assert isinstance(price, int)
        assert price >= 0
    
    @pytest.mark.asyncio
    async def test_mock_deposit_to_escrow(self):
        """Test mock deposit to MPE."""
        service = SingularityNETService()
        
        result = await service.deposit_to_escrow(1000)
        
        assert result is True


# ═══════════════════════════════════════════════════════════════════════════════
# Medical AI Services Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestMedicalAIServices:
    """Tests for pre-configured medical AI services."""
    
    @pytest.mark.asyncio
    async def test_analyze_medical_text(self):
        """Test medical text analysis."""
        snet = SingularityNETService()
        medical_ai = MedicalAIServices(snet)
        
        result = await medical_ai.analyze_medical_text(
            "The patient presents with Type 2 diabetes and hypertension."
        )
        
        assert isinstance(result, dict)
        assert "entities" in result or "error" not in result
    
    @pytest.mark.asyncio
    async def test_extract_medical_entities(self):
        """Test medical entity extraction."""
        snet = SingularityNETService()
        medical_ai = MedicalAIServices(snet)
        
        entities = await medical_ai.extract_medical_entities(
            "Patient is on metformin 500mg for diabetes management."
        )
        
        assert isinstance(entities, list)
    
    @pytest.mark.asyncio
    async def test_summarize_trial_criteria(self):
        """Test trial criteria summarization."""
        snet = SingularityNETService()
        medical_ai = MedicalAIServices(snet)
        
        criteria = """
        Inclusion Criteria:
        - Adults aged 18-65
        - Diagnosed with Type 2 diabetes
        - HbA1c between 7.0% and 10.0%
        
        Exclusion Criteria:
        - Pregnant or nursing women
        - History of pancreatitis
        - Severe renal impairment
        """
        
        summary = await medical_ai.summarize_trial_criteria(criteria)
        
        assert isinstance(summary, str)
        assert len(summary) > 0
        assert len(summary) <= len(criteria)


# ═══════════════════════════════════════════════════════════════════════════════
# API Endpoint Tests
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_snet_status_endpoint():
    """Test SNET status endpoint."""
    from fastapi.testclient import TestClient
    from src.main import app
    
    client = TestClient(app)
    response = client.get("/api/v1/snet/status")
    
    assert response.status_code == 200
    data = response.json()
    assert "initialized" in data
    assert "network" in data
    assert "organization_id" in data


@pytest.mark.asyncio
async def test_snet_organizations_endpoint():
    """Test SNET organizations listing endpoint."""
    from fastapi.testclient import TestClient
    from src.main import app
    
    client = TestClient(app)
    response = client.get("/api/v1/snet/organizations")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_snet_services_endpoint():
    """Test SNET services listing endpoint."""
    from fastapi.testclient import TestClient
    from src.main import app
    
    client = TestClient(app)
    response = client.get("/api/v1/snet/services/medichain-health")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_snet_service_call_endpoint():
    """Test SNET service call endpoint."""
    from fastapi.testclient import TestClient
    from src.main import app
    
    client = TestClient(app)
    response = client.post(
        "/api/v1/snet/call",
        json={
            "org_id": "medichain-health",
            "service_id": "trial-matcher",
            "method_name": "match",
            "message_name": "PatientInput",
            "parameters": {"patient_id": "test-123"},
            "payment_strategy": "default",
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert data["success"] is True


@pytest.mark.asyncio
async def test_snet_medical_analyze_endpoint():
    """Test medical text analysis endpoint."""
    from fastapi.testclient import TestClient
    from src.main import app
    
    client = TestClient(app)
    response = client.post(
        "/api/v1/snet/medical/analyze",
        json={"text": "Patient has been diagnosed with breast cancer stage 2."}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_snet_medical_entities_endpoint():
    """Test medical entity extraction endpoint."""
    from fastapi.testclient import TestClient
    from src.main import app
    
    client = TestClient(app)
    response = client.post(
        "/api/v1/snet/medical/entities",
        json={"text": "Taking lisinopril 10mg daily for blood pressure."}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "entities" in data
    assert "source" in data
    assert data["source"] == "snet_marketplace"


@pytest.mark.asyncio
async def test_snet_price_endpoint():
    """Test SNET service price endpoint."""
    from fastapi.testclient import TestClient
    from src.main import app
    
    client = TestClient(app)
    response = client.get("/api/v1/snet/price/medichain-health/trial-matcher")
    
    assert response.status_code == 200
    data = response.json()
    assert "price_cogs" in data
    assert "price_fet" in data


# ═══════════════════════════════════════════════════════════════════════════════
# Singleton Tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_get_snet_service_singleton():
    """Test that get_snet_service returns singleton."""
    from src.services import snet_service
    snet_service._snet_service = None
    
    service1 = get_snet_service()
    service2 = get_snet_service()
    
    assert service1 is service2


def test_get_medical_ai_services():
    """Test getting medical AI services instance."""
    medical = get_medical_ai_services()
    
    assert isinstance(medical, MedicalAIServices)
    assert medical.snet is not None


# ═══════════════════════════════════════════════════════════════════════════════
# Payment Strategy Tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_payment_strategy_enum():
    """Test payment strategy enum values."""
    assert PaymentStrategy.DEFAULT.value == "default"
    assert PaymentStrategy.FREE_CALL.value == "free_call"
    assert PaymentStrategy.PAID_CALL.value == "paid_call"
    assert PaymentStrategy.PREPAID_CALL.value == "prepaid_call"


# ═══════════════════════════════════════════════════════════════════════════════
# Data Model Tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_snet_service_info_dataclass():
    """Test SNETServiceInfo dataclass."""
    info = SNETServiceInfo(
        org_id="test-org",
        service_id="test-service",
        display_name="Test Service",
        description="A test service",
        price_in_cogs=10,
        free_calls_available=5,
        endpoints=["https://test.com:7000"],
        methods=[{"method": "test", "input": "Input", "output": "Output"}],
    )
    
    assert info.org_id == "test-org"
    assert info.service_id == "test-service"
    assert info.price_in_cogs == 10
    assert len(info.endpoints) == 1


def test_snet_call_result_dataclass():
    """Test SNETCallResult dataclass."""
    result = SNETCallResult(
        success=True,
        data={"test": "data"},
        amount_paid_cogs=5,
    )
    
    assert result.success is True
    assert result.data["test"] == "data"
    assert result.amount_paid_cogs == 5
    assert result.error is None
    assert result.payment_channel_id is None


def test_snet_call_result_with_error():
    """Test SNETCallResult with error."""
    result = SNETCallResult(
        success=False,
        data=None,
        error="Service unavailable",
    )
    
    assert result.success is False
    assert result.data is None
    assert result.error == "Service unavailable"
