"""
Clerk webhook handler for user synchronization.
"""
from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import hashlib
import hmac
import json
from datetime import datetime

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


class ClerkUserData(BaseModel):
    id: str
    email_addresses: list
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    created_at: int
    updated_at: int


class ClerkWebhookEvent(BaseModel):
    type: str
    data: dict
    object: str = "event"


def verify_webhook_signature(
    payload: bytes,
    signature: str,
    webhook_secret: str
) -> bool:
    """Verify Clerk webhook signature."""
    if not webhook_secret:
        return True  # Skip verification in development
    
    expected_signature = hmac.new(
        webhook_secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)


@router.post("/clerk")
async def handle_clerk_webhook(
    request: Request,
    svix_id: Optional[str] = Header(None, alias="svix-id"),
    svix_timestamp: Optional[str] = Header(None, alias="svix-timestamp"),
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
):
    """
    Handle Clerk webhook events for user synchronization.
    
    Supported events:
    - user.created: Create new user in database
    - user.updated: Update user information
    - user.deleted: Soft delete user
    """
    payload = await request.body()
    
    # Verify signature in production
    if settings.ENVIRONMENT == "production":
        if not svix_signature or not verify_webhook_signature(
            payload,
            svix_signature,
            settings.CLERK_WEBHOOK_SECRET
        ):
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        event_data = json.loads(payload)
        event_type = event_data.get("type")
        user_data = event_data.get("data", {})
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Get database session
    async for db in get_db():
        try:
            if event_type == "user.created":
                await handle_user_created(db, user_data)
            elif event_type == "user.updated":
                await handle_user_updated(db, user_data)
            elif event_type == "user.deleted":
                await handle_user_deleted(db, user_data)
            else:
                # Log unknown event types but don't fail
                print(f"Unknown webhook event type: {event_type}")
        finally:
            await db.close()
    
    return {"status": "success", "event": event_type}


async def handle_user_created(db: AsyncSession, user_data: dict):
    """Handle user.created event."""
    clerk_id = user_data.get("id")
    
    # Check if user already exists
    existing = await db.execute(
        select(User).where(User.clerk_id == clerk_id)
    )
    if existing.scalar_one_or_none():
        return  # User already exists
    
    # Get primary email
    email_addresses = user_data.get("email_addresses", [])
    primary_email = None
    for email in email_addresses:
        if email.get("id") == user_data.get("primary_email_address_id"):
            primary_email = email.get("email_address")
            break
    
    if not primary_email and email_addresses:
        primary_email = email_addresses[0].get("email_address")
    
    # Create new user
    new_user = User(
        clerk_id=clerk_id,
        email=primary_email,
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        image_url=user_data.get("image_url"),
        role="patient",  # Default role
        is_active=True,
        created_at=datetime.utcnow(),
    )
    
    db.add(new_user)
    await db.commit()
    
    print(f"Created user: {clerk_id}")


async def handle_user_updated(db: AsyncSession, user_data: dict):
    """Handle user.updated event."""
    clerk_id = user_data.get("id")
    
    result = await db.execute(
        select(User).where(User.clerk_id == clerk_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # User doesn't exist, create them
        await handle_user_created(db, user_data)
        return
    
    # Get primary email
    email_addresses = user_data.get("email_addresses", [])
    primary_email = None
    for email in email_addresses:
        if email.get("id") == user_data.get("primary_email_address_id"):
            primary_email = email.get("email_address")
            break
    
    # Update user fields
    if primary_email:
        user.email = primary_email
    if user_data.get("first_name"):
        user.first_name = user_data.get("first_name")
    if user_data.get("last_name"):
        user.last_name = user_data.get("last_name")
    if user_data.get("image_url"):
        user.image_url = user_data.get("image_url")
    
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    print(f"Updated user: {clerk_id}")


async def handle_user_deleted(db: AsyncSession, user_data: dict):
    """Handle user.deleted event."""
    clerk_id = user_data.get("id")
    
    result = await db.execute(
        select(User).where(User.clerk_id == clerk_id)
    )
    user = result.scalar_one_or_none()
    
    if user:
        # Soft delete
        user.is_active = False
        user.deleted_at = datetime.utcnow()
        await db.commit()
        
        print(f"Soft deleted user: {clerk_id}")
