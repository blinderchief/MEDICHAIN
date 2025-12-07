"""
MediChain SingularityNET Service Integration

Core integration with SingularityNET Decentralized AI Platform:
- SDK client for consuming AI services from marketplace
- MPE (Multi-Party Escrow) payment handling
- Service discovery and metadata
- Free call and paid call support

This enables MediChain to leverage the SingularityNET AI ecosystem.
"""

import asyncio
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional
from uuid import UUID

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import settings

logger = structlog.get_logger(__name__)

# SingularityNET Marketplace URLs
SNET_MARKETPLACE_URL = "https://marketplace.singularitynet.io"
SNET_PUBLISHER_URL = "https://publisher.singularitynet.io"
SNET_DEV_PORTAL_URL = "https://dev.singularitynet.io"


class SNETNetwork(str, Enum):
    """SingularityNET network environments."""
    MAINNET = "mainnet"
    SEPOLIA = "sepolia"  # Ethereum testnet


class PaymentStrategy(str, Enum):
    """Payment strategies for SNET services."""
    DEFAULT = "default"
    FREE_CALL = "free_call"
    PAID_CALL = "paid_call"
    PREPAID_CALL = "prepaid_call"


@dataclass
class SNETServiceInfo:
    """Information about a SingularityNET service."""
    org_id: str
    service_id: str
    display_name: str
    description: str
    price_in_cogs: int
    free_calls_available: int
    endpoints: list[str]
    methods: list[dict[str, str]]


@dataclass
class SNETCallResult:
    """Result from a SingularityNET service call."""
    success: bool
    data: Any
    payment_channel_id: Optional[str] = None
    amount_paid_cogs: int = 0
    error: Optional[str] = None


