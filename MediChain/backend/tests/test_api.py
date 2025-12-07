"""
MediChain Backend Test Suite
============================

Comprehensive tests for the MediChain backend API.
Run with: pytest tests/ -v
"""

import pytest
import asyncio
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

# Test configuration
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Sample test data
SAMPLE_PATIENT = {
    "email": "test@medichain.io",
    "first_name": "Test",
    "last_name": "Patient",
    "date_of_birth": "1990-01-15",
    "gender": "male",
    "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "USA"
    },
    "medical_history": {
        "conditions": [
            {
                "name": "Type 2 Diabetes",
                "icd_code": "E11",
                "status": "active"
            }
        ],
        "medications": [],
        "allergies": []
    }
}

SAMPLE_TRIAL = {
    "nct_id": "NCT00000001",
    "title": "Test Clinical Trial",
    "brief_title": "Test Trial",
    "sponsor": "Test Pharma",
    "phase": "Phase II",
    "status": "recruiting",
    "condition": "Type 2 Diabetes",
    "location": "San Francisco, CA",
    "target_enrollment": 100,
    "eligibility_criteria": {
        "minimum_age": 18,
        "maximum_age": 65,
        "gender": "all",
        "healthy_volunteers": False,
        "inclusion_criteria": [
            "Diagnosis of Type 2 Diabetes"
        ],
        "exclusion_criteria": [
            "Pregnant or nursing"
        ]
    }
}


class TestHealthEndpoint:
    """Tests for health check endpoint."""
    
    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test that health endpoint returns OK status."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "version" in data


class TestPatientsAPI:
    """Tests for patient API endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_patient(self, mock_auth, mock_db):
        """Test patient creation."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/patients",
                json=SAMPLE_PATIENT,
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 201
            data = response.json()
            assert "id" in data
            assert data["email"] == SAMPLE_PATIENT["email"]
    
    @pytest.mark.asyncio
    async def test_get_patient(self, mock_auth, mock_db):
        """Test retrieving a patient."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/patients/test-patient-id",
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code in [200, 404]
    
    @pytest.mark.asyncio
    async def test_update_patient(self, mock_auth, mock_db):
        """Test updating a patient."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.patch(
                "/api/v1/patients/test-patient-id",
                json={"first_name": "Updated"},
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code in [200, 404]


class TestTrialsAPI:
    """Tests for clinical trials API endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_trials(self, mock_db):
        """Test listing all trials."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get("/api/v1/trials")
            
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total" in data
    
    @pytest.mark.asyncio
    async def test_search_trials(self, mock_db, mock_vector_db):
        """Test searching trials."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/trials/search",
                params={"query": "diabetes", "limit": 10}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_get_trial(self, mock_db):
        """Test retrieving a specific trial."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get(f"/api/v1/trials/{SAMPLE_TRIAL['nct_id']}")
            
            assert response.status_code in [200, 404]


