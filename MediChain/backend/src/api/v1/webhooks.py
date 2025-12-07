"""
Clerk Webhook Handler API

Handles Clerk webhook events for user synchronization.
Supports user.created, user.updated, and user.deleted events.
"""

from datetime import datetime
import hashlib
import hmac
import json
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from src.config import settings
from src.core.database import get_db
from src.models.user import User, UserRole

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["webhooks"])


class WebhookResponse(BaseModel):
    """Response for webhook processing."""
    
    status: str
    event: Optional[str] = None
    message: Optional[str] = None


def verify_svix_signature(
    payload: bytes,
    svix_id: str,
    svix_timestamp: str,
    svix_signature: str,
    webhook_secret: str
) -> bool:
    """
    Verify Clerk webhook signature using Svix.
    
    Clerk uses Svix for webhook delivery which includes:
    - svix-id: Unique message identifier
    - svix-timestamp: Unix timestamp of the message
    - svix-signature: HMAC signature for verification
    """
    if not webhook_secret:
        logger.warning("Webhook secret not configured, skipping verification")
        return True
    
    try:
        # Remove 'whsec_' prefix if present
        secret = webhook_secret
        if secret.startswith("whsec_"):
            secret = secret[6:]
        
        # Decode base64 secret
        import base64
        secret_bytes = base64.b64decode(secret)
        
        # Create signed payload
        signed_payload = f"{svix_id}.{svix_timestamp}.{payload.decode()}"
        
        # Compute expected signature
        expected = hmac.new(
            secret_bytes,
            signed_payload.encode(),
            hashlib.sha256
        ).digest()
        expected_b64 = base64.b64encode(expected).decode()
        
        # svix_signature format: "v1,<signature>"
        signatures = svix_signature.split(" ")
        for sig in signatures:
            if sig.startswith("v1,"):
                actual_sig = sig[3:]
                if hmac.compare_digest(expected_b64, actual_sig):
                    return True
        
        return False
    except Exception as e:
        logger.error("Signature verification error", error=str(e))
        return False


@router.post("/clerk", response_model=WebhookResponse)
async def handle_clerk_webhook(
    request: Request,
    svix_id: Optional[str] = Header(None, alias="svix-id"),
    svix_timestamp: Optional[str] = Header(None, alias="svix-timestamp"),
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
):
    """
    Handle Clerk webhook events for user synchronization.
    
    **Supported Events:**
    - `user.created`: Creates new user in database
    - `user.updated`: Updates existing user information
    - `user.deleted`: Soft deletes user (sets is_active=False)
    
    **Security:**
    - Validates Svix signature in production
    - Skips validation in development for testing
    """
    payload = await request.body()
    
    # Verify signature in production
    if settings.environment == "production":
        if not all([svix_id, svix_timestamp, svix_signature]):
            logger.warning("Missing Svix headers")
            raise HTTPException(status_code=401, detail="Missing signature headers")
        
        if not verify_svix_signature(
            payload,
            svix_id,
            svix_timestamp,
            svix_signature,
            settings.clerk_webhook_secret
        ):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse payload
    try:
        event_data = json.loads(payload)
        event_type = event_data.get("type", "unknown")
        user_data = event_data.get("data", {})
    except json.JSONDecodeError as e:
        logger.error("Invalid JSON payload", error=str(e))
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    logger.info("Processing webhook", event_type=event_type, clerk_id=user_data.get("id"))
    
    # Get database session
    async for db in get_db():
        try:
            if event_type == "user.created":
                await handle_user_created(db, user_data)
                message = "User created successfully"
            elif event_type == "user.updated":
                await handle_user_updated(db, user_data)
                message = "User updated successfully"
            elif event_type == "user.deleted":
                await handle_user_deleted(db, user_data)
                message = "User deleted successfully"
            else:
                logger.info("Unhandled event type", event_type=event_type)
                message = f"Event type '{event_type}' not handled"
            
            return WebhookResponse(status="success", event=event_type, message=message)
        except Exception as e:
            logger.error("Webhook processing error", error=str(e))
            raise HTTPException(status_code=500, detail=str(e))