class SingularityNETService:
    """
    SingularityNET SDK Integration Service.
    
    Provides:
    - AI service discovery from marketplace
    - Service client creation and management
    - Payment channel handling (MPE)
    - gRPC call execution
    - Free/paid call strategies
    
    MediChain uses this to:
    1. Consume NLP/medical AI services from marketplace
    2. Potentially publish its own matching service
    3. Integrate with SingularityNET's decentralized AI ecosystem
    
    Configuration required in environment:
    - SNET_PRIVATE_KEY: Ethereum wallet private key
    - SNET_ETH_RPC_ENDPOINT: Alchemy/Infura RPC endpoint
    - SNET_NETWORK: mainnet or sepolia
    """
    
    def __init__(self):
        """Initialize the SingularityNET service."""
        self.logger = logger.bind(service="SingularityNETService")
        self._sdk = None
        self._service_clients: dict[str, Any] = {}
        self._initialized = False
        
    async def initialize(self) -> bool:
        """
        Initialize the SingularityNET SDK.
        
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            # Import SDK (installed via pip install snet-sdk)
            from snet import sdk
            from snet.sdk import PaymentStrategyType
            
            # Get configuration from settings
            private_key = settings.snet_private_key.get_secret_value() if hasattr(settings, 'snet_private_key') else None
            eth_rpc = settings.snet_eth_rpc_endpoint if hasattr(settings, 'snet_eth_rpc_endpoint') else None
            
            if not private_key or private_key == "..." or not eth_rpc:
                self.logger.warning(
                    "SingularityNET SDK not configured - running in mock mode",
                    has_key=bool(private_key),
                    has_rpc=bool(eth_rpc)
                )
                self._initialized = False
                return False
            
            # Configure SDK
            config = sdk.config.Config(
                private_key=private_key,
                eth_rpc_endpoint=eth_rpc,
                concurrency=False,
                force_update=False,
            )
            
            # Initialize SDK instance
            self._sdk = sdk.SnetSDK(config)
            self._initialized = True
            
            self.logger.info("SingularityNET SDK initialized successfully")
            return True
            
        except ImportError:
            self.logger.warning(
                "snet-sdk package not installed. Install with: pip install snet-sdk"
            )
            return False
        except Exception as e:
            self.logger.error("Failed to initialize SingularityNET SDK", error=str(e))
            return False
    
    @property
    def is_initialized(self) -> bool:
        """Check if SDK is properly initialized."""
        return self._initialized and self._sdk is not None
    
    async def list_organizations(self) -> list[str]:
        """
        List all organizations on SingularityNET marketplace.
        
        Returns:
            List of organization IDs
        """
        if not self.is_initialized:
            return self._mock_organizations()
        
        try:
            orgs = self._sdk.get_organization_list()
            return list(orgs)
        except Exception as e:
            self.logger.error("Failed to list organizations", error=str(e))
            return self._mock_organizations()
    
    async def list_services(self, org_id: str) -> list[str]:
        """
        List all services for an organization.
        
        Args:
            org_id: Organization identifier
            
        Returns:
            List of service IDs
        """
        if not self.is_initialized:
            return self._mock_services(org_id)
        
        try:
            services = self._sdk.get_services_list(org_id=org_id)
            return list(services)
        except Exception as e:
            self.logger.error("Failed to list services", org_id=org_id, error=str(e))
            return self._mock_services(org_id)
    
    async def get_service_metadata(
        self,
        org_id: str,
        service_id: str
    ) -> Optional[SNETServiceInfo]:
        """
        Get detailed metadata for a service.
        
        Args:
            org_id: Organization identifier
            service_id: Service identifier
            
        Returns:
            Service information or None if not found
        """
        if not self.is_initialized:
            return self._mock_service_info(org_id, service_id)
        
        try:
            metadata = self._sdk.get_service_metadata(
                org_id=org_id,
                service_id=service_id
            )
            
            # Parse metadata
            groups = metadata.m.get("groups", [])
            pricing = groups[0].get("pricing", [{}])[0] if groups else {}
            endpoints = groups[0].get("endpoints", []) if groups else []
            
            return SNETServiceInfo(
                org_id=org_id,
                service_id=service_id,
                display_name=metadata.m.get("display_name", service_id),
                description=metadata.m.get("service_description", {}).get("description", ""),
                price_in_cogs=pricing.get("price_in_cogs", 0),
                free_calls_available=groups[0].get("free_calls", 0) if groups else 0,
                endpoints=endpoints,
                methods=[],  # Will be populated when client is created
            )
        except Exception as e:
            self.logger.error(
                "Failed to get service metadata",
                org_id=org_id,
                service_id=service_id,
                error=str(e)
            )
            return self._mock_service_info(org_id, service_id)
    
    async def create_service_client(
        self,
        org_id: str,
        service_id: str,
        payment_strategy: PaymentStrategy = PaymentStrategy.DEFAULT,
        group_name: str = "default_group",
        concurrent_calls: int = 1,
    ) -> bool:
        """
        Create a service client for making calls.
        
        Args:
            org_id: Organization identifier
            service_id: Service identifier
            payment_strategy: Payment strategy to use
            group_name: Service group name
            concurrent_calls: Number of prepaid calls (for PREPAID_CALL strategy)
            
        Returns:
            True if client created successfully
        """
        if not self.is_initialized:
            self.logger.info(
                "Creating mock service client",
                org_id=org_id,
                service_id=service_id
            )
            self._service_clients[f"{org_id}/{service_id}"] = "mock_client"
            return True
        
        try:
            from snet.sdk import PaymentStrategyType
            
            # Map our strategy to SDK strategy
            strategy_map = {
                PaymentStrategy.DEFAULT: PaymentStrategyType.DEFAULT,
                PaymentStrategy.FREE_CALL: PaymentStrategyType.FREE_CALL,
                PaymentStrategy.PAID_CALL: PaymentStrategyType.PAID_CALL,
                PaymentStrategy.PREPAID_CALL: PaymentStrategyType.PREPAID_CALL,
            }
            
            sdk_strategy = strategy_map.get(payment_strategy, PaymentStrategyType.DEFAULT)
            
            # Create client
            client = self._sdk.create_service_client(
                org_id=org_id,
                service_id=service_id,
                group_name=group_name,
                payment_strategy_type=sdk_strategy,
                concurrent_calls=concurrent_calls if payment_strategy == PaymentStrategy.PREPAID_CALL else None,
            )
            
            # Store client
            client_key = f"{org_id}/{service_id}"
            self._service_clients[client_key] = client
            
            self.logger.info(
                "Service client created",
                org_id=org_id,
                service_id=service_id,
                payment_strategy=payment_strategy.value
            )
            return True
            
        except Exception as e:
            self.logger.error(
                "Failed to create service client",
                org_id=org_id,
                service_id=service_id,
                error=str(e)
            )
            return False
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def call_service(
        self,
        org_id: str,
        service_id: str,
        method_name: str,
        message_name: str,
        **kwargs: Any,
    ) -> SNETCallResult:
        """
        Call a SingularityNET service method.
        
        Args:
            org_id: Organization identifier
            service_id: Service identifier
            method_name: gRPC method name to call
            message_name: gRPC message name for input
            **kwargs: Method parameters
            
        Returns:
            Call result with data or error
        """
        client_key = f"{org_id}/{service_id}"
        
        # Check if client exists
        if client_key not in self._service_clients:
            # Try to create client
            success = await self.create_service_client(org_id, service_id)
            if not success:
                return SNETCallResult(
                    success=False,
                    data=None,
                    error="Failed to create service client"
                )
        
        client = self._service_clients[client_key]
        
        # Mock mode
        if client == "mock_client" or not self.is_initialized:
            return await self._mock_service_call(
                org_id, service_id, method_name, message_name, **kwargs
            )
        
        try:
            # Make the gRPC call
            result = client.call_rpc(method_name, message_name, **kwargs)
            
            self.logger.info(
                "Service call successful",
                org_id=org_id,
                service_id=service_id,
                method=method_name
            )
            
            return SNETCallResult(
                success=True,
                data=result,
                amount_paid_cogs=client.get_price() if hasattr(client, 'get_price') else 0,
            )
            
        except Exception as e:
            self.logger.error(
                "Service call failed",
                org_id=org_id,
                service_id=service_id,
                method=method_name,
                error=str(e)
            )
            return SNETCallResult(
                success=False,
                data=None,
                error=str(e)
            )
    
    async def get_service_methods(
        self,
        org_id: str,
        service_id: str
    ) -> list[dict[str, str]]:
        """
        Get available methods for a service.
        
        Args:
            org_id: Organization identifier
            service_id: Service identifier
            
        Returns:
            List of method info dicts
        """
        client_key = f"{org_id}/{service_id}"
        
        if client_key not in self._service_clients:
            await self.create_service_client(org_id, service_id)
        
        client = self._service_clients.get(client_key)
        
        if client == "mock_client" or not self.is_initialized:
            return [
                {"service": "MedicalNLP", "method": "analyze", "input": "Text", "output": "Analysis"},
                {"service": "MedicalNLP", "method": "extract_entities", "input": "Text", "output": "Entities"},
            ]
        
        try:
            services, messages = client.get_services_and_messages_info()
            methods = []
            for service_name, service_methods in services.items():
                for method_name, input_type, output_type in service_methods:
                    methods.append({
                        "service": service_name,
                        "method": method_name,
                        "input": input_type,
                        "output": output_type,
                    })
            return methods
        except Exception as e:
            self.logger.error("Failed to get service methods", error=str(e))
            return []
    
    async def get_price(self, org_id: str, service_id: str) -> int:
        """
        Get price in cogs for a service call.
        
        Args:
            org_id: Organization identifier
            service_id: Service identifier
            
        Returns:
            Price in cogs (1 FET = 10^8 cogs)
        """
        client_key = f"{org_id}/{service_id}"
        client = self._service_clients.get(client_key)
        
        if client and client != "mock_client" and self.is_initialized:
            try:
                return client.get_price()
            except Exception:
                pass
        
        # Default mock price
        return 1  # 1 cog
    
    async def deposit_to_escrow(self, amount_cogs: int) -> bool:
        """
        Deposit FET tokens to Multi-Party Escrow contract.
        
        Args:
            amount_cogs: Amount in cogs to deposit
            
        Returns:
            True if successful
        """
        if not self.is_initialized:
            self.logger.info("Mock deposit to escrow", amount_cogs=amount_cogs)
            return True
        
        try:
            self._sdk.account.deposit_to_escrow_account(amount_cogs)
            self.logger.info("Deposited to MPE", amount_cogs=amount_cogs)
            return True
        except Exception as e:
            self.logger.error("Failed to deposit to escrow", error=str(e))
            return False
    
    # =========================================================================
    # Mock implementations for demo/testing
    # =========================================================================
    
    def _mock_organizations(self) -> list[str]:
        """Return mock organizations for demo (based on real marketplace)."""
        return [
            "hetzerk_org",           # Physics simulations
            "LumamiAI",              # Thera AI companion
            "zero2ai",               # AppStorm app generator
            "zero2ai-io",            # AppStorm AI
            "NIM",                   # Matrix summarizer
            "85b2ba24fbbc48eaadc6726a0cae6632",  # Bamboo Labs - Sign Language
            "medichain-health",      # Our organization
        ]
    
    def _mock_services(self, org_id: str) -> list[str]:
        """Return mock services for demo (based on real marketplace)."""
        # Real services from marketplace.singularitynet.io
        services_map = {
            "hetzerk_org": ["coarse-md"],              # Coarse-grained MD simulation
            "LumamiAI": ["Lumami"],                    # Thera AI companion
            "zero2ai": ["appstormapp"],                # AppStorm app
            "zero2ai-io": ["appstormapp"],             # AppStorm AI Generator
            "NIM": ["matrix_summarizer"],              # Matrix chat summarizer
            "85b2ba24fbbc48eaadc6726a0cae6632": ["slta"],  # Sign Language Translator
            "medichain-health": ["trial-matcher", "medical-nlp", "eligibility-checker"],
        }
        return services_map.get(org_id, ["default-service"])
    
    def _mock_service_info(self, org_id: str, service_id: str) -> SNETServiceInfo:
        """Return mock service info for demo."""
        # Construct marketplace URL
        marketplace_url = f"{SNET_MARKETPLACE_URL}/servicedetails/org/{org_id}/service/{service_id}"
        
        return SNETServiceInfo(
            org_id=org_id,
            service_id=service_id,
            display_name=service_id.replace("-", " ").replace("_", " ").title(),
            description=f"AI service: {service_id}. View on marketplace: {marketplace_url}",
            price_in_cogs=1,
            free_calls_available=10,
            endpoints=[f"https://{org_id}.singularitynet.io:7000"],
            methods=[
                {"service": "Service", "method": "process", "input": "Request", "output": "Response"},
            ],
        )
    
    async def _mock_service_call(
        self,
        org_id: str,
        service_id: str,
        method_name: str,
        message_name: str,
        **kwargs: Any,
    ) -> SNETCallResult:
        """
        Mock service call for demo/testing.
        
        Simulates different AI service responses based on service type.
        """
        self.logger.info(
            "Mock service call",
            org_id=org_id,
            service_id=service_id,
            method=method_name,
            params=kwargs
        )
        
        # Simulate processing delay
        await asyncio.sleep(0.1)
        
        # Return appropriate mock response based on service
        if "nlp" in service_id.lower() or "text" in service_id.lower():
            return SNETCallResult(
                success=True,
                data={
                    "entities": [
                        {"type": "condition", "text": "diabetes", "confidence": 0.95},
                        {"type": "medication", "text": "metformin", "confidence": 0.92},
                    ],
                    "sentiment": "neutral",
                    "medical_relevance": 0.87,
                },
                amount_paid_cogs=1,
            )
        
        if "trial-matcher" in service_id.lower():
            return SNETCallResult(
                success=True,
                data={
                    "matches": [
                        {"trial_id": "NCT001", "score": 0.92, "confidence": "high"},
                        {"trial_id": "NCT002", "score": 0.85, "confidence": "medium"},
                    ],
                    "reasoning": "Based on patient profile and trial criteria",
                },
                amount_paid_cogs=1,
            )
        
        if "eligibility" in service_id.lower():
            return SNETCallResult(
                success=True,
                data={
                    "eligible": True,
                    "confidence": 0.89,
                    "criteria_passed": ["age", "condition", "no_exclusions"],
                    "criteria_failed": [],
                },
                amount_paid_cogs=1,
            )
        
        # Generic response
        return SNETCallResult(
            success=True,
            data={
                "result": "processed",
                "input_params": kwargs,
                "timestamp": asyncio.get_event_loop().time(),
            },
            amount_paid_cogs=1,
        )


# =========================================================================
# Medical AI Services - SNET Marketplace Integration
# =========================================================================

class MedicalAIServices:
    """
    Pre-configured medical AI services from SingularityNET marketplace.
    
    This class provides easy access to relevant healthcare AI services
    that MediChain can leverage for enhanced functionality.
    """
    
    # Known medical/health AI services on SNET (these would be real services)
    MEDICAL_NLP_SERVICE = ("snet", "medical-nlp")
    TEXT_SUMMARY_SERVICE = ("snet", "text-summarization")
    ENTITY_EXTRACTION_SERVICE = ("snet", "named-entity-recognition")
    
    # MediChain's own service (when published to marketplace)
    TRIAL_MATCHER_SERVICE = ("medichain-health", "trial-matcher")
    
    def __init__(self, snet_service: SingularityNETService):
        self.snet = snet_service
        self.logger = logger.bind(component="MedicalAIServices")
    
    async def analyze_medical_text(self, text: str) -> dict[str, Any]:
        """
        Analyze medical text using SNET NLP service.
        
        Args:
            text: Medical text to analyze
            
        Returns:
            Analysis results with entities, conditions, etc.
        """
        org_id, service_id = self.MEDICAL_NLP_SERVICE
        
        result = await self.snet.call_service(
            org_id=org_id,
            service_id=service_id,
            method_name="analyze",
            message_name="TextInput",
            text=text,
        )
        
        if result.success:
            return result.data
        
        self.logger.warning("Medical text analysis failed", error=result.error)
        return {"error": result.error}
    
    async def extract_medical_entities(self, text: str) -> list[dict[str, Any]]:
        """
        Extract medical entities (conditions, medications, procedures).
        
        Args:
            text: Medical text
            
        Returns:
            List of extracted entities
        """
        org_id, service_id = self.ENTITY_EXTRACTION_SERVICE
        
        result = await self.snet.call_service(
            org_id=org_id,
            service_id=service_id,
            method_name="extract",
            message_name="TextInput",
            text=text,
            entity_types=["condition", "medication", "procedure", "biomarker"],
        )
        
        if result.success:
            return result.data.get("entities", [])
        
        return []
    
    async def summarize_trial_criteria(self, criteria_text: str) -> str:
        """
        Summarize clinical trial eligibility criteria.
        
        Args:
            criteria_text: Full eligibility criteria text
            
        Returns:
            Summarized criteria
        """
        org_id, service_id = self.TEXT_SUMMARY_SERVICE
        
        result = await self.snet.call_service(
            org_id=org_id,
            service_id=service_id,
            method_name="summarize",
            message_name="TextInput",
            text=criteria_text,
            max_length=200,
        )
        
        if result.success:
            return result.data.get("summary", criteria_text[:200])
        
        return criteria_text[:200] + "..."


# Singleton instance
_snet_service: Optional[SingularityNETService] = None


def get_snet_service() -> SingularityNETService:
    """Get or create the SingularityNET service singleton."""
    global _snet_service
    if _snet_service is None:
        _snet_service = SingularityNETService()
    return _snet_service


def get_medical_ai_services() -> MedicalAIServices:
    """Get pre-configured medical AI services."""
    return MedicalAIServices(get_snet_service())
