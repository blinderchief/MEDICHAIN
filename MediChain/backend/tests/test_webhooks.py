"""
MediChain Webhook Tests

Tests for Clerk webhook handler and user synchronization.
"""

import json
import pytest
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch


# Sample Clerk webhook payloads
SAMPLE_USER_CREATED_EVENT = {
    "type": "user.created",
    "object": "event",
    "data": {
        "id": "user_test123",
        "email_addresses": [
            {
                "id": "email_test123",
                "email_address": "newuser@medichain.io"
            }
        ],
        "primary_email_address_id": "email_test123",
        "first_name": "Test",
        "last_name": "User",
        "image_url": "https://example.com/avatar.jpg",
        "email_verified": True,
        "web3_wallets": [
            {
                "id": "wallet_test123",
                "web3_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f8bE3A",
                "verification": {"status": "verified"}
            }
        ],
        "created_at": 1704067200000,
        "updated_at": 1704067200000
    }
}

SAMPLE_USER_UPDATED_EVENT = {
    "type": "user.updated",
    "object": "event",
    "data": {
        "id": "user_test123",
        "email_addresses": [
            {
                "id": "email_test123",
                "email_address": "updated@medichain.io"
            }
        ],
        "primary_email_address_id": "email_test123",
        "first_name": "Updated",
        "last_name": "User",
        "image_url": "https://example.com/new-avatar.jpg",
        "email_verified": True,
        "web3_wallets": [],
        "created_at": 1704067200000,
        "updated_at": 1704153600000
    }
}

SAMPLE_USER_DELETED_EVENT = {
    "type": "user.deleted",
    "object": "event",
    "data": {
        "id": "user_test123",
        "deleted": True
    }
}


class TestWebhookEndpoint:
    """Tests for Clerk webhook endpoint."""
    
    @pytest.mark.asyncio
    async def test_webhook_user_created(self, mock_db):
        """Test handling user.created webhook event."""
        from src.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/webhooks/clerk",
                content=json.dumps(SAMPLE_USER_CREATED_EVENT),
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert data["event"] == "user.created"
    
    @pytest.mark.asyncio
    async def test_webhook_user_updated(self, mock_db):
        """Test handling user.updated webhook event."""
        from src.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/webhooks/clerk",
                content=json.dumps(SAMPLE_USER_UPDATED_EVENT),
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert data["event"] == "user.updated"
    
    @pytest.mark.asyncio
    async def test_webhook_user_deleted(self, mock_db):
        """Test handling user.deleted webhook event."""
        from src.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/webhooks/clerk",
                content=json.dumps(SAMPLE_USER_DELETED_EVENT),
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert data["event"] == "user.deleted"
    
    @pytest.mark.asyncio
    async def test_webhook_invalid_json(self):
        """Test webhook with invalid JSON payload."""
        from src.main import app
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/webhooks/clerk",
                content="not valid json",
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_webhook_unknown_event(self, mock_db):
        """Test webhook with unknown event type."""
        from src.main import app
        
        unknown_event = {
            "type": "unknown.event",
            "data": {"id": "test123"}
        }
        
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/webhooks/clerk",
                content=json.dumps(unknown_event),
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"


class TestWebhookHandlers:
    """Tests for webhook handler functions."""
    
    @pytest.mark.asyncio
    async def test_handle_user_created_new_user(self, mock_db_session):
        """Test creating a new user from webhook."""
        from src.api.v1.webhooks import handle_user_created
        
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = None
        
        await handle_user_created(mock_db_session, SAMPLE_USER_CREATED_EVENT["data"])
        
        # Verify user was added
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_user_created_existing_user(self, mock_db_session):
        """Test that duplicate users are not created."""
        from src.api.v1.webhooks import handle_user_created
        from src.models.user import User
        
        # Mock existing user
        existing_user = MagicMock(spec=User)
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = existing_user
        
        await handle_user_created(mock_db_session, SAMPLE_USER_CREATED_EVENT["data"])
        
        # Verify user was not added
        mock_db_session.add.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_handle_user_updated_existing(self, mock_db_session):
        """Test updating an existing user."""
        from src.api.v1.webhooks import handle_user_updated
        from src.models.user import User
        
        # Mock existing user
        existing_user = MagicMock(spec=User)
        existing_user.email = "old@medichain.io"
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = existing_user
        
        await handle_user_updated(mock_db_session, SAMPLE_USER_UPDATED_EVENT["data"])
        
        # Verify user was updated
        assert existing_user.email == "updated@medichain.io"
        mock_db_session.commit.assert_called()
    
    @pytest.mark.asyncio
    async def test_handle_user_deleted(self, mock_db_session):
        """Test soft deleting a user."""
        from src.api.v1.webhooks import handle_user_deleted
        from src.models.user import User
        
        # Mock existing user
        existing_user = MagicMock(spec=User)
        existing_user.is_active = True
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = existing_user
        
        await handle_user_deleted(mock_db_session, SAMPLE_USER_DELETED_EVENT["data"])
        
        # Verify user was soft deleted
        assert existing_user.is_active == False
        assert existing_user.deleted_at is not None


class TestHelperFunctions:
    """Tests for webhook helper functions."""
    
    def test_get_primary_email(self):
        """Test extracting primary email from user data."""
        from src.api.v1.webhooks import _get_primary_email
        
        email = _get_primary_email(SAMPLE_USER_CREATED_EVENT["data"])
        assert email == "newuser@medichain.io"
    
    def test_get_primary_email_fallback(self):
        """Test email fallback when no primary is set."""
        from src.api.v1.webhooks import _get_primary_email
        
        user_data = {
            "email_addresses": [
                {"id": "email1", "email_address": "fallback@medichain.io"}
            ],
            "primary_email_address_id": "nonexistent"
        }
        
        email = _get_primary_email(user_data)
        assert email == "fallback@medichain.io"
    
    def test_get_wallet_address(self):
        """Test extracting wallet address from user data."""
        from src.api.v1.webhooks import _get_wallet_address
        
        wallet = _get_wallet_address(SAMPLE_USER_CREATED_EVENT["data"])
        assert wallet == "0x742d35Cc6634C0532925a3b844Bc9e7595f8bE3A"
    
    def test_get_wallet_address_no_wallet(self):
        """Test wallet extraction with no wallets."""
        from src.api.v1.webhooks import _get_wallet_address
        
        user_data = {"web3_wallets": []}
        wallet = _get_wallet_address(user_data)
        assert wallet is None


# Fixtures
@pytest.fixture
def mock_db():
    """Mock database session for API tests."""
    with patch("src.core.database.get_db") as mock:
        async def async_generator():
            yield AsyncMock()
        mock.return_value = async_generator()
        yield mock


@pytest.fixture
def mock_db_session():
    """Mock database session for direct handler tests."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
