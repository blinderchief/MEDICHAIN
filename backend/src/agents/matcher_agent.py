"""
MediChain Matcher Agent

The core AI engine for clinical trial matching using a hybrid
neuro-symbolic approach: Gemini for NLP + MeTTa-style rules for logic.

This is where the magic happens ✨
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

import structlog

from src.config import settings
from src.models.match import (
    CriteriaCheck,
    MatchConfidenceLevel,
    MatchCreate,
    MatchReasoning,
)
from src.models.patient import PatientProfile
from src.models.trial import Trial
from src.services.llm import LLMService
from src.services.vector_db import VectorDBService

logger = structlog.get_logger(__name__)


@dataclass
class EligibilityResult:
    """Result of eligibility evaluation."""
    is_eligible: bool
    confidence: float
    inclusion_passed: list[CriteriaCheck]
    exclusion_passed: list[CriteriaCheck]
    metta_reasoning: str
    explanation: str


class MeTTaReasoner:
    """
    MeTTa-style symbolic reasoning engine for clinical trial matching.
    
    Implements logical rules for:
    - Age range eligibility
    - Gender eligibility
    - Biomarker requirements
    - Condition matching
    - Contraindication checking
    - Diversity bonuses
    
    NOTE: This is a Python implementation of MeTTa-style reasoning.
    In production, integrate with actual OpenCog Hyperon/MeTTa interpreter.
    """
    
    def __init__(self):
        self.logger = logger.bind(component="MeTTaReasoner")
        self._rules_applied = []
    
    def reason(
        self,
        patient: PatientProfile,
        trial: Trial,
    ) -> tuple[bool, float, str]:
        """
        Apply MeTTa-style reasoning rules to determine eligibility.
        
        Returns:
            Tuple of (is_eligible, confidence_score, reasoning_trace)
        """
        self._rules_applied = []
        scores = []
        
        # Rule 1: Age eligibility
        age_result = self._rule_age_in_range(patient, trial)
        scores.append(("age_eligibility", age_result))
        
        # Rule 2: Gender eligibility
        gender_result = self._rule_gender_match(patient, trial)
        scores.append(("gender_eligibility", gender_result))
        
        # Rule 3: Required biomarkers
        biomarker_result = self._rule_has_biomarkers(patient, trial)
        scores.append(("biomarker_match", biomarker_result))
        
        # Rule 4: Target condition match
        condition_result = self._rule_condition_match(patient, trial)
        scores.append(("condition_match", condition_result))
        
        # Rule 5: No contraindications (exclusion criteria)
        contraindication_result = self._rule_no_contraindications(patient, trial)
        scores.append(("no_contraindications", contraindication_result))
        
        # Calculate overall eligibility
        critical_rules = ["age_eligibility", "gender_eligibility", "no_contraindications"]
        critical_scores = [s for name, s in scores if name in critical_rules]
        
        # Must pass all critical rules with at least 0.5 confidence
        if any(s < 0.5 for s in critical_scores):
            is_eligible = False
            confidence = sum(scores_val for _, scores_val in scores) / len(scores) * 0.3
        else:
            is_eligible = True
            # Weighted average
            weights = {
                "age_eligibility": 0.15,
                "gender_eligibility": 0.10,
                "biomarker_match": 0.30,
                "condition_match": 0.30,
                "no_contraindications": 0.15,
            }
            confidence = sum(
                weights.get(name, 0.2) * score 
                for name, score in scores
            )
        
        # Generate MeTTa-style reasoning trace
        reasoning = self._generate_metta_trace(patient, trial, scores)
        
        return is_eligible, min(confidence * 100, 100.0), reasoning
    
    def _rule_age_in_range(self, patient: PatientProfile, trial: Trial) -> float:
        """
        MeTTa Rule: (age-in-range ?patient ?trial)
        
        Check if patient age falls within trial requirements.
        """
        if not patient.age_range:
            self._rules_applied.append(
                f"(age-in-range UNKNOWN) -> 0.5 ; No patient age provided"
            )
            return 0.5  # Unknown, neutral score
        
        # Parse age range (e.g., "45-55" -> 45, 55)
        try:
            if "-" in patient.age_range:
                parts = patient.age_range.replace("+", "").split("-")
                patient_age_min = int(parts[0])
                patient_age_max = int(parts[1]) if len(parts) > 1 else 120
            elif "+" in patient.age_range:
                patient_age_min = int(patient.age_range.replace("+", ""))
                patient_age_max = 120
            else:
                patient_age_min = patient_age_max = int(patient.age_range)
        except ValueError:
            self._rules_applied.append(
                f"(age-in-range PARSE_ERROR) -> 0.5 ; Could not parse age: {patient.age_range}"
            )
            return 0.5
        
        trial_min = trial.age_min or 0
        trial_max = trial.age_max or 120
        
        # Check overlap
        if patient_age_max < trial_min or patient_age_min > trial_max:
            self._rules_applied.append(
                f"(age-in-range (Patient {patient.age_range}) (Trial {trial_min}-{trial_max})) -> False ; Out of range"
            )
            return 0.0
        
        # Calculate overlap percentage
        overlap_min = max(patient_age_min, trial_min)
        overlap_max = min(patient_age_max, trial_max)
        patient_range = patient_age_max - patient_age_min + 1
        overlap_range = overlap_max - overlap_min + 1
        overlap_pct = overlap_range / patient_range if patient_range > 0 else 1.0
        
        self._rules_applied.append(
            f"(age-in-range (Patient {patient.age_range}) (Trial {trial_min}-{trial_max})) -> {overlap_pct:.2f}"
        )
        return overlap_pct
    
    def _rule_gender_match(self, patient: PatientProfile, trial: Trial) -> float:
        """
        MeTTa Rule: (gender-eligible ?patient ?trial)
        """
        trial_gender = trial.gender_eligibility.lower()
        
        if trial_gender == "all":
            self._rules_applied.append(
                f"(gender-eligible {patient.gender} all) -> True"
            )
            return 1.0
        
        if not patient.gender:
            self._rules_applied.append(
                f"(gender-eligible UNKNOWN {trial_gender}) -> 0.5 ; No patient gender"
            )
            return 0.5
        
        patient_gender = patient.gender.value if hasattr(patient.gender, 'value') else str(patient.gender)
        
        if patient_gender.lower() == trial_gender:
            self._rules_applied.append(
                f"(gender-eligible {patient_gender} {trial_gender}) -> True"
            )
            return 1.0
        
        self._rules_applied.append(
            f"(gender-eligible {patient_gender} {trial_gender}) -> False ; Mismatch"
        )
        return 0.0
    
    def _rule_has_biomarkers(self, patient: PatientProfile, trial: Trial) -> float:
        """
        MeTTa Rule: (has-biomarker ?patient ?trial ?biomarker)
        """
        required = trial.required_biomarkers
        if not required:
            self._rules_applied.append(
                "(has-biomarkers NONE_REQUIRED) -> True"
            )
            return 1.0
        
        patient_biomarkers = {k.lower(): str(v).lower() for k, v in patient.biomarkers.items()}
        
        matched = 0
        total = len(required)
        
        for biomarker, required_value in required.items():
            biomarker_lower = biomarker.lower()
            required_lower = str(required_value).lower()
            
            if biomarker_lower in patient_biomarkers:
                patient_value = patient_biomarkers[biomarker_lower]
                
                # Check for match (handle positive/negative, numeric comparisons)
                if self._biomarker_matches(patient_value, required_lower):
                    matched += 1
                    self._rules_applied.append(
                        f"(has-biomarker {biomarker}={patient_value} required={required_lower}) -> True"
                    )
                else:
                    self._rules_applied.append(
                        f"(has-biomarker {biomarker}={patient_value} required={required_lower}) -> False ; Value mismatch"
                    )
            else:
                self._rules_applied.append(
                    f"(has-biomarker {biomarker} MISSING) -> False ; Not in patient profile"
                )
        
        score = matched / total if total > 0 else 1.0
        return score
    
    def _biomarker_matches(self, patient_value: str, required_value: str) -> bool:
        """Check if patient biomarker matches requirement."""
        # Exact match
        if patient_value == required_value:
            return True
        
        # Positive/negative equivalents
        positive_terms = {"positive", "pos", "+", "yes", "detected", "present"}
        negative_terms = {"negative", "neg", "-", "no", "not detected", "absent"}
        
        if patient_value in positive_terms and required_value in positive_terms:
            return True
        if patient_value in negative_terms and required_value in negative_terms:
            return True
        
        # Percentage comparisons (e.g., ">=50%")
        if ">=" in required_value or "<=" in required_value or ">" in required_value or "<" in required_value:
            try:
                patient_num = float(patient_value.replace("%", "").strip())
                if ">=" in required_value:
                    threshold = float(required_value.replace(">=", "").replace("%", "").strip())
                    return patient_num >= threshold
                elif "<=" in required_value:
                    threshold = float(required_value.replace("<=", "").replace("%", "").strip())
                    return patient_num <= threshold
            except ValueError:
                pass
        
        return False
    
    def _rule_condition_match(self, patient: PatientProfile, trial: Trial) -> float:
        """
        MeTTa Rule: (condition-match ?patient ?trial)
        """
        trial_conditions = [c.lower() for c in trial.conditions]
        patient_conditions = [c.lower() for c in patient.conditions]
        
        if not trial_conditions:
            self._rules_applied.append(
                "(condition-match NO_TRIAL_CONDITIONS) -> 0.5 ; Trial has no specific conditions"
            )
            return 0.5
        
        if not patient_conditions:
            self._rules_applied.append(
                "(condition-match NO_PATIENT_CONDITIONS) -> 0.0 ; Patient has no conditions listed"
            )
            return 0.0
        
        # Find matches (partial string matching for medical terms)
        matched = 0
        for trial_cond in trial_conditions:
            for patient_cond in patient_conditions:
                if self._condition_similar(trial_cond, patient_cond):
                    matched += 1
                    self._rules_applied.append(
                        f"(condition-match '{patient_cond}' ~ '{trial_cond}') -> True"
                    )
                    break
        
        score = matched / len(trial_conditions)
        if matched == 0:
            self._rules_applied.append(
                f"(condition-match NONE) -> 0.0 ; No matching conditions"
            )
        
        return score
    
    def _condition_similar(self, cond1: str, cond2: str) -> bool:
        """Check if two conditions are similar (handles medical term variations)."""
        # Exact match
        if cond1 == cond2:
            return True
        
        # Check if one contains the other
        if cond1 in cond2 or cond2 in cond1:
            return True
        
        # Common medical term variations
        variations = {
            "nsclc": ["non-small cell lung cancer", "non small cell lung cancer"],
            "sclc": ["small cell lung cancer"],
            "t2d": ["type 2 diabetes", "diabetes type 2", "diabetes mellitus type 2"],
            "t1d": ["type 1 diabetes", "diabetes type 1", "diabetes mellitus type 1"],
            "crc": ["colorectal cancer", "colon cancer", "rectal cancer"],
            "hcc": ["hepatocellular carcinoma", "liver cancer"],
            "rcc": ["renal cell carcinoma", "kidney cancer"],
        }
        
        for abbrev, full_forms in variations.items():
            if cond1 == abbrev or cond1 in full_forms:
                if cond2 == abbrev or cond2 in full_forms:
                    return True
        
        # Word overlap check
        words1 = set(cond1.split())
        words2 = set(cond2.split())
        common_words = words1 & words2
        # Exclude common medical stop words
        stop_words = {"disease", "disorder", "syndrome", "type", "stage", "cancer", "chronic", "acute"}
        meaningful_common = common_words - stop_words
        
        if len(meaningful_common) >= 1 and len(common_words) >= 2:
            return True
        
        return False
    
    def _rule_no_contraindications(self, patient: PatientProfile, trial: Trial) -> float:
        """
        MeTTa Rule: (no-contraindication ?patient ?trial)
        """
        # Check excluded conditions
        excluded_conditions = [c.lower() for c in trial.excluded_conditions]
        patient_conditions = [c.lower() for c in patient.conditions]
        
        for excl in excluded_conditions:
            for patient_cond in patient_conditions:
                if self._condition_similar(excl, patient_cond):
                    self._rules_applied.append(
                        f"(no-contraindication FAIL) -> False ; Patient has excluded condition: {patient_cond}"
                    )
                    return 0.0
        
        # Check excluded medications
        excluded_meds = [m.lower() for m in trial.excluded_medications]
        patient_meds = [m.lower() for m in patient.medications]
        
        for excl in excluded_meds:
            for patient_med in patient_meds:
                if excl in patient_med or patient_med in excl:
                    self._rules_applied.append(
                        f"(no-contraindication FAIL) -> False ; Patient takes excluded medication: {patient_med}"
                    )
                    return 0.0
        
        self._rules_applied.append(
            "(no-contraindication PASS) -> True ; No contraindications found"
        )
        return 1.0
    
    def _generate_metta_trace(
        self,
        patient: PatientProfile,
        trial: Trial,
        scores: list[tuple[str, float]],
    ) -> str:
        """Generate MeTTa-style reasoning trace for audit."""
        lines = [
            ";; MediChain MeTTa Reasoning Trace",
            f";; Patient: {patient.age_range or 'unknown'} {patient.gender or 'unknown'}",
            f";; Trial: {trial.nct_id}",
            ";; Timestamp: " + datetime.utcnow().isoformat(),
            "",
            ";; === Rules Applied ===",
        ]
        
        for rule in self._rules_applied:
            lines.append(f"  {rule}")
        
        lines.extend([
            "",
            ";; === Final Scores ===",
        ])
        
        for name, score in scores:
            lines.append(f"  ({name}) -> {score:.3f}")
        
        final_eligible = all(s >= 0.5 for name, s in scores if name in ["age_eligibility", "gender_eligibility", "no_contraindications"])
        lines.extend([
            "",
            f";; === Conclusion ===",
            f"(eligible Patient Trial) -> {final_eligible}",
        ])
        
        return "\n".join(lines)
    
    def calculate_diversity_bonus(self, patient: PatientProfile) -> tuple[float, list[str]]:
        """
        Calculate diversity bonus for underrepresented groups.
        
        MeTTa Rule: (diversity-bonus ?patient) -> float
        
        Bonuses for:
        - Underrepresented ethnicities: +5%
        - Female in historically male-dominated trials: +3%
        - Rural location: +3%
        - Age 65+: +2%
        """
        bonus = 0.0
        factors = []
        
        underrepresented_ethnicities = {
            "african_american", "hispanic", "native_american", "pacific_islander"
        }
        
        if patient.ethnicity:
            ethnicity_val = patient.ethnicity.value if hasattr(patient.ethnicity, 'value') else str(patient.ethnicity)
            if ethnicity_val.lower() in underrepresented_ethnicities:
                bonus += 5.0
                factors.append(f"underrepresented_ethnicity:{ethnicity_val}")
                self._rules_applied.append(
                    f"(diversity-bonus ethnicity {ethnicity_val}) -> +5%"
                )
        
        if patient.gender:
            gender_val = patient.gender.value if hasattr(patient.gender, 'value') else str(patient.gender)
            if gender_val.lower() == "female":
                bonus += 3.0
                factors.append("gender:female")
                self._rules_applied.append(
                    "(diversity-bonus gender female) -> +3%"
                )
        
        if patient.location_region:
            rural_indicators = ["rural", "remote", "countryside"]
            if any(ind in patient.location_region.lower() for ind in rural_indicators):
                bonus += 3.0
                factors.append("location:rural")
                self._rules_applied.append(
                    "(diversity-bonus location rural) -> +3%"
                )
        
        if patient.age_range and "65" in patient.age_range:
            bonus += 2.0
            factors.append("age:65+")
            self._rules_applied.append(
                "(diversity-bonus age 65+) -> +2%"
            )
        
        return min(bonus, 15.0), factors  # Cap at 15%


class MatcherAgent:
    """
    Matcher Agent for clinical trial matching.
    
    Implements a hybrid neuro-symbolic approach:
    1. Semantic similarity via embeddings (Gemini/Qdrant)
    2. Rule-based reasoning via MeTTa-style logic
    3. Natural language explanation via Gemini
    
    This is the AGI-ready architecture for clinical trial matching.
    """
    
    def __init__(
        self,
        llm_service: LLMService | None = None,
        vector_service: VectorDBService | None = None,
    ):
        """Initialize the Matcher Agent."""
        self.llm = llm_service or LLMService()
        self.vector_db = vector_service or VectorDBService()
        self.metta = MeTTaReasoner()
        self.logger = logger.bind(agent="MatcherAgent")
    
    async def find_matches(
        self,
        patient_id: UUID,
        patient_profile: PatientProfile,
        trials: list[Trial],
        min_confidence: float = 40.0,
        top_k: int = 10,
    ) -> list[MatchCreate]:
        """
        Find matching trials for a patient.
        
        Process:
        1. Generate patient embedding
        2. Semantic search for candidate trials (if using vector DB)
        3. Apply MeTTa rules for precise matching
        4. Generate explanations with Gemini
        5. Return ranked matches
        
        Args:
            patient_id: Patient UUID
            patient_profile: Patient's medical profile
            trials: List of trials to match against
            min_confidence: Minimum confidence threshold
            top_k: Maximum number of matches to return
            
        Returns:
            List of MatchCreate objects, sorted by confidence
        """
        self.logger.info(
            "Finding matches for patient",
            patient_id=str(patient_id),
            trials_count=len(trials),
        )
        
        matches = []
        
        # Process trials in parallel for speed
        tasks = [
            self._evaluate_trial(patient_id, patient_profile, trial)
            for trial in trials
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                self.logger.error("Match evaluation failed", error=str(result))
                continue
            if result and result.confidence_score >= min_confidence:
                matches.append(result)
        
        # Sort by confidence descending
        matches.sort(key=lambda m: m.confidence_score, reverse=True)
        
        self.logger.info(
            "Matching complete",
            total_matches=len(matches),
            above_threshold=len([m for m in matches if m.confidence_score >= min_confidence]),
        )
        
        return matches[:top_k]
    
    async def _evaluate_trial(
        self,
        patient_id: UUID,
        patient_profile: PatientProfile,
        trial: Trial,
    ) -> MatchCreate | None:
        """
        Evaluate a single trial for a patient.
        
        Combines MeTTa reasoning with Gemini explanation.
        """
        try:
            # Step 1: MeTTa symbolic reasoning
            is_eligible, base_confidence, metta_reasoning = self.metta.reason(
                patient_profile, trial
            )
            
            # Step 2: Calculate diversity bonus
            diversity_bonus, diversity_factors = self.metta.calculate_diversity_bonus(
                patient_profile
            )
            
            # Step 3: Adjust confidence
            final_confidence = min(base_confidence + diversity_bonus, 100.0)
            
            # Step 4: Generate natural language explanation
            explanation = await self._generate_explanation(
                patient_profile, trial, is_eligible, final_confidence, metta_reasoning
            )
            
            # Step 5: Build criteria checks
            inclusion_checks = self._build_inclusion_checks(patient_profile, trial)
            exclusion_checks = self._build_exclusion_checks(patient_profile, trial)
            
            # Step 6: Determine confidence level
            confidence_level = self._get_confidence_level(final_confidence)
            
            return MatchCreate(
                patient_id=patient_id,
                trial_id=trial.id,
                confidence_score=final_confidence,
                matching_criteria={
                    "is_eligible": is_eligible,
                    "base_confidence": base_confidence,
                    "diversity_bonus": diversity_bonus,
                    "confidence_level": confidence_level.value,
                },
                metta_reasoning=metta_reasoning,
                gemini_explanation=explanation,
                inclusion_checks=[c.model_dump() for c in inclusion_checks],
                exclusion_checks=[c.model_dump() for c in exclusion_checks],
                diversity_bonus=diversity_bonus,
                diversity_factors=diversity_factors,
                distance_score=0.0,  # TODO: Implement location-based scoring
                nearest_site=None,
            )
            
        except Exception as e:
            self.logger.error(
                "Trial evaluation failed",
                trial_id=str(trial.id),
                error=str(e),
            )
            return None
    
    async def _generate_explanation(
        self,
        patient: PatientProfile,
        trial: Trial,
        is_eligible: bool,
        confidence: float,
        metta_reasoning: str,
    ) -> str:
        """Generate natural language explanation using Gemini."""
        prompt = f"""You are a clinical trial matching expert. Generate a clear, empathetic explanation
