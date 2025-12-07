"""
MediChain Agents Package

AI agent modules for decentralized clinical trial matching:
- Patient Agent: Profile extraction and semantic hashing
- Matcher Agent: Hybrid neuro-symbolic matching engine
- Consent Agent: On-chain verification and audit
"""

from src.agents.matcher_agent import MatcherAgent
from src.agents.patient_agent import PatientAgent
from src.agents.consent_agent import ConsentAgent

__all__ = ["PatientAgent", "MatcherAgent", "ConsentAgent"]
