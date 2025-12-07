"""
MediChain Clerk Authentication Middleware

Handles JWT verification and user session management using Clerk.
Supports both standard Clerk auth and Web3 wallet authentication.
"""

import logging
from datetime import datetime, UTC
from functools import wraps
from typing import Any, Callable

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from pydantic import BaseModel, Field

from src.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class ClerkUser(BaseModel):
    """Clerk user data extracted from JWT."""
    id: str = Field(..., description="Clerk user ID")
    email: str | None = None
    email_verified: bool = False
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None
    username: str | None = None
    image_url: str | None = None
    
    # Web3 integration
    wallet_address: str | None = None
    
    # Metadata
    public_metadata: dict[str, Any] = Field(default_factory=dict)
    private_metadata: dict[str, Any] = Field(default_factory=dict)
    unsafe_metadata: dict[str, Any] = Field(default_factory=dict)
    
    # Session info
    session_id: str | None = None
    org_id: str | None = None
    org_role: str | None = None
    
    @property
    def display_name(self) -> str:
        """Get best available display name."""
        if self.full_name:
            return self.full_name
        if self.first_name:
            return f"{self.first_name} {self.last_name or ''}".strip()
        if self.username:
            return self.username
        return self.email or self.id


class AuthResult(BaseModel):
    """Authentication result."""
    authenticated: bool
    user: ClerkUser | None = None
    error: str | None = None


# ─────────────────────────────────────────────────────────────────────────────
# JWT Verification
# ─────────────────────────────────────────────────────────────────────────────

