"""
MediChain Configuration Module

Centralized settings management using Pydantic v2 BaseSettings.
Supports environment variables and .env files.
"""

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import BeforeValidator, Field, PostgresDsn, SecretStr, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors_origins(v):
    """Parse CORS origins from comma-separated string or list."""
    if isinstance(v, str):
        # Handle empty string
        if not v.strip():
            return []
        # Try JSON parsing first for proper JSON arrays
        if v.startswith("["):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                pass
        # Fall back to comma-separated parsing
        return [origin.strip() for origin in v.split(",") if origin.strip()]
    return v if v is not None else []


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─────────────────────────────────────────────────────────────────────────
    # Application Settings
    # ─────────────────────────────────────────────────────────────────────────
    app_name: str = "MediChain"
    app_version: str = "0.1.0"
    debug: bool = Field(default=False, description="Enable debug mode")
    environment: Literal["development", "staging", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # ─────────────────────────────────────────────────────────────────────────
    # Server Settings
    # ─────────────────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = Field(default=1, ge=1, le=16)
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    @computed_field
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return parse_cors_origins(self.cors_origins)

    # ─────────────────────────────────────────────────────────────────────────
    # Database Settings (Neon Postgres)
    # ─────────────────────────────────────────────────────────────────────────
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/medichain",
        description="Neon Postgres connection URL",
    )
    db_pool_size: int = Field(default=5, ge=1, le=20)
    db_max_overflow: int = Field(default=10, ge=0, le=30)
    db_echo: bool = False

    # ─────────────────────────────────────────────────────────────────────────
    # Clerk Authentication
    # ─────────────────────────────────────────────────────────────────────────
    clerk_secret_key: SecretStr = Field(
        default="sk_test_...", description="Clerk secret key"
    )
    clerk_publishable_key: str = Field(
        default="pk_test_...", description="Clerk publishable key"
    )
    clerk_jwt_issuer: str = Field(
        default="https://clerk.your-domain.com", description="Clerk JWT issuer URL"
    )

    # ─────────────────────────────────────────────────────────────────────────
    # AI/ML Settings (Google Gemini)
    # ─────────────────────────────────────────────────────────────────────────
    google_api_key: SecretStr = Field(
        default="...", description="Google AI API key for Gemini"
    )
    gemini_model: str = "gemini-1.5-pro-latest"
    gemini_embedding_model: str = "text-embedding-004"
    gemini_temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    gemini_max_tokens: int = Field(default=8192, ge=1, le=32768)

    # ─────────────────────────────────────────────────────────────────────────
    # Vector Database (Qdrant)
    # ─────────────────────────────────────────────────────────────────────────
    qdrant_url: str = Field(default="http://localhost:6333", description="Qdrant URL")
    qdrant_api_key: SecretStr | None = None
    qdrant_collection_name: str = "medichain_trials"
    embedding_dimension: int = 768

    # ─────────────────────────────────────────────────────────────────────────
    # Blockchain Settings (SingularityNET / Base L2)
    # ─────────────────────────────────────────────────────────────────────────
    web3_provider_url: str = Field(
        default="https://sepolia.base.org",
        description="Web3 RPC endpoint (Base Sepolia testnet)",
    )
    mpe_contract_address: str = Field(
        default="0x...", description="MPE contract address"
    )
    private_key: SecretStr = Field(
        default="0x...", description="Wallet private key for signing transactions"
    )
    chain_id: int = Field(default=84532, description="Base Sepolia chain ID")

    # ─────────────────────────────────────────────────────────────────────────
    # SingularityNET SDK Configuration
    # ─────────────────────────────────────────────────────────────────────────
    snet_private_key: SecretStr = Field(
        default="...",
        description="Ethereum private key for SNET service payments",
    )
    snet_eth_rpc_endpoint: str = Field(
        default="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY",
        description="Ethereum RPC endpoint for SNET (Alchemy/Infura)",
    )
    snet_network: str = Field(
        default="sepolia",
        description="SNET network: mainnet or sepolia",
    )
    snet_organization_id: str = Field(
        default="medichain-health",
        description="MediChain's organization ID on SNET marketplace",
    )
    snet_ipfs_endpoint: str = Field(
        default="https://ipfs.singularitynet.io",
        description="IPFS endpoint for SNET service metadata",
    )

    # ─────────────────────────────────────────────────────────────────────────
    # Redis Cache
    # ─────────────────────────────────────────────────────────────────────────
    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis URL")
    cache_ttl: int = Field(default=3600, description="Default cache TTL in seconds")

    # ─────────────────────────────────────────────────────────────────────────
    # Security
    # ─────────────────────────────────────────────────────────────────────────
    secret_key: SecretStr = Field(
        default="your-super-secret-key-change-in-production",
        description="Application secret key for encryption",
    )
    encryption_key: SecretStr = Field(
        default="your-32-byte-encryption-key-here!",
        description="AES-256 encryption key (32 bytes)",
    )
    jwt_algorithm: str = "RS256"
    access_token_expire_minutes: int = 30

    # ─────────────────────────────────────────────────────────────────────────
    # Rate Limiting
    # ─────────────────────────────────────────────────────────────────────────
    rate_limit_requests: int = Field(default=100, description="Requests per minute")
    rate_limit_window: int = Field(default=60, description="Rate limit window in seconds")

    # ─────────────────────────────────────────────────────────────────────────
    # Computed Properties
    # ─────────────────────────────────────────────────────────────────────────
    @computed_field
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"

    @computed_field
    @property
    def async_database_url(self) -> str:
        """Get async-compatible database URL."""
        url = str(self.database_url)
        if "postgresql://" in url and "asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://")
        # asyncpg doesn't support sslmode parameter, convert to ssl
        if "sslmode=require" in url:
            url = url.replace("sslmode=require", "ssl=require")
        # Remove channel_binding parameter as asyncpg doesn't support it
        if "channel_binding=require" in url:
            url = url.replace("&channel_binding=require", "").replace("channel_binding=require&", "").replace("?channel_binding=require", "?")
        return url


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Export settings instance
settings = get_settings()