for why this patient {'is' if is_eligible else 'is not'} a good match for this clinical trial.

PATIENT PROFILE:
- Age Range: {patient.age_range or 'Not provided'}
- Gender: {patient.gender or 'Not provided'}
- Conditions: {', '.join(patient.conditions) if patient.conditions else 'None listed'}
- Biomarkers: {patient.biomarkers if patient.biomarkers else 'None listed'}
- Current Medications: {', '.join(patient.medications) if patient.medications else 'None listed'}

CLINICAL TRIAL:
- ID: {trial.nct_id}
- Title: {trial.title}
- Phase: {trial.phase}
- Target Conditions: {', '.join(trial.conditions)}
- Age Requirement: {trial.age_min or 0}-{trial.age_max or 120} years
- Gender: {trial.gender_eligibility}
- Required Biomarkers: {trial.required_biomarkers if trial.required_biomarkers else 'None'}

MATCHING ANALYSIS (from symbolic reasoning):
{metta_reasoning[:1000]}

MATCH CONFIDENCE: {confidence:.1f}%

Generate a 2-3 sentence explanation that:
1. Summarizes the key matching factors
2. Highlights any concerns or strengths
3. Is written in patient-friendly language

Explanation:"""

        try:
            response = await self.llm.generate_text(prompt, max_tokens=300)
            return response.strip()
        except Exception as e:
            self.logger.warning("Failed to generate explanation", error=str(e))
            return f"This trial has a {confidence:.0f}% match confidence based on your medical profile."
    
    def _build_inclusion_checks(
        self,
        patient: PatientProfile,
        trial: Trial,
    ) -> list[CriteriaCheck]:
        """Build inclusion criteria check results."""
        checks = []
        
        # Age check
        checks.append(CriteriaCheck(
            criterion=f"Age between {trial.age_min or 0} and {trial.age_max or 120}",
            passed=self._check_age(patient.age_range, trial.age_min, trial.age_max),
            value=patient.age_range,
            required=f"{trial.age_min or 0}-{trial.age_max or 120}",
            reasoning="Age range overlap check",
        ))
        
        # Condition check
        condition_match = any(
            self.metta._condition_similar(tc.lower(), pc.lower())
            for tc in trial.conditions
            for pc in patient.conditions
        ) if trial.conditions and patient.conditions else False
        
        checks.append(CriteriaCheck(
            criterion=f"Has target condition: {', '.join(trial.conditions[:3])}",
            passed=condition_match,
            value=patient.conditions[:3] if patient.conditions else [],
            required=trial.conditions[:3],
            reasoning="Condition similarity check",
        ))
        
        # Biomarker checks
        for biomarker, required_value in trial.required_biomarkers.items():
            patient_value = patient.biomarkers.get(biomarker.lower()) or patient.biomarkers.get(biomarker)
            passed = self.metta._biomarker_matches(
                str(patient_value).lower() if patient_value else "",
                str(required_value).lower()
            ) if patient_value else False
            
            checks.append(CriteriaCheck(
                criterion=f"Biomarker {biomarker}: {required_value}",
                passed=passed,
                value=patient_value,
                required=required_value,
                reasoning=f"Biomarker {'match' if passed else 'mismatch or missing'}",
            ))
        
        return checks
    
    def _build_exclusion_checks(
        self,
        patient: PatientProfile,
        trial: Trial,
    ) -> list[CriteriaCheck]:
        """Build exclusion criteria check results."""
        checks = []
        
        # Excluded conditions
        for excl_cond in trial.excluded_conditions[:5]:  # Limit to 5 for display
            has_condition = any(
                self.metta._condition_similar(excl_cond.lower(), pc.lower())
                for pc in patient.conditions
            ) if patient.conditions else False
            
            checks.append(CriteriaCheck(
                criterion=f"Does NOT have: {excl_cond}",
                passed=not has_condition,  # Passed if patient doesn't have it
                value="Present" if has_condition else "Not present",
                required="Must not have",
                reasoning="Exclusion criterion check",
            ))
        
        # Excluded medications
        for excl_med in trial.excluded_medications[:5]:
            takes_medication = any(
                excl_med.lower() in pm.lower() or pm.lower() in excl_med.lower()
                for pm in patient.medications
            ) if patient.medications else False
            
            checks.append(CriteriaCheck(
                criterion=f"NOT taking: {excl_med}",
                passed=not takes_medication,
                value="Taking" if takes_medication else "Not taking",
                required="Must not take",
                reasoning="Medication exclusion check",
            ))
        
        return checks
    
    def _check_age(
        self,
        patient_age_range: str | None,
        trial_min: int | None,
        trial_max: int | None,
    ) -> bool:
        """Check if patient age falls within trial requirements."""
        if not patient_age_range:
            return True  # Unknown, assume eligible
        
        try:
            if "-" in patient_age_range:
                parts = patient_age_range.replace("+", "").split("-")
                patient_min = int(parts[0])
                patient_max = int(parts[1]) if len(parts) > 1 else 120
            elif "+" in patient_age_range:
                patient_min = int(patient_age_range.replace("+", ""))
                patient_max = 120
            else:
                patient_min = patient_max = int(patient_age_range)
            
            t_min = trial_min or 0
            t_max = trial_max or 120
            
            # Check for overlap
            return not (patient_max < t_min or patient_min > t_max)
        except ValueError:
            return True  # Parse error, assume eligible
    
    def _get_confidence_level(self, confidence: float) -> MatchConfidenceLevel:
        """Convert confidence score to level."""
        if confidence >= 80:
            return MatchConfidenceLevel.HIGH
        elif confidence >= 60:
            return MatchConfidenceLevel.MEDIUM
        elif confidence >= 40:
            return MatchConfidenceLevel.LOW
        else:
            return MatchConfidenceLevel.MARGINAL
    
    async def semantic_search_trials(
        self,
        patient_profile: PatientProfile,
        top_k: int = 50,
    ) -> list[str]:
        """
        Perform semantic search to find candidate trials.
        
        Uses vector similarity to pre-filter trials before
        applying rule-based matching.
        
        Returns list of trial embedding IDs.
        """
        # Generate patient embedding
        from src.agents.patient_agent import PatientAgent
        patient_agent = PatientAgent(self.llm)
        patient_embedding = await patient_agent.generate_embedding(patient_profile)
        
        # Search Qdrant
        results = await self.vector_db.search(
            collection_name=settings.qdrant_collection_name,
            query_vector=patient_embedding,
            limit=top_k,
        )
        
        return [r["id"] for r in results]