async def handle_user_created(db: AsyncSession, user_data: dict) -> None:
    """
    Handle user.created event from Clerk.
    
    Creates a new user record in the database with Clerk profile data.
    """
    clerk_id = user_data.get("id")
    if not clerk_id:
        raise ValueError("Missing clerk_id in user data")
    
    # Check if user already exists
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    if result.scalar_one_or_none():
        logger.info("User already exists", clerk_id=clerk_id)
        return
    
    # Extract primary email
    primary_email = _get_primary_email(user_data)
    
    # Extract Web3 wallet if connected
    wallet_address = _get_wallet_address(user_data)
    
    # Create new user
    new_user = User(
        clerk_id=clerk_id,
        email=primary_email,
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        image_url=user_data.get("image_url"),
        wallet_address=wallet_address,
        role=UserRole.PATIENT,  # Default role
        is_active=True,
        is_verified=bool(user_data.get("email_verified")),
        created_at=datetime.utcnow(),
    )
    
    db.add(new_user)
    await db.commit()
    
    logger.info("Created user", clerk_id=clerk_id, email=primary_email)


async def handle_user_updated(db: AsyncSession, user_data: dict) -> None:
    """
    Handle user.updated event from Clerk.
    
    Updates existing user or creates if not found.
    """
    clerk_id = user_data.get("id")
    if not clerk_id:
        raise ValueError("Missing clerk_id in user data")
    
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    
    if not user:
        # User doesn't exist, create them
        logger.info("User not found, creating", clerk_id=clerk_id)
        await handle_user_created(db, user_data)
        return
    
    # Update user fields
    primary_email = _get_primary_email(user_data)
    if primary_email:
        user.email = primary_email
    
    if user_data.get("first_name") is not None:
        user.first_name = user_data.get("first_name")
    if user_data.get("last_name") is not None:
        user.last_name = user_data.get("last_name")
    if user_data.get("image_url"):
        user.image_url = user_data.get("image_url")
    
    # Update wallet if changed
    wallet_address = _get_wallet_address(user_data)
    if wallet_address:
        user.wallet_address = wallet_address
    
    # Update verification status
    if user_data.get("email_verified") is not None:
        user.is_verified = bool(user_data.get("email_verified"))
    
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    logger.info("Updated user", clerk_id=clerk_id)


async def handle_user_deleted(db: AsyncSession, user_data: dict) -> None:
    """
    Handle user.deleted event from Clerk.
    
    Soft deletes user by setting is_active=False and deleted_at timestamp.
    """
    clerk_id = user_data.get("id")
    if not clerk_id:
        raise ValueError("Missing clerk_id in user data")
    
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    
    if user:
        user.is_active = False
        user.deleted_at = datetime.utcnow()
        await db.commit()
        logger.info("Soft deleted user", clerk_id=clerk_id)
    else:
        logger.warning("User not found for deletion", clerk_id=clerk_id)


def _get_primary_email(user_data: dict) -> Optional[str]:
    """Extract primary email from Clerk user data."""
    email_addresses = user_data.get("email_addresses", [])
    primary_email_id = user_data.get("primary_email_address_id")
    
    # Find primary email
    for email in email_addresses:
        if email.get("id") == primary_email_id:
            return email.get("email_address")
    
    # Fallback to first email
    if email_addresses:
        return email_addresses[0].get("email_address")
    
    return None


def _get_wallet_address(user_data: dict) -> Optional[str]:
    """Extract Web3 wallet address from Clerk user data."""
    web3_wallets = user_data.get("web3_wallets", [])
    
    # Find verified wallet
    for wallet in web3_wallets:
        if wallet.get("verification", {}).get("status") == "verified":
            return wallet.get("web3_wallet")
    
    # Fallback to first wallet
    if web3_wallets:
        return web3_wallets[0].get("web3_wallet")
    
    return None
