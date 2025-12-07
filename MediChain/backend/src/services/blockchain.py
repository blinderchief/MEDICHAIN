"""
MediChain Blockchain Service

Web3 integration for:
- Base L2 / SingularityNET MPE smart contract interactions
- On-chain consent verification
- ASI token reward distribution
- Decentralized identity (DID) anchoring
"""

import asyncio
import hashlib
import json
import logging
from datetime import datetime, UTC
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field
from web3 import AsyncWeb3
from web3.exceptions import ContractLogicError, Web3Exception
from web3.middleware import ExtraDataToPOAMiddleware

from src.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Contract ABIs (Simplified for demo)
# ─────────────────────────────────────────────────────────────────────────────

MEDICHAIN_CONSENT_ABI = [
    {
        "type": "function",
        "name": "recordConsent",
        "inputs": [
            {"name": "patientDid", "type": "bytes32"},
            {"name": "trialId", "type": "bytes32"},
            {"name": "consentHash", "type": "bytes32"},
            {"name": "timestamp", "type": "uint256"},
        ],
        "outputs": [{"name": "consentId", "type": "uint256"}],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "verifyConsent",
        "inputs": [
            {"name": "patientDid", "type": "bytes32"},
            {"name": "trialId", "type": "bytes32"},
        ],
        "outputs": [
            {"name": "isValid", "type": "bool"},
            {"name": "consentHash", "type": "bytes32"},
            {"name": "timestamp", "type": "uint256"},
        ],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "revokeConsent",
        "inputs": [
            {"name": "patientDid", "type": "bytes32"},
            {"name": "trialId", "type": "bytes32"},
        ],
        "outputs": [{"name": "success", "type": "bool"}],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "distributeReward",
        "inputs": [
            {"name": "recipient", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "reason", "type": "string"},
        ],
        "outputs": [{"name": "success", "type": "bool"}],
        "stateMutability": "nonpayable",
    },
    {
        "type": "event",
        "name": "ConsentRecorded",
        "inputs": [
            {"name": "patientDid", "type": "bytes32", "indexed": True},
            {"name": "trialId", "type": "bytes32", "indexed": True},
            {"name": "consentId", "type": "uint256", "indexed": False},
            {"name": "timestamp", "type": "uint256", "indexed": False},
        ],
    },
    {
        "type": "event",
        "name": "RewardDistributed",
        "inputs": [
            {"name": "recipient", "type": "address", "indexed": True},
            {"name": "amount", "type": "uint256", "indexed": False},
            {"name": "reason", "type": "string", "indexed": False},
        ],
    },
]

