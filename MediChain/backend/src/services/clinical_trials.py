"""
MediChain ClinicalTrials.gov Integration Service

Fetches and syncs clinical trial data from ClinicalTrials.gov API v2.
Supports full-text search, filtering, and bulk import.
"""

import asyncio
import hashlib
import logging
from datetime import datetime, UTC
from enum import Enum
from typing import Any
from uuid import UUID

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

CLINICALTRIALS_API_BASE = "https://clinicaltrials.gov/api/v2"
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


# ─────────────────────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────────────────────

class StudyStatus(str, Enum):
    """ClinicalTrials.gov study status."""
    NOT_YET_RECRUITING = "NOT_YET_RECRUITING"
    RECRUITING = "RECRUITING"
    ENROLLING_BY_INVITATION = "ENROLLING_BY_INVITATION"
    ACTIVE_NOT_RECRUITING = "ACTIVE_NOT_RECRUITING"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"
    TERMINATED = "TERMINATED"
    WITHDRAWN = "WITHDRAWN"


class StudyType(str, Enum):
    """ClinicalTrials.gov study types."""
    INTERVENTIONAL = "INTERVENTIONAL"
    OBSERVATIONAL = "OBSERVATIONAL"
    EXPANDED_ACCESS = "EXPANDED_ACCESS"


class Phase(str, Enum):
    """Clinical trial phases."""
    EARLY_PHASE1 = "EARLY_PHASE1"
    PHASE1 = "PHASE1"
    PHASE2 = "PHASE2"
    PHASE3 = "PHASE3"
    PHASE4 = "PHASE4"
    NA = "NA"


# ─────────────────────────────────────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────────────────────────────────────

class StudyLocation(BaseModel):
    """Clinical trial location/site."""
    facility: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    zip_code: str | None = None
    status: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class EligibilityCriteria(BaseModel):
    """Parsed eligibility criteria."""
    raw_text: str | None = None
    inclusion_criteria: list[str] = Field(default_factory=list)
    exclusion_criteria: list[str] = Field(default_factory=list)
    min_age: int | None = None
    max_age: int | None = None
    gender: str | None = None
    healthy_volunteers: bool | None = None


class StudyContact(BaseModel):
    """Study contact information."""
    name: str | None = None
    role: str | None = None
    email: str | None = None
    phone: str | None = None


class StudyArm(BaseModel):
    """Treatment arm/group."""
    label: str
    type: str | None = None
    description: str | None = None
    interventions: list[str] = Field(default_factory=list)


class ClinicalTrialData(BaseModel):
    """
    Complete clinical trial data from ClinicalTrials.gov.
    
    Maps to our internal Trial model.
    """
    # Identification
    nct_id: str
    org_study_id: str | None = None
    brief_title: str
    official_title: str | None = None
    acronym: str | None = None
    
    # Status
    overall_status: StudyStatus | None = None
    last_known_status: str | None = None
    why_stopped: str | None = None
    start_date: datetime | None = None
    completion_date: datetime | None = None
    primary_completion_date: datetime | None = None
    
    # Description
    brief_summary: str | None = None
    detailed_description: str | None = None
    
    # Study Design
    study_type: StudyType | None = None
    phases: list[Phase] = Field(default_factory=list)
    allocation: str | None = None
    intervention_model: str | None = None
    masking: str | None = None
    primary_purpose: str | None = None
    
    # Enrollment
    enrollment: int | None = None
    enrollment_type: str | None = None
    
    # Eligibility
    eligibility: EligibilityCriteria = Field(default_factory=EligibilityCriteria)
    
    # Conditions & Interventions
    conditions: list[str] = Field(default_factory=list)
    interventions: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    
    # Arms & Groups
    arms: list[StudyArm] = Field(default_factory=list)
    
    # Outcomes
    primary_outcomes: list[str] = Field(default_factory=list)
    secondary_outcomes: list[str] = Field(default_factory=list)
    
    # Location
    locations: list[StudyLocation] = Field(default_factory=list)
    location_countries: list[str] = Field(default_factory=list)
    
    # Contacts
    contacts: list[StudyContact] = Field(default_factory=list)
    
    # Sponsor
    lead_sponsor: str | None = None
    collaborators: list[str] = Field(default_factory=list)
    
    # Metadata
    url: str | None = None
    first_posted_date: datetime | None = None
    last_updated_date: datetime | None = None
    results_first_posted_date: datetime | None = None
    has_results: bool = False
    
    @property
    def content_hash(self) -> str:
        """Generate content hash for change detection."""
        content = f"{self.nct_id}:{self.brief_title}:{self.overall_status}:{self.enrollment}:{self.eligibility.raw_text}"
        return hashlib.md5(content.encode()).hexdigest()