class TestMatchesAPI:
    """Tests for matching API endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_match(self, mock_auth, mock_db, mock_ai_service):
        """Test creating a new match."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/matches",
                json={
                    "patient_id": "test-patient-id",
                    "trial_id": "test-trial-id"
                },
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code in [201, 404, 400]
    
    @pytest.mark.asyncio
    async def test_list_patient_matches(self, mock_auth, mock_db):
        """Test listing matches for a patient."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/matches/patient/test-patient-id",
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code in [200, 404]


class TestConsentsAPI:
    """Tests for consent API endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_consent(self, mock_auth, mock_db, mock_blockchain):
        """Test creating a consent record."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/consents",
                json={
                    "patient_id": "test-patient-id",
                    "trial_id": "test-trial-id",
                    "documents": [
                        {
                            "type": "informed_consent",
                            "version": "1.0"
                        }
                    ]
                },
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code in [201, 404, 400]
    
    @pytest.mark.asyncio
    async def test_verify_consent(self, mock_db, mock_blockchain):
        """Test verifying a consent record."""
        from app.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get("/api/v1/consents/test-consent-id/verify")
            
            assert response.status_code in [200, 404]


class TestMatchingAgent:
    """Tests for the AI matching agent."""
    
    @pytest.mark.asyncio
    async def test_compute_match_score(self, mock_ai_service):
        """Test match score computation."""
        from app.agents.matcher_agent import MatcherAgent
        
        agent = MatcherAgent()
        
        score = await agent.compute_match_score(
            patient_profile=SAMPLE_PATIENT,
            trial=SAMPLE_TRIAL
        )
        
        assert isinstance(score, float)
        assert 0 <= score <= 100
    
    @pytest.mark.asyncio
    async def test_evaluate_eligibility(self, mock_ai_service):
        """Test eligibility evaluation."""
        from app.agents.matcher_agent import MatcherAgent
        
        agent = MatcherAgent()
        
        result = await agent.evaluate_eligibility(
            patient_profile=SAMPLE_PATIENT,
            eligibility_criteria=SAMPLE_TRIAL["eligibility_criteria"]
        )
        
        assert "inclusion_met" in result
        assert "exclusion_clear" in result
        assert "overall_eligible" in result


class TestPatientAgent:
    """Tests for the patient agent."""
    
    @pytest.mark.asyncio
    async def test_extract_medical_entities(self, mock_ai_service):
        """Test medical entity extraction from text."""
        from app.agents.patient_agent import PatientAgent
        
        agent = PatientAgent()
        
        text = """
        Patient diagnosed with Type 2 Diabetes in 2020. 
        Currently taking Metformin 500mg twice daily.
        Allergic to Penicillin.
        """
        
        entities = await agent.extract_medical_entities(text)
        
        assert "conditions" in entities
        assert "medications" in entities
        assert "allergies" in entities
    
    @pytest.mark.asyncio
    async def test_generate_profile_hash(self):
        """Test profile hash generation."""
        from app.agents.patient_agent import PatientAgent
        
        agent = PatientAgent()
        
        hash1 = agent.generate_profile_hash(SAMPLE_PATIENT)
        hash2 = agent.generate_profile_hash(SAMPLE_PATIENT)
        
        assert hash1 == hash2  # Same input should produce same hash
        assert len(hash1) == 64  # SHA-256 produces 64 hex characters


class TestConsentAgent:
    """Tests for the consent agent."""
    
    @pytest.mark.asyncio
    async def test_generate_consent_document(self, mock_ai_service):
        """Test consent document generation."""
        from app.agents.consent_agent import ConsentAgent
        
        agent = ConsentAgent()
        
        document = await agent.generate_consent_document(
            trial=SAMPLE_TRIAL,
            patient_name=f"{SAMPLE_PATIENT['first_name']} {SAMPLE_PATIENT['last_name']}"
        )
        
        assert "content" in document
        assert "hash" in document
    
    @pytest.mark.asyncio
    async def test_validate_consent_signature(self):
        """Test consent signature validation."""
        from app.agents.consent_agent import ConsentAgent
        
        agent = ConsentAgent()
        
        # Test with valid signature format
        is_valid = agent.validate_signature(
            signature="0x" + "a" * 128,
            message="Test message",
            address="0x" + "1" * 40
        )
        
        assert isinstance(is_valid, bool)


# Fixtures
@pytest.fixture
def mock_auth():
    """Mock authentication middleware."""
    with patch("app.core.auth.verify_token") as mock:
        mock.return_value = {"user_id": "test-user-id", "role": "patient"}
        yield mock


@pytest.fixture
def mock_db():
    """Mock database session."""
    with patch("app.core.database.get_db") as mock:
        session = AsyncMock()
        mock.return_value = session
        yield session


@pytest.fixture
def mock_vector_db():
    """Mock vector database client."""
    with patch("app.services.vector_service.VectorService") as mock:
        client = AsyncMock()
        client.search.return_value = []
        mock.return_value = client
        yield client


@pytest.fixture
def mock_ai_service():
    """Mock AI service."""
    with patch("app.services.ai_service.AIService") as mock:
        service = AsyncMock()
        service.generate.return_value = {"content": "Test response"}
        service.embed.return_value = [0.1] * 768
        mock.return_value = service
        yield service


@pytest.fixture
def mock_blockchain():
    """Mock blockchain service."""
    with patch("app.services.blockchain_service.BlockchainService") as mock:
        service = AsyncMock()
        service.record_consent.return_value = {
            "transaction_hash": "0x" + "a" * 64,
            "block_number": 12345
        }
        mock.return_value = service
        yield service


# Integration tests (require actual services)
class TestIntegration:
    """Integration tests that require running services."""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_full_matching_flow(self):
        """Test complete matching flow from patient creation to consent."""
        # This would test the full flow with real services
        pytest.skip("Integration tests require running services")
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_blockchain_consent_recording(self):
        """Test actual blockchain consent recording."""
        pytest.skip("Integration tests require running blockchain")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