class ClerkJWTVerifier:
    """Verifies Clerk JWTs using JWKS."""
    
    def __init__(self):
        self._jwks_cache: dict[str, Any] | None = None
        self._jwks_cached_at: datetime | None = None
        self._cache_duration_seconds = 3600  # 1 hour
    
    async def _get_jwks(self) -> dict[str, Any]:
        """Fetch Clerk JWKS with caching."""
        now = datetime.now(UTC)
        
        # Check cache
        if (
            self._jwks_cache is not None 
            and self._jwks_cached_at is not None
            and (now - self._jwks_cached_at).total_seconds() < self._cache_duration_seconds
        ):
            return self._jwks_cache
        
        # Fetch fresh JWKS
        # Clerk JWKS endpoint format
        clerk_domain = self._get_clerk_domain()
        jwks_url = f"https://{clerk_domain}/.well-known/jwks.json"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(jwks_url, timeout=10.0)
                response.raise_for_status()
                self._jwks_cache = response.json()
                self._jwks_cached_at = now
                return self._jwks_cache
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            if self._jwks_cache:
                return self._jwks_cache
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )
    
    def _get_clerk_domain(self) -> str:
        """Extract Clerk domain from publishable key or use configured issuer."""
        import base64
        
        # First, try using the configured JWT issuer
        if settings.clerk_jwt_issuer and settings.clerk_jwt_issuer.startswith("https://"):
            # Extract domain from issuer URL
            domain = settings.clerk_jwt_issuer.replace("https://", "").replace("http://", "")
            logger.info(f"Using Clerk domain from issuer: {domain}")
            return domain
        
        pk = settings.clerk_publishable_key
        if not pk or pk == "pk_test_..." or len(pk) < 10:
            logger.warning("Clerk publishable key not configured properly")
            raise ValueError("Clerk publishable key not configured")
        
        try:
            # Format: pk_test_<base64_encoded_domain> or pk_live_<base64_encoded_domain>
            # The domain is base64 encoded after the prefix
            if pk.startswith("pk_test_"):
                encoded_part = pk[8:]  # Remove "pk_test_"
            elif pk.startswith("pk_live_"):
                encoded_part = pk[8:]  # Remove "pk_live_"
            else:
                raise ValueError(f"Invalid publishable key format: {pk[:15]}...")
            
            # Add padding if needed for base64
            padding = 4 - len(encoded_part) % 4
            if padding != 4:
                encoded_part += "=" * padding
            
            # Decode to get the domain
            decoded = base64.b64decode(encoded_part).decode("utf-8")
            # Remove trailing $ if present
            domain = decoded.rstrip("$")
            
            if not domain:
                raise ValueError("Empty domain after decoding")
            
            logger.info(f"Extracted Clerk domain: {domain}")
            return domain
        except Exception as e:
            logger.error(f"Failed to extract Clerk domain from key: {e}")
            raise ValueError(f"Could not extract Clerk domain: {e}")
    
    async def verify_token(self, token: str) -> ClerkUser:
        """
        Verify a Clerk JWT token.
        
        Args:
            token: JWT bearer token from Authorization header
        
        Returns:
            ClerkUser with decoded claims
        
        Raises:
            HTTPException: If token is invalid
        """
        try:
            # Get JWKS
            jwks = await self._get_jwks()
            
            # Decode header to get key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            
            # Find matching key
            rsa_key = None
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    rsa_key = key
                    break
            
            if not rsa_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: Key not found",
                )
            
            # Verify token
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                options={
                    "verify_aud": False,  # Clerk doesn't set standard audience
                    "verify_iss": False,  # Issuer varies by environment
                },
            )
            
            # Extract user data
            return self._parse_claims(payload)
            
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )
        except JWTError as e:
            logger.error(f"JWT verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
    
    def _parse_claims(self, payload: dict[str, Any]) -> ClerkUser:
        """Parse JWT claims into ClerkUser."""
        # Clerk-specific claims
        return ClerkUser(
            id=payload.get("sub", ""),
            email=payload.get("email"),
            email_verified=payload.get("email_verified", False),
            first_name=payload.get("first_name"),
            last_name=payload.get("last_name"),
            full_name=payload.get("name"),
            username=payload.get("username"),
            image_url=payload.get("image_url"),
            wallet_address=payload.get("web3_wallet"),
            public_metadata=payload.get("public_metadata", {}),
            private_metadata=payload.get("private_metadata", {}),
            unsafe_metadata=payload.get("unsafe_metadata", {}),
            session_id=payload.get("sid"),
            org_id=payload.get("org_id"),
            org_role=payload.get("org_role"),
        )


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Dependencies
# ─────────────────────────────────────────────────────────────────────────────

# Security scheme
bearer_scheme = HTTPBearer(auto_error=False)

# JWT verifier singleton
_jwt_verifier = ClerkJWTVerifier()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> ClerkUser | None:
    """
    Get current authenticated user from JWT.
    
    Returns None if no token is provided (allows optional auth).
    Raises HTTPException if token is invalid.
    """
    if not credentials:
        return None
    
    return await _jwt_verifier.verify_token(credentials.credentials)


async def require_auth(
    user: ClerkUser | None = Depends(get_current_user),
) -> ClerkUser:
    """
    Require authentication for an endpoint.
    
    Raises HTTPException if user is not authenticated.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_verified_email(
    user: ClerkUser = Depends(require_auth),
) -> ClerkUser:
    """Require user has verified email."""
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required",
        )
    return user


async def require_wallet(
    user: ClerkUser = Depends(require_auth),
) -> ClerkUser:
    """Require user has connected Web3 wallet."""
    if not user.wallet_address:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Web3 wallet connection required",
        )
    return user


# ─────────────────────────────────────────────────────────────────────────────
# ASGI Middleware
# ─────────────────────────────────────────────────────────────────────────────

class ClerkAuthMiddleware:
    """
    ASGI middleware for Clerk authentication.
    
    Attaches user to request.state if authenticated.
    Does not block unauthenticated requests (use dependencies for that).
    """
    
    def __init__(self, app):
        self.app = app
        self.verifier = ClerkJWTVerifier()
        
        # Paths that skip auth processing
        self.skip_paths = {
            "/health",
            "/api/v1/health",
            "/api/v1/health/ready",
            "/api/v1/health/live",
            "/docs",
            "/redoc",
            "/openapi.json",
        }
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Check if path should be skipped
        path = scope.get("path", "")
        if path in self.skip_paths or path.startswith("/docs") or path.startswith("/redoc"):
            await self.app(scope, receive, send)
            return
        
        # Try to extract and verify token
        request = Request(scope, receive, send)
        user = None
        
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:]
            try:
                user = await self.verifier.verify_token(token)
            except HTTPException:
                # Let the endpoint handle auth errors
                pass
            except Exception as e:
                logger.error(f"Auth middleware error: {e}")
        
        # Attach user to scope state
        scope["state"] = scope.get("state", {})
        scope["state"]["user"] = user
        
        await self.app(scope, receive, send)


# ─────────────────────────────────────────────────────────────────────────────
# Clerk Backend API Client
# ─────────────────────────────────────────────────────────────────────────────

class ClerkBackendClient:
    """
    Client for Clerk Backend API.
    
    Used for server-side operations like:
    - Fetching user data
    - Managing user metadata
    - Session management
    """
    
    def __init__(self):
        self.base_url = "https://api.clerk.com/v1"
        self.secret_key = settings.clerk_secret_key.get_secret_value()
    
    async def get_user(self, user_id: str) -> dict[str, Any] | None:
        """Fetch user from Clerk Backend API."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/users/{user_id}",
                    headers={
                        "Authorization": f"Bearer {self.secret_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )
                
                if response.status_code == 404:
                    return None
                
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            logger.error(f"Failed to fetch user from Clerk: {e}")
            return None
    
    async def update_user_metadata(
        self,
        user_id: str,
        public_metadata: dict[str, Any] | None = None,
        private_metadata: dict[str, Any] | None = None,
    ) -> bool:
        """Update user metadata in Clerk."""
        try:
            data = {}
            if public_metadata is not None:
                data["public_metadata"] = public_metadata
            if private_metadata is not None:
                data["private_metadata"] = private_metadata
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/users/{user_id}",
                    headers={
                        "Authorization": f"Bearer {self.secret_key}",
                        "Content-Type": "application/json",
                    },
                    json=data,
                    timeout=10.0,
                )
                
                response.raise_for_status()
                return True
                
        except Exception as e:
            logger.error(f"Failed to update user metadata: {e}")
            return False
    
    async def get_user_sessions(self, user_id: str) -> list[dict[str, Any]]:
        """Get active sessions for a user."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/users/{user_id}/sessions",
                    headers={
                        "Authorization": f"Bearer {self.secret_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )
                
                response.raise_for_status()
                return response.json().get("data", [])
                
        except Exception as e:
            logger.error(f"Failed to fetch user sessions: {e}")
            return []
    
    async def revoke_session(self, session_id: str) -> bool:
        """Revoke a user session."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/sessions/{session_id}/revoke",
                    headers={
                        "Authorization": f"Bearer {self.secret_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )
                
                response.raise_for_status()
                return True
                
        except Exception as e:
            logger.error(f"Failed to revoke session: {e}")
            return False


# Singleton
_clerk_client: ClerkBackendClient | None = None


def get_clerk_client() -> ClerkBackendClient:
    """Get Clerk backend client singleton."""
    global _clerk_client
    if _clerk_client is None:
        _clerk_client = ClerkBackendClient()
    return _clerk_client