class SearchResult(BaseModel):
    """ClinicalTrials.gov search result."""
    total_count: int
    studies: list[ClinicalTrialData]
    next_page_token: str | None = None


# ─────────────────────────────────────────────────────────────────────────────
# ClinicalTrials.gov Service
# ─────────────────────────────────────────────────────────────────────────────

class ClinicalTrialsService:
    """
    Service for interacting with ClinicalTrials.gov API v2.
    
    Features:
    - Full-text search with filters
    - Study retrieval by NCT ID
    - Bulk import for conditions
    - Automatic parsing of eligibility criteria
    """
    
    def __init__(self, timeout: float = 30.0):
        self.base_url = CLINICALTRIALS_API_BASE
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "MediChain/1.0 (clinical-trial-matching)",
                },
            )
        return self._client
    
    async def close(self) -> None:
        """Close HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    # ─────────────────────────────────────────────────────────────────────────
    # API Methods
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_study(self, nct_id: str) -> ClinicalTrialData | None:
        """
        Fetch a single study by NCT ID.
        
        Args:
            nct_id: ClinicalTrials.gov identifier (e.g., "NCT05537558")
        
        Returns:
            ClinicalTrialData or None if not found
        """
        client = await self._get_client()
        
        try:
            # Request all fields
            params = {
                "format": "json",
                "fields": self._get_all_fields(),
            }
            
            response = await client.get(f"/studies/{nct_id}", params=params)
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            data = response.json()
            
            return self._parse_study(data)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching study {nct_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching study {nct_id}: {e}")
            return None
    
    async def search_studies(
        self,
        query: str | None = None,
        conditions: list[str] | None = None,
        status: list[StudyStatus] | None = None,
        study_type: StudyType | None = None,
        phases: list[Phase] | None = None,
        location_country: str | None = None,
        location_state: str | None = None,
        location_city: str | None = None,
        min_enrollment: int | None = None,
        sponsor: str | None = None,
        start_date_from: datetime | None = None,
        start_date_to: datetime | None = None,
        page_size: int = DEFAULT_PAGE_SIZE,
        page_token: str | None = None,
    ) -> SearchResult:
        """
        Search clinical trials with filters.
        
        Args:
            query: Full-text search query
            conditions: List of condition terms (e.g., ["diabetes", "obesity"])
            status: Filter by recruitment status
            study_type: Filter by study type
            phases: Filter by trial phase
            location_country: Country filter
            location_state: State/province filter
            location_city: City filter
            min_enrollment: Minimum enrollment target
            sponsor: Lead sponsor name
            start_date_from: Studies starting after this date
            start_date_to: Studies starting before this date
            page_size: Results per page (max 100)
            page_token: Token for pagination
        
        Returns:
            SearchResult with studies and pagination info
        """
        client = await self._get_client()
        
        # Build query parameters
        params: dict[str, Any] = {
            "format": "json",
            "pageSize": min(page_size, MAX_PAGE_SIZE),
            "fields": self._get_all_fields(),
        }
        
        # Build filter expression
        filters = []
        
        if query:
            params["query.term"] = query
        
        if conditions:
            params["query.cond"] = ",".join(conditions)
        
        if status:
            params["filter.overallStatus"] = ",".join(s.value for s in status)
        
        if study_type:
            params["filter.studyType"] = study_type.value
        
        if phases:
            params["filter.phase"] = ",".join(p.value for p in phases)
        
        if location_country:
            params["filter.geo"] = f"distance(0,0,10000mi)&country={location_country}"
        
        if sponsor:
            params["query.lead"] = sponsor
        
        if page_token:
            params["pageToken"] = page_token
        
        try:
            response = await client.get("/studies", params=params)
            response.raise_for_status()
            data = response.json()
            
            studies = []
            for study_data in data.get("studies", []):
                parsed = self._parse_study(study_data)
                if parsed:
                    studies.append(parsed)
            
            return SearchResult(
                total_count=data.get("totalCount", len(studies)),
                studies=studies,
                next_page_token=data.get("nextPageToken"),
            )
            
        except Exception as e:
            logger.error(f"Error searching studies: {e}")
            return SearchResult(total_count=0, studies=[])
    
    async def search_by_condition(
        self,
        condition: str,
        recruiting_only: bool = True,
        limit: int = 50,
    ) -> list[ClinicalTrialData]:
        """
        Search for recruiting trials by medical condition.
        
        Args:
            condition: Medical condition (e.g., "lung cancer", "type 2 diabetes")
            recruiting_only: Only return actively recruiting studies
            limit: Maximum number of results
        
        Returns:
            List of matching clinical trials
        """
        status = [StudyStatus.RECRUITING, StudyStatus.NOT_YET_RECRUITING] if recruiting_only else None
        
        results = await self.search_studies(
            conditions=[condition],
            status=status,
            page_size=min(limit, MAX_PAGE_SIZE),
        )
        
        return results.studies[:limit]
    
    async def get_trials_near_location(
        self,
        city: str,
        state: str | None = None,
        country: str = "United States",
        conditions: list[str] | None = None,
        radius_miles: int = 50,
    ) -> list[ClinicalTrialData]:
        """
        Find trials near a geographic location.
        
        Note: ClinicalTrials.gov API v2 has limited geo-search.
        This does a best-effort location filter.
        """
        results = await self.search_studies(
            conditions=conditions,
            location_country=country,
            status=[StudyStatus.RECRUITING],
            page_size=100,
        )
        
        # Filter by city/state in locations
        filtered = []
        city_lower = city.lower()
        state_lower = state.lower() if state else None
        
        for study in results.studies:
            for loc in study.locations:
                if loc.city and city_lower in loc.city.lower():
                    if not state_lower or (loc.state and state_lower in loc.state.lower()):
                        filtered.append(study)
                        break
        
        return filtered
    
    async def bulk_import_by_conditions(
        self,
        conditions: list[str],
        max_per_condition: int = 20,
    ) -> list[ClinicalTrialData]:
        """
        Bulk import trials for multiple conditions.
        
        Used for initial database seeding.
        """
        all_studies: dict[str, ClinicalTrialData] = {}
        
        for condition in conditions:
            logger.info(f"Importing trials for condition: {condition}")
            
            studies = await self.search_by_condition(
                condition=condition,
                recruiting_only=True,
                limit=max_per_condition,
            )
            
            for study in studies:
                # Deduplicate by NCT ID
                all_studies[study.nct_id] = study
            
            # Be nice to the API
            await asyncio.sleep(0.5)
        
        logger.info(f"Imported {len(all_studies)} unique trials")
        return list(all_studies.values())
    
    # ─────────────────────────────────────────────────────────────────────────
    # Parsing Helpers
    # ─────────────────────────────────────────────────────────────────────────
    
    def _get_all_fields(self) -> str:
        """Get list of fields to request from API."""
        return "|".join([
            "NCTId",
            "OrgStudyId",
            "BriefTitle",
            "OfficialTitle",
            "Acronym",
            "OverallStatus",
            "WhyStopped",
            "StartDate",
            "CompletionDate",
            "PrimaryCompletionDate",
            "BriefSummary",
            "DetailedDescription",
            "StudyType",
            "Phase",
            "EnrollmentCount",
            "EnrollmentType",
            "EligibilityCriteria",
            "Gender",
            "MinimumAge",
            "MaximumAge",
            "HealthyVolunteers",
            "Condition",
            "InterventionName",
            "Keyword",
            "PrimaryOutcomeMeasure",
            "SecondaryOutcomeMeasure",
            "LocationFacility",
            "LocationCity",
            "LocationState",
            "LocationCountry",
            "LocationZip",
            "LocationStatus",
            "LeadSponsorName",
            "CollaboratorName",
            "StudyFirstPostDate",
            "LastUpdatePostDate",
            "ResultsFirstPostDate",
            "HasResults",
            "CentralContactName",
            "CentralContactEMail",
            "CentralContactPhone",
            "ArmGroupLabel",
            "ArmGroupType",
            "ArmGroupDescription",
        ])
    
    def _parse_study(self, data: dict[str, Any]) -> ClinicalTrialData | None:
        """Parse API response into ClinicalTrialData."""
        try:
            # Navigate nested structure
            proto_section = data.get("protocolSection", data)
            id_module = proto_section.get("identificationModule", {})
            status_module = proto_section.get("statusModule", {})
            desc_module = proto_section.get("descriptionModule", {})
            design_module = proto_section.get("designModule", {})
            eligibility_module = proto_section.get("eligibilityModule", {})
            conditions_module = proto_section.get("conditionsModule", {})
            interventions_module = proto_section.get("armsInterventionsModule", {})
            outcomes_module = proto_section.get("outcomesModule", {})
            contacts_module = proto_section.get("contactsLocationsModule", {})
            sponsor_module = proto_section.get("sponsorCollaboratorsModule", {})
            
            # Parse eligibility
            eligibility = self._parse_eligibility(eligibility_module)
            
            # Parse locations
            locations = self._parse_locations(contacts_module.get("locations", []))
            
            # Parse contacts
            contacts = self._parse_contacts(contacts_module)
            
            # Parse arms
            arms = self._parse_arms(interventions_module.get("armGroups", []))
            
            # Parse phases
            phases = []
            for phase in design_module.get("phases", []):
                try:
                    phases.append(Phase(phase))
                except ValueError:
                    pass
            
            # Parse status
            overall_status = None
            status_str = status_module.get("overallStatus")
            if status_str:
                try:
                    overall_status = StudyStatus(status_str)
                except ValueError:
                    pass
            
            # Parse study type
            study_type = None
            type_str = design_module.get("studyType")
            if type_str:
                try:
                    study_type = StudyType(type_str)
                except ValueError:
                    pass
            
            return ClinicalTrialData(
                nct_id=id_module.get("nctId", ""),
                org_study_id=id_module.get("orgStudyIdInfo", {}).get("id"),
                brief_title=id_module.get("briefTitle", ""),
                official_title=id_module.get("officialTitle"),
                acronym=id_module.get("acronym"),
                overall_status=overall_status,
                why_stopped=status_module.get("whyStopped"),
                start_date=self._parse_date(status_module.get("startDateStruct")),
                completion_date=self._parse_date(status_module.get("completionDateStruct")),
                primary_completion_date=self._parse_date(status_module.get("primaryCompletionDateStruct")),
                brief_summary=desc_module.get("briefSummary"),
                detailed_description=desc_module.get("detailedDescription"),
                study_type=study_type,
                phases=phases,
                enrollment=design_module.get("enrollmentInfo", {}).get("count"),
                enrollment_type=design_module.get("enrollmentInfo", {}).get("type"),
                eligibility=eligibility,
                conditions=conditions_module.get("conditions", []),
                interventions=[
                    i.get("name", "") 
                    for i in interventions_module.get("interventions", [])
                ],
                keywords=conditions_module.get("keywords", []),
                arms=arms,
                primary_outcomes=[
                    o.get("measure", "") 
                    for o in outcomes_module.get("primaryOutcomes", [])
                ],
                secondary_outcomes=[
                    o.get("measure", "") 
                    for o in outcomes_module.get("secondaryOutcomes", [])
                ],
                locations=locations,
                location_countries=list(set(
                    loc.country for loc in locations if loc.country
                )),
                contacts=contacts,
                lead_sponsor=sponsor_module.get("leadSponsor", {}).get("name"),
                collaborators=[
                    c.get("name", "") 
                    for c in sponsor_module.get("collaborators", [])
                ],
                url=f"https://clinicaltrials.gov/study/{id_module.get('nctId', '')}",
                first_posted_date=self._parse_date(status_module.get("studyFirstPostDateStruct")),
                last_updated_date=self._parse_date(status_module.get("lastUpdatePostDateStruct")),
                results_first_posted_date=self._parse_date(status_module.get("resultsFirstPostDateStruct")),
                has_results=data.get("hasResults", False),
            )
            
        except Exception as e:
            logger.error(f"Error parsing study: {e}")
            return None
    
    def _parse_eligibility(self, module: dict[str, Any]) -> EligibilityCriteria:
        """Parse eligibility criteria module."""
        raw_text = module.get("eligibilityCriteria", "")
        
        # Parse inclusion/exclusion criteria from raw text
        inclusion = []
        exclusion = []
        
        if raw_text:
            lines = raw_text.split("\n")
            current_section = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                line_lower = line.lower()
                if "inclusion criteria" in line_lower:
                    current_section = "inclusion"
                elif "exclusion criteria" in line_lower:
                    current_section = "exclusion"
                elif current_section == "inclusion" and line.startswith(("-", "*", "•", "1", "2", "3", "4", "5", "6", "7", "8", "9")):
                    inclusion.append(line.lstrip("-*•0123456789. "))
                elif current_section == "exclusion" and line.startswith(("-", "*", "•", "1", "2", "3", "4", "5", "6", "7", "8", "9")):
                    exclusion.append(line.lstrip("-*•0123456789. "))
        
        # Parse age
        min_age = self._parse_age(module.get("minimumAge"))
        max_age = self._parse_age(module.get("maximumAge"))
        
        return EligibilityCriteria(
            raw_text=raw_text if raw_text else None,
            inclusion_criteria=inclusion,
            exclusion_criteria=exclusion,
            min_age=min_age,
            max_age=max_age,
            gender=module.get("sex"),
            healthy_volunteers=module.get("healthyVolunteers") == "Yes",
        )
    
    def _parse_age(self, age_str: str | None) -> int | None:
        """Parse age string like '18 Years' into integer."""
        if not age_str:
            return None
        
        try:
            # Extract number from strings like "18 Years", "65 years", "N/A"
            parts = age_str.lower().split()
            if parts and parts[0].isdigit():
                return int(parts[0])
            return None
        except:
            return None
    
    def _parse_date(self, date_struct: dict[str, Any] | None) -> datetime | None:
        """Parse date structure from API."""
        if not date_struct:
            return None
        
        try:
            date_str = date_struct.get("date")
            if not date_str:
                return None
            
            # Handle different formats: "2024-01-15", "January 2024", "2024"
            if "-" in date_str:
                return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            
            # Parse month year format
            from dateutil import parser
            return parser.parse(date_str)
            
        except Exception:
            return None
    
    def _parse_locations(self, locations: list[dict[str, Any]]) -> list[StudyLocation]:
        """Parse location data."""
        result = []
        for loc in locations:
            result.append(StudyLocation(
                facility=loc.get("facility"),
                city=loc.get("city"),
                state=loc.get("state"),
                country=loc.get("country"),
                zip_code=loc.get("zip"),
                status=loc.get("status"),
            ))
        return result
    
    def _parse_contacts(self, module: dict[str, Any]) -> list[StudyContact]:
        """Parse contact information."""
        contacts = []
        
        for contact in module.get("centralContacts", []):
            contacts.append(StudyContact(
                name=contact.get("name"),
                role=contact.get("role"),
                email=contact.get("email"),
                phone=contact.get("phone"),
            ))
        
        return contacts
    
    def _parse_arms(self, arms: list[dict[str, Any]]) -> list[StudyArm]:
        """Parse arm/treatment group data."""
        result = []
        for arm in arms:
            result.append(StudyArm(
                label=arm.get("label", "Unknown"),
                type=arm.get("type"),
                description=arm.get("description"),
                interventions=arm.get("interventionNames", []),
            ))
        return result


# ─────────────────────────────────────────────────────────────────────────────
# Service Singleton
# ─────────────────────────────────────────────────────────────────────────────

_clinical_trials_service: ClinicalTrialsService | None = None


def get_clinical_trials_service() -> ClinicalTrialsService:
    """Get or create clinical trials service instance."""
    global _clinical_trials_service
    
    if _clinical_trials_service is None:
        _clinical_trials_service = ClinicalTrialsService()
    
    return _clinical_trials_service


async def shutdown_clinical_trials_service() -> None:
    """Shutdown clinical trials service."""
    global _clinical_trials_service
    
    if _clinical_trials_service is not None:
        await _clinical_trials_service.close()
        _clinical_trials_service = None
