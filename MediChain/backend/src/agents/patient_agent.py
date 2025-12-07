"""
MediChain Patient Agent

Responsible for:
- EHR/PDF document parsing and data extraction
- Patient profile structuring with Gemini
- Privacy-preserving semantic hash generation
- DID creation and management
"""

import re
from datetime import datetime
from typing import Any
from uuid import uuid4

import structlog
from pypdf import PdfReader

from src.config import settings
from src.core.security import encryption_service, generate_did, hashing_service
from src.models.patient import PatientProfile
from src.services.llm import LLMService

logger = structlog.get_logger(__name__)


class PatientAgent:
    """
    Patient Agent for profile extraction and privacy preservation.
    
    Features:
    - Extract structured medical data from EHR documents (PDF, HL7, FHIR)
    - Generate privacy-preserving semantic hashes
    - Create and manage Decentralized Identifiers (DIDs)
    - Calculate profile completeness scores
    """
    
    def __init__(self, llm_service: LLMService | None = None):
        """Initialize the Patient Agent."""
        self.llm = llm_service or LLMService()
        self.logger = logger.bind(agent="PatientAgent")
    
    async def extract_profile_from_document(
        self,
        document_content: str | bytes,
        document_type: str = "pdf",
    ) -> PatientProfile:
        """
        Extract structured patient profile from medical documents.
        
        Args:
            document_content: Raw document content or bytes
            document_type: Type of document (pdf, hl7, fhir, text)
            
        Returns:
            Structured PatientProfile
        """
        self.logger.info("Extracting patient profile", document_type=document_type)
        
        # Parse document based on type
        if document_type == "pdf":
            text = self._extract_text_from_pdf(document_content)
        elif document_type == "fhir":
            text = self._parse_fhir_bundle(document_content)
        elif document_type == "hl7":
            text = self._parse_hl7_message(document_content)
        else:
            text = str(document_content)
        
        # Use Gemini to extract structured data
        extraction_prompt = self._build_extraction_prompt(text)
        extracted_data = await self.llm.extract_structured_data(
            prompt=extraction_prompt,
            schema=PatientProfile,
        )
        
        self.logger.info(
            "Profile extracted",
            conditions_count=len(extracted_data.conditions),
            biomarkers_count=len(extracted_data.biomarkers),
        )
        
        return extracted_data
    
    def _extract_text_from_pdf(self, pdf_content: bytes | str) -> str:
        """Extract text content from PDF document."""
        try:
            if isinstance(pdf_content, str):
                # Assume it's a file path
                reader = PdfReader(pdf_content)
            else:
                # Assume it's bytes
                import io
                reader = PdfReader(io.BytesIO(pdf_content))
            
            text_parts = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
            
            return "\n".join(text_parts)
        except Exception as e:
            self.logger.error("PDF extraction failed", error=str(e))
            raise ValueError(f"Failed to extract text from PDF: {e}")
    
    def _parse_fhir_bundle(self, fhir_content: str | dict) -> str:
        """Parse FHIR bundle and extract relevant patient data."""
        # Simplified FHIR parsing - in production, use fhir.resources
        try:
            import json
            if isinstance(fhir_content, str):
                bundle = json.loads(fhir_content)
            else:
                bundle = fhir_content
            
            extracted_parts = []
            
            if "entry" in bundle:
                for entry in bundle["entry"]:
                    resource = entry.get("resource", {})
                    resource_type = resource.get("resourceType", "")
                    
                    if resource_type == "Patient":
                        extracted_parts.append(f"Patient Demographics: {json.dumps(resource)}")
                    elif resource_type == "Condition":
                        code = resource.get("code", {}).get("text", "Unknown")
                        extracted_parts.append(f"Condition: {code}")
                    elif resource_type == "MedicationStatement":
                        med = resource.get("medicationCodeableConcept", {}).get("text", "Unknown")
                        extracted_parts.append(f"Medication: {med}")
                    elif resource_type == "Observation":
                        obs_code = resource.get("code", {}).get("text", "")
                        obs_value = resource.get("valueQuantity", {}).get("value", "")
                        if obs_code:
                            extracted_parts.append(f"Observation: {obs_code} = {obs_value}")
            
            return "\n".join(extracted_parts)
        except Exception as e:
            self.logger.error("FHIR parsing failed", error=str(e))
            return str(fhir_content)
    
    def _parse_hl7_message(self, hl7_content: str) -> str:
        """Parse HL7 v2 message and extract patient data."""
        # Simplified HL7 parsing
        try:
            lines = hl7_content.strip().split("\r")
            extracted_parts = []
            
            for line in lines:
                segments = line.split("|")
                segment_type = segments[0] if segments else ""
                
                if segment_type == "PID":  # Patient identification
                    if len(segments) > 5:
                        extracted_parts.append(f"Patient Name: {segments[5]}")
                    if len(segments) > 7:
                        extracted_parts.append(f"DOB: {segments[7]}")
                    if len(segments) > 8:
                        extracted_parts.append(f"Gender: {segments[8]}")
                elif segment_type == "DG1":  # Diagnosis
                    if len(segments) > 3:
                        extracted_parts.append(f"Diagnosis: {segments[3]}")
                elif segment_type == "RXA":  # Medication
                    if len(segments) > 5:
                        extracted_parts.append(f"Medication: {segments[5]}")
            
            return "\n".join(extracted_parts)
        except Exception as e:
            self.logger.error("HL7 parsing failed", error=str(e))
            return hl7_content
    
    def _build_extraction_prompt(self, document_text: str) -> str:
        """Build the prompt for Gemini to extract structured data."""
        # Truncate if too long
        max_chars = 30000
        if len(document_text) > max_chars:
            document_text = document_text[:max_chars] + "\n[... truncated ...]"
        
        return f"""You are a medical data extraction specialist. Extract structured patient information from the following medical document.

IMPORTANT: 
- Only extract information that is explicitly stated in the document
- For age, convert to an age range (e.g., "18-25", "26-35", "36-45", "46-55", "56-65", "65+")
- Normalize all conditions to standard medical terminology
- Extract biomarkers with their values (e.g., EGFR: positive, HER2: 3+, PD-L1: 50%)
- List current medications only
- Extract known allergies

MEDICAL DOCUMENT:
---
{document_text}
---

Extract the patient profile as a structured JSON object with these fields:
- age_range: string (e.g., "45-55")
- gender: "male" | "female" | "other" | "prefer_not_to_say"
- ethnicity: string or null
- location_region: string or null
- conditions: list of medical conditions
- biomarkers: dict of biomarker names to values
- medications: list of current medications
- allergies: list of known allergies
- procedures_history: list of past procedures/surgeries

Return ONLY valid JSON, no additional text."""
    
    def generate_semantic_hash(self, profile: PatientProfile) -> str:
        """
        Generate privacy-preserving semantic hash from patient profile.
        
        This hash allows for matching without exposing raw data.
        Uses SHA3-256 for quantum resistance.
        """
        profile_dict = profile.model_dump()
        return hashing_service.generate_semantic_hash(profile_dict)
    
    def create_did(self) -> str:
        """
        Create a new Decentralized Identifier for the patient.
        
        Format: did:medichain:<unique-identifier>
        """
        return generate_did()
    
    def calculate_completeness(self, profile: PatientProfile) -> float:
        """
        Calculate profile completeness score (0-100%).
        
        Weights:
        - Basic demographics: 20%
        - Medical conditions: 25%
        - Biomarkers: 20%
        - Medications: 15%
        - Allergies: 10%
        - Procedures: 10%
        """
        score = 0.0
        
        # Demographics (20%)
        demo_fields = [profile.age_range, profile.gender, profile.ethnicity, profile.location_region]
        demo_score = sum(1 for f in demo_fields if f) / len(demo_fields) * 20
        score += demo_score
        
        # Conditions (25%) - at least one condition
        if profile.conditions:
            score += min(25, len(profile.conditions) * 5)
        
        # Biomarkers (20%)
        if profile.biomarkers:
            score += min(20, len(profile.biomarkers) * 4)
        
        # Medications (15%)
        if profile.medications:
            score += min(15, len(profile.medications) * 3)
        
        # Allergies (10%)
        if profile.allergies:
            score += min(10, len(profile.allergies) * 5)
        else:
            # Give partial credit if explicitly empty (user confirmed no allergies)
            score += 5
        
        # Procedures (10%)
        if profile.procedures_history:
            score += min(10, len(profile.procedures_history) * 5)
        
        return min(100.0, score)
    
    async def generate_embedding(self, profile: PatientProfile) -> list[float]:
        """
        Generate vector embedding for the patient profile.
        
        Used for semantic similarity search in trial matching.
        """
        # Create a textual representation for embedding
        text_repr = self._profile_to_text(profile)
        return await self.llm.generate_embedding(text_repr)
    
    def _profile_to_text(self, profile: PatientProfile) -> str:
        """Convert profile to text for embedding."""
        parts = []
        
        if profile.age_range:
            parts.append(f"Age: {profile.age_range}")
        if profile.gender:
            parts.append(f"Gender: {profile.gender}")
        if profile.ethnicity:
            parts.append(f"Ethnicity: {profile.ethnicity}")
        if profile.conditions:
            parts.append(f"Conditions: {', '.join(profile.conditions)}")
        if profile.biomarkers:
            biomarker_str = ", ".join(f"{k}={v}" for k, v in profile.biomarkers.items())
            parts.append(f"Biomarkers: {biomarker_str}")
        if profile.medications:
            parts.append(f"Medications: {', '.join(profile.medications)}")
        if profile.allergies:
            parts.append(f"Allergies: {', '.join(profile.allergies)}")
        
        return " | ".join(parts)
    
    def encrypt_sensitive_data(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Encrypt sensitive fields in patient data.
        
        Fields encrypted: email, full_name, exact_address, phone
        """
        sensitive_fields = ["email", "full_name", "exact_address", "phone", "ssn"]
        return encryption_service.encrypt_dict(data, sensitive_fields)
    
    def decrypt_sensitive_data(self, data: dict[str, Any]) -> dict[str, Any]:
        """Decrypt sensitive fields in patient data."""
        sensitive_fields = ["email", "full_name", "exact_address", "phone", "ssn"]
        return encryption_service.decrypt_dict(data, sensitive_fields)