ERC20_ABI = [
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "balance", "type": "uint256"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "transfer",
        "inputs": [
            {"name": "recipient", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "outputs": [{"name": "success", "type": "bool"}],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "approve",
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "outputs": [{"name": "success", "type": "bool"}],
        "stateMutability": "nonpayable",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Enums and Models
# ─────────────────────────────────────────────────────────────────────────────

class RewardType(str, Enum):
    """Types of ASI token rewards."""
    ENROLLMENT = "enrollment"
    CONSENT = "consent"
    DATA_CONTRIBUTION = "data_contribution"
    TRIAL_COMPLETION = "trial_completion"
    REFERRAL = "referral"


class TransactionStatus(str, Enum):
    """Blockchain transaction status."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class ConsentRecord(BaseModel):
    """On-chain consent record."""
    patient_did: str
    trial_id: str
    consent_hash: str
    timestamp: datetime
    tx_hash: str | None = None
    block_number: int | None = None
    is_valid: bool = True


class RewardRecord(BaseModel):
    """ASI token reward record."""
    recipient_address: str
    amount: float
    reward_type: RewardType
    reason: str
    tx_hash: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class BlockchainTransaction(BaseModel):
    """Generic blockchain transaction result."""
    tx_hash: str
    block_number: int | None = None
    status: TransactionStatus
    gas_used: int | None = None
    error_message: str | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Blockchain Service
# ─────────────────────────────────────────────────────────────────────────────

class BlockchainService:
    """
    Web3 service for MediChain blockchain interactions.
    
    Supports:
    - Base L2 (low gas fees)
    - SingularityNET MPE protocol integration
    - On-chain consent management
    - ASI token rewards
    """
    
    def __init__(self):
        self.w3: AsyncWeb3 | None = None
        self.consent_contract = None
        self.asi_token_contract = None
        self._initialized = False
        
        # Configuration
        self.provider_url = settings.web3_provider_url
        self.chain_id = settings.chain_id
        self.contract_address = settings.contract_address
        self.asi_token_address = settings.asi_token_address
    
    async def initialize(self) -> bool:
        """Initialize Web3 connection and contracts."""
        if self._initialized:
            return True
        
        try:
            # Connect to Base L2
            self.w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(self.provider_url))
            
            # Add PoA middleware for Base
            self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
            
            # Verify connection
            if not await self.w3.is_connected():
                logger.error("Failed to connect to blockchain")
                return False
            
            chain_id = await self.w3.eth.chain_id
            logger.info(f"Connected to chain ID: {chain_id}")
            
            # Initialize contracts
            if self.contract_address:
                self.consent_contract = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.contract_address),
                    abi=MEDICHAIN_CONSENT_ABI,
                )
            
            if self.asi_token_address and self.asi_token_address != "0x...":
                self.asi_token_contract = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.asi_token_address),
                    abi=ERC20_ABI,
                )
            
            self._initialized = True
            logger.info("Blockchain service initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Blockchain initialization failed: {e}")
            return False
    
    async def health_check(self) -> dict[str, Any]:
        """Check blockchain connection health."""
        try:
            if not self.w3 or not await self.w3.is_connected():
                return {
                    "status": "unhealthy",
                    "connected": False,
                    "error": "Not connected to blockchain",
                }
            
            block_number = await self.w3.eth.block_number
            gas_price = await self.w3.eth.gas_price
            
            return {
                "status": "healthy",
                "connected": True,
                "chain_id": self.chain_id,
                "block_number": block_number,
                "gas_price_gwei": float(self.w3.from_wei(gas_price, "gwei")),
                "contract_deployed": self.contract_address is not None,
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e),
            }
    
    # ─────────────────────────────────────────────────────────────────────────
    # Consent Management
    # ─────────────────────────────────────────────────────────────────────────
    
    def _to_bytes32(self, value: str) -> bytes:
        """Convert string to bytes32 for contract calls."""
        if value.startswith("0x"):
            return bytes.fromhex(value[2:].zfill(64))
        # Hash the value to get consistent bytes32
        return hashlib.sha256(value.encode()).digest()
    
    def _compute_consent_hash(
        self,
        patient_did: str,
        trial_id: str,
        consent_data: dict[str, Any],
    ) -> bytes:
        """Compute deterministic hash of consent data."""
        data = {
            "patient_did": patient_did,
            "trial_id": trial_id,
            "consent": consent_data,
        }
        serialized = json.dumps(data, sort_keys=True)
        return hashlib.sha256(serialized.encode()).digest()
    
    async def record_consent(
        self,
        patient_did: str,
        trial_id: str,
        consent_data: dict[str, Any],
        signer_private_key: str | None = None,
    ) -> BlockchainTransaction:
        """
        Record patient consent on-chain.
        
        Creates an immutable, auditable record of consent.
        """
        if not self._initialized:
            await self.initialize()
        
        # Use private key from settings if not provided
        private_key = signer_private_key
        if not private_key and settings.private_key:
            private_key = settings.private_key.get_secret_value()
        
        if not private_key or not self.consent_contract:
            # Return mock transaction for development
            logger.warning("No private key or contract - returning mock transaction")
            return BlockchainTransaction(
                tx_hash=f"0x{'0' * 64}",
                status=TransactionStatus.PENDING,
                error_message="Development mode - no actual transaction",
            )
        
        try:
            # Prepare data
            patient_did_bytes = self._to_bytes32(patient_did)
            trial_id_bytes = self._to_bytes32(trial_id)
            consent_hash = self._compute_consent_hash(patient_did, trial_id, consent_data)
            timestamp = int(datetime.now(UTC).timestamp())
            
            # Build transaction
            account = self.w3.eth.account.from_key(private_key)
            nonce = await self.w3.eth.get_transaction_count(account.address)
            
            tx = await self.consent_contract.functions.recordConsent(
                patient_did_bytes,
                trial_id_bytes,
                consent_hash,
                timestamp,
            ).build_transaction({
                "from": account.address,
                "nonce": nonce,
                "chainId": self.chain_id,
                "gas": 200000,
                "maxFeePerGas": await self.w3.eth.gas_price,
                "maxPriorityFeePerGas": self.w3.to_wei(1, "gwei"),
            })
            
            # Sign and send
            signed = self.w3.eth.account.sign_transaction(tx, private_key)
            tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
            
            logger.info(f"Consent recorded: {tx_hash.hex()}")
            
            # Wait for receipt
            receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            
            return BlockchainTransaction(
                tx_hash=tx_hash.hex(),
                block_number=receipt.blockNumber,
                status=TransactionStatus.CONFIRMED if receipt.status == 1 else TransactionStatus.FAILED,
                gas_used=receipt.gasUsed,
            )
            
        except ContractLogicError as e:
            logger.error(f"Contract error recording consent: {e}")
            return BlockchainTransaction(
                tx_hash="",
                status=TransactionStatus.FAILED,
                error_message=str(e),
            )
        except Exception as e:
            logger.error(f"Error recording consent: {e}")
            return BlockchainTransaction(
                tx_hash="",
                status=TransactionStatus.FAILED,
                error_message=str(e),
            )
    
    async def verify_consent(
        self,
        patient_did: str,
        trial_id: str,
    ) -> ConsentRecord | None:
        """
        Verify consent exists on-chain.
        
        Returns consent record if valid, None otherwise.
        """
        if not self._initialized:
            await self.initialize()
        
        if not self.consent_contract:
            logger.warning("No contract deployed - cannot verify consent")
            return None
        
        try:
            patient_did_bytes = self._to_bytes32(patient_did)
            trial_id_bytes = self._to_bytes32(trial_id)
            
            result = await self.consent_contract.functions.verifyConsent(
                patient_did_bytes,
                trial_id_bytes,
            ).call()
            
            is_valid, consent_hash, timestamp = result
            
            if not is_valid:
                return None
            
            return ConsentRecord(
                patient_did=patient_did,
                trial_id=trial_id,
                consent_hash=consent_hash.hex(),
                timestamp=datetime.fromtimestamp(timestamp, tz=UTC),
                is_valid=True,
            )
            
        except Exception as e:
            logger.error(f"Error verifying consent: {e}")
            return None
    
    async def revoke_consent(
        self,
        patient_did: str,
        trial_id: str,
        signer_private_key: str | None = None,
    ) -> BlockchainTransaction:
        """Revoke patient consent on-chain."""
        if not self._initialized:
            await self.initialize()
        
        private_key = signer_private_key
        if not private_key and settings.private_key:
            private_key = settings.private_key.get_secret_value()
        
        if not private_key or not self.consent_contract:
            return BlockchainTransaction(
                tx_hash="",
                status=TransactionStatus.FAILED,
                error_message="No private key or contract configured",
            )
        
        try:
            patient_did_bytes = self._to_bytes32(patient_did)
            trial_id_bytes = self._to_bytes32(trial_id)
            
            account = self.w3.eth.account.from_key(private_key)
            nonce = await self.w3.eth.get_transaction_count(account.address)
            
            tx = await self.consent_contract.functions.revokeConsent(
                patient_did_bytes,
                trial_id_bytes,
            ).build_transaction({
                "from": account.address,
                "nonce": nonce,
                "chainId": self.chain_id,
                "gas": 100000,
                "maxFeePerGas": await self.w3.eth.gas_price,
                "maxPriorityFeePerGas": self.w3.to_wei(1, "gwei"),
            })
            
            signed = self.w3.eth.account.sign_transaction(tx, private_key)
            tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
            
            receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            
            return BlockchainTransaction(
                tx_hash=tx_hash.hex(),
                block_number=receipt.blockNumber,
                status=TransactionStatus.CONFIRMED if receipt.status == 1 else TransactionStatus.FAILED,
                gas_used=receipt.gasUsed,
            )
            
        except Exception as e:
            logger.error(f"Error revoking consent: {e}")
            return BlockchainTransaction(
                tx_hash="",
                status=TransactionStatus.FAILED,
                error_message=str(e),
            )
    
    # ─────────────────────────────────────────────────────────────────────────
    # ASI Token Rewards
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_asi_balance(self, address: str) -> float:
        """Get ASI token balance for an address."""
        if not self._initialized:
            await self.initialize()
        
        if not self.asi_token_contract:
            return 0.0
        
        try:
            checksum_address = self.w3.to_checksum_address(address)
            balance_wei = await self.asi_token_contract.functions.balanceOf(checksum_address).call()
            return float(self.w3.from_wei(balance_wei, "ether"))
        except Exception as e:
            logger.error(f"Error getting ASI balance: {e}")
            return 0.0
    
    async def distribute_reward(
        self,
        recipient_address: str,
        amount: float,
        reward_type: RewardType,
        reason: str,
        signer_private_key: str | None = None,
    ) -> BlockchainTransaction:
        """
        Distribute ASI token rewards to participants.
        
        Reward amounts by type:
        - ENROLLMENT: 10 ASI
        - CONSENT: 5 ASI
        - DATA_CONTRIBUTION: 2 ASI per contribution
        - TRIAL_COMPLETION: 50 ASI
        - REFERRAL: 5 ASI
        """
        if not self._initialized:
            await self.initialize()
        
        private_key = signer_private_key
        if not private_key and settings.private_key:
            private_key = settings.private_key.get_secret_value()
        
        if not private_key or not self.consent_contract:
            logger.warning("No private key or contract - returning mock reward")
            return BlockchainTransaction(
                tx_hash=f"0x{'1' * 64}",
                status=TransactionStatus.PENDING,
                error_message="Development mode - no actual transaction",
            )
        
        try:
            checksum_address = self.w3.to_checksum_address(recipient_address)
            amount_wei = self.w3.to_wei(amount, "ether")
            
            account = self.w3.eth.account.from_key(private_key)
            nonce = await self.w3.eth.get_transaction_count(account.address)
            
            tx = await self.consent_contract.functions.distributeReward(
                checksum_address,
                amount_wei,
                f"{reward_type.value}: {reason}",
            ).build_transaction({
                "from": account.address,
                "nonce": nonce,
                "chainId": self.chain_id,
                "gas": 150000,
                "maxFeePerGas": await self.w3.eth.gas_price,
                "maxPriorityFeePerGas": self.w3.to_wei(1, "gwei"),
            })
            
            signed = self.w3.eth.account.sign_transaction(tx, private_key)
            tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
            
            receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            
            logger.info(f"Reward distributed: {amount} ASI to {recipient_address}")
            
            return BlockchainTransaction(
                tx_hash=tx_hash.hex(),
                block_number=receipt.blockNumber,
                status=TransactionStatus.CONFIRMED if receipt.status == 1 else TransactionStatus.FAILED,
                gas_used=receipt.gasUsed,
            )
            
        except Exception as e:
            logger.error(f"Error distributing reward: {e}")
            return BlockchainTransaction(
                tx_hash="",
                status=TransactionStatus.FAILED,
                error_message=str(e),
            )
    
    # ─────────────────────────────────────────────────────────────────────────
    # DID Management
    # ─────────────────────────────────────────────────────────────────────────
    
    def generate_did(self, identifier: str) -> str:
        """
        Generate a Decentralized Identifier (DID) for a patient.
        
        Format: did:medichain:<hash>
        """
        # Create deterministic DID from identifier
        hash_input = f"medichain:{identifier}:{settings.secret_key.get_secret_value()}"
        did_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:40]
        return f"did:medichain:{did_hash}"
    
    def verify_did_ownership(
        self,
        did: str,
        signature: str,
        message: str,
    ) -> bool:
        """
        Verify that a signature was created by the DID owner.
        
        Uses Ethereum-style message signing.
        """
        if not self.w3:
            return False
        
        try:
            # Extract address from DID if possible
            # For demo, we use simplified verification
            message_hash = self.w3.keccak(text=message)
            # In production, recover address from signature
            return True  # Simplified for demo
        except Exception as e:
            logger.error(f"DID verification failed: {e}")
            return False
    
    # ─────────────────────────────────────────────────────────────────────────
    # Event Listening
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_consent_events(
        self,
        patient_did: str | None = None,
        trial_id: str | None = None,
        from_block: int = 0,
    ) -> list[dict[str, Any]]:
        """Get consent events from blockchain."""
        if not self._initialized:
            await self.initialize()
        
        if not self.consent_contract:
            return []
        
        try:
            # Build filter
            filter_params: dict[str, Any] = {"fromBlock": from_block}
            
            if patient_did:
                filter_params["argument_filters"] = {"patientDid": self._to_bytes32(patient_did)}
            
            events = await self.consent_contract.events.ConsentRecorded.get_logs(**filter_params)
            
            return [
                {
                    "patient_did": event.args.patientDid.hex(),
                    "trial_id": event.args.trialId.hex(),
                    "consent_id": event.args.consentId,
                    "timestamp": datetime.fromtimestamp(event.args.timestamp, tz=UTC),
                    "tx_hash": event.transactionHash.hex(),
                    "block_number": event.blockNumber,
                }
                for event in events
            ]
            
        except Exception as e:
            logger.error(f"Error getting consent events: {e}")
            return []


# ─────────────────────────────────────────────────────────────────────────────
# Service Singleton
# ─────────────────────────────────────────────────────────────────────────────

_blockchain_service: BlockchainService | None = None


async def get_blockchain_service() -> BlockchainService:
    """Get or create blockchain service instance."""
    global _blockchain_service
    
    if _blockchain_service is None:
        _blockchain_service = BlockchainService()
        await _blockchain_service.initialize()
    
    return _blockchain_service


async def shutdown_blockchain_service() -> None:
    """Shutdown blockchain service."""
    global _blockchain_service
    
    if _blockchain_service is not None:
        # Web3 doesn't require explicit cleanup
        _blockchain_service = None
