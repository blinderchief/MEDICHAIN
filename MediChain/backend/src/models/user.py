"""
MediChain User Model

User entity for Clerk integration and patient/researcher profiles.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Column, DateTime, Field as SQLField, SQLModel, String


class UserRole(str, Enum):
    """User roles in the system."""
    
    PATIENT = "patient"
    RESEARCHER = "researcher"
    ADMIN = "admin"
    SPONSOR = "sponsor"


class User(SQLModel, table=True):
    """
    User entity for authentication and profile management.
    
    Synced with Clerk via webhooks.
    """
    
    __tablename__ = "users"
    
    id: Optional[int] = SQLField(default=None, primary_key=True)
    clerk_id: str = SQLField(
        sa_column=Column(String(255), unique=True, index=True, nullable=False)
    )
    email: Optional[str] = SQLField(
        sa_column=Column(String(255), unique=True, index=True)
    )
    first_name: Optional[str] = SQLField(default=None, max_length=100)
    last_name: Optional[str] = SQLField(default=None, max_length=100)
    image_url: Optional[str] = SQLField(default=None, max_length=500)
    
    # Role and permissions
    role: UserRole = SQLField(default=UserRole.PATIENT)
    is_active: bool = SQLField(default=True)
    is_verified: bool = SQLField(default=False)
    
    # Web3 integration
    wallet_address: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String(42), unique=True, index=True)
    )
    did: Optional[str] = SQLField(
        default=None,
        description="Decentralized Identifier"
    )
    
    # Timestamps
    created_at: datetime = SQLField(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False)
    )
    updated_at: Optional[datetime] = SQLField(
        default=None,
        sa_column=Column(DateTime, onupdate=datetime.utcnow)
    )
    deleted_at: Optional[datetime] = SQLField(default=None)
    last_login_at: Optional[datetime] = SQLField(default=None)
    
    @property
    def full_name(self) -> str:
        """Get user's full name."""
        parts = [self.first_name, self.last_name]
        return " ".join(p for p in parts if p)
    
    @property
    def is_deleted(self) -> bool:
        """Check if user is soft deleted."""
        return self.deleted_at is not None


class UserCreate(BaseModel):
    """Schema for creating a user."""
    
    clerk_id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole = UserRole.PATIENT


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    wallet_address: Optional[str] = None
    did: Optional[str] = None
    role: Optional[UserRole] = None
    is_verified: Optional[bool] = None


class UserResponse(BaseModel):
    """API response schema for user."""
    
    id: int
    clerk_id: str
    email: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    image_url: Optional[str]
    role: UserRole
    is_active: bool
    is_verified: bool
    wallet_address: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Public user info (limited fields)."""
    
    id: int
    first_name: Optional[str]
    last_name: Optional[str]
    role: UserRole
    is_verified: bool
    
    class Config:
        from_attributes = True
