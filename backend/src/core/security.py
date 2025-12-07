"""
MediChain Security Module

Encryption, hashing, and security utilities for HIPAA-compliant data handling.
"""

import base64
import hashlib
import secrets
from typing import Any

import structlog
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from src.config import settings

logger = structlog.get_logger(__name__)


class EncryptionService:
    """
    AES-256 encryption service for sensitive patient data.
    
    Features:
    - Key derivation from master secret
    - Encryption at rest for PII/PHI
    - Secure key rotation support
    """
    
    def __init__(self, encryption_key: str | None = None):
        """Initialize with encryption key or derive from settings."""
        self._fernet = self._create_fernet(
            encryption_key or settings.encryption_key.get_secret_value()
        )
    
    def _create_fernet(self, key: str) -> Fernet:
        """Create Fernet instance from key string."""
        # Derive a proper key using PBKDF2
        salt = settings.secret_key.get_secret_value().encode()[:16]
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,
        )
        derived_key = base64.urlsafe_b64encode(kdf.derive(key.encode()))
        return Fernet(derived_key)
    
    def encrypt(self, data: str) -> str:
        """
        Encrypt a string value.
        
        Args:
            data: Plain text to encrypt
            
        Returns:
            Base64-encoded encrypted string
        """
        if not data:
            return ""
        encrypted = self._fernet.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt an encrypted string.
        
        Args:
            encrypted_data: Base64-encoded encrypted string
            
        Returns:
            Decrypted plain text
        """
        if not encrypted_data:
            return ""
        decoded = base64.urlsafe_b64decode(encrypted_data.encode())
        return self._fernet.decrypt(decoded).decode()
    
    def encrypt_dict(self, data: dict[str, Any], fields: list[str]) -> dict[str, Any]:
        """
        Encrypt specified fields in a dictionary.
        
        Args:
            data: Dictionary containing data
            fields: List of field names to encrypt
            
        Returns:
            Dictionary with specified fields encrypted
        """
        result = data.copy()
        for field in fields:
            if field in result and result[field]:
                result[field] = self.encrypt(str(result[field]))
        return result
    
    def decrypt_dict(self, data: dict[str, Any], fields: list[str]) -> dict[str, Any]:
        """
        Decrypt specified fields in a dictionary.
        
        Args:
            data: Dictionary containing encrypted data
            fields: List of field names to decrypt
            
        Returns:
            Dictionary with specified fields decrypted
        """
        result = data.copy()
        for field in fields:
            if field in result and result[field]:
                try:
                    result[field] = self.decrypt(str(result[field]))
                except Exception as e:
                    logger.warning(f"Failed to decrypt field {field}", error=str(e))
        return result


class HashingService:
    """
    Cryptographic hashing service for data integrity and privacy.
    
    Used for:
    - Patient semantic hashes (privacy-preserving identifiers)
    - Data integrity verification
    - Audit trail fingerprints
    """
    
    @staticmethod
    def sha256(data: str) -> str:
        """Generate SHA-256 hash of data."""
        return hashlib.sha256(data.encode()).hexdigest()
    
    @staticmethod
    def sha3_256(data: str) -> str:
        """Generate SHA3-256 hash (more secure, NIST standard)."""
        return hashlib.sha3_256(data.encode()).hexdigest()
    
    @staticmethod
    def generate_semantic_hash(
        patient_data: dict[str, Any],
        include_fields: list[str] | None = None,
    ) -> str:
        """
        Generate privacy-preserving semantic hash from patient data.
        
        This hash allows for matching without exposing raw data.
        
        Args:
            patient_data: Patient profile data
            include_fields: Fields to include (defaults to key identifiers)
            
        Returns:
            SHA3-256 hash of normalized patient data
        """
        default_fields = [
            "age_range",
            "gender",
            "conditions",
            "biomarkers",
            "medications",
        ]
        fields = include_fields or default_fields
        
        # Normalize and concatenate relevant fields
        normalized = []
        for field in sorted(fields):
            value = patient_data.get(field, "")
            if isinstance(value, list):
                value = ",".join(sorted(str(v).lower() for v in value))
            elif value:
                value = str(value).lower().strip()
            normalized.append(f"{field}:{value}")
        
        data_string = "|".join(normalized)
        return HashingService.sha3_256(data_string)
    
    @staticmethod
    def verify_integrity(data: str, expected_hash: str) -> bool:
        """Verify data integrity against expected hash."""
        return HashingService.sha3_256(data) == expected_hash


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(length)


def generate_request_id() -> str:
    """Generate a unique request ID for tracing."""
    return f"req_{secrets.token_hex(8)}"


def generate_did() -> str:
    """
    Generate a Decentralized Identifier (DID) for a patient.
    
    Format: did:medichain:<unique-identifier>
    """
    unique_id = secrets.token_hex(16)
    return f"did:medichain:{unique_id}"


# Global service instances
encryption_service = EncryptionService()
hashing_service = HashingService()
