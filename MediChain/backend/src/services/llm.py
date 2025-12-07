"""
MediChain LLM Service

Unified interface for Google Gemini AI with:
- Text generation
- Structured data extraction
- Embeddings generation
- Token counting and cost estimation
"""

import json
from typing import Any, TypeVar

import google.generativeai as genai
import structlog
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import settings

logger = structlog.get_logger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMService:
    """
    Unified LLM service for MediChain.
    
    Provides:
    - Text generation with Gemini Pro
    - Structured JSON extraction
    - Text embeddings for semantic search
    - Retry logic and error handling
    """
    
    def __init__(self):
        """Initialize the LLM service with Gemini."""
        self.logger = logger.bind(service="LLMService")
        self._configure_genai()
        self._model = None
        self._embedding_model = None
    
    def _configure_genai(self):
        """Configure the Google Generative AI client."""
        api_key = settings.google_api_key.get_secret_value()
        if api_key and api_key != "...":
            genai.configure(api_key=api_key)
            self.logger.info("Gemini API configured")
        else:
            self.logger.warning("Gemini API key not configured - using mock responses")
    
    @property
    def model(self) -> genai.GenerativeModel:
        """Lazy-load the generative model."""
        if self._model is None:
            self._model = genai.GenerativeModel(
                model_name=settings.gemini_model,
                generation_config=genai.GenerationConfig(
                    temperature=settings.gemini_temperature,
                    max_output_tokens=settings.gemini_max_tokens,
                    top_p=0.95,
                    top_k=40,
                ),
                safety_settings={
                    "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                    "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
                    "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                    "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
                },
            )
        return self._model
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def generate_text(
        self,
        prompt: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
        system_instruction: str | None = None,
    ) -> str:
        """
        Generate text using Gemini.
        
        Args:
            prompt: The input prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0-2)
            system_instruction: System-level instruction
            
        Returns:
            Generated text response
        """
        try:
            # Build generation config
            config = {}
            if max_tokens:
                config["max_output_tokens"] = max_tokens
            if temperature is not None:
                config["temperature"] = temperature
            
            # Create model with optional system instruction
            if system_instruction:
                model = genai.GenerativeModel(
                    model_name=settings.gemini_model,
                    system_instruction=system_instruction,
                    generation_config=genai.GenerationConfig(**config) if config else None,
                )
            else:
                model = self.model
            
            # Generate response
            response = await model.generate_content_async(prompt)
            
            if response.parts:
                return response.text
            else:
                self.logger.warning("Empty response from Gemini")
                return ""
                
        except Exception as e:
            self.logger.error("Text generation failed", error=str(e))
            # Return mock response for demo if API fails
            if "API key" in str(e) or "quota" in str(e).lower():
                return self._mock_response(prompt)
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def extract_structured_data(
        self,
        prompt: str,
        schema: type[T],
    ) -> T:
        """
        Extract structured data using Gemini with JSON output.
        
        Args:
            prompt: The extraction prompt
            schema: Pydantic model class for validation
            
        Returns:
            Validated Pydantic model instance
        """
        # Add JSON instruction to prompt
        json_prompt = f"""{prompt}

IMPORTANT: Return ONLY valid JSON that matches this schema:
{json.dumps(schema.model_json_schema(), indent=2)}

Return ONLY the JSON object, no markdown code blocks or additional text."""

        try:
            response = await self.generate_text(
                prompt=json_prompt,
                temperature=0.2,  # Lower temperature for more consistent JSON
            )
            
            # Clean response (remove markdown code blocks if present)
            cleaned = response.strip()
            if cleaned.startswith("```"):
                # Remove markdown code blocks
                lines = cleaned.split("\n")
                cleaned = "\n".join(
                    line for line in lines 
                    if not line.startswith("```")
                )
            
            # Parse JSON
            data = json.loads(cleaned)
            
            # Validate with Pydantic
            return schema.model_validate(data)
            
        except json.JSONDecodeError as e:
            self.logger.error("JSON parsing failed", error=str(e), response=response[:200])
            # Return empty model
            return schema()
        except Exception as e:
            self.logger.error("Structured extraction failed", error=str(e))
            return schema()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def generate_embedding(
        self,
        text: str,
        task_type: str = "retrieval_document",
    ) -> list[float]:
        """
        Generate text embedding using Gemini embedding model.
        
        Args:
            text: Text to embed
            task_type: Type of embedding task
                - "retrieval_document": For documents to be searched
                - "retrieval_query": For search queries
                - "semantic_similarity": For comparing texts
                
        Returns:
            List of floats representing the embedding vector
        """
        try:
            result = genai.embed_content(
                model=f"models/{settings.gemini_embedding_model}",
                content=text,
                task_type=task_type,
            )
            
            return result["embedding"]
            
        except Exception as e:
            self.logger.error("Embedding generation failed", error=str(e))
            # Return zero vector for demo
            return [0.0] * settings.embedding_dimension
    
    async def generate_embeddings_batch(
        self,
        texts: list[str],
        task_type: str = "retrieval_document",
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple texts.
        
        More efficient than calling generate_embedding in a loop.
        """
        try:
            result = genai.embed_content(
                model=f"models/{settings.gemini_embedding_model}",
                content=texts,
                task_type=task_type,
            )
            
            return result["embedding"]
            
        except Exception as e:
            self.logger.error("Batch embedding failed", error=str(e))
            return [[0.0] * settings.embedding_dimension for _ in texts]
    
    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text.
        
        Useful for cost estimation and context window management.
        """
        try:
            return self.model.count_tokens(text).total_tokens
        except Exception:
            # Rough estimate: ~4 chars per token
            return len(text) // 4
    
    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """
        Estimate API cost in USD.
        
        Gemini 1.5 Pro pricing (as of 2024):
        - Input: $0.00125 per 1K tokens (up to 128K context)
        - Output: $0.00375 per 1K tokens
        """
        input_cost = (input_tokens / 1000) * 0.00125
        output_cost = (output_tokens / 1000) * 0.00375
        return input_cost + output_cost
    
    def _mock_response(self, prompt: str) -> str:
        """Generate mock response for demo when API is unavailable."""
        if "consent form" in prompt.lower():
            return """INFORMED CONSENT FOR CLINICAL TRIAL PARTICIPATION

STUDY TITLE: [Trial Title]
NCT ID: [NCT Number]

1. PURPOSE OF THE STUDY
This clinical trial aims to evaluate new treatment approaches.

2. PROCEDURES
You will undergo standard assessments as part of this study.

3. RISKS AND BENEFITS
All medical procedures carry some risk. Benefits may include access to new treatments.

4. CONFIDENTIALITY
Your information will be protected according to HIPAA regulations.

5. VOLUNTARY PARTICIPATION
Your participation is completely voluntary.

6. COMPENSATION
You may receive ASI token rewards for verified participation.

SIGNATURE: _________________________ DATE: _____________
"""
        elif "extract" in prompt.lower() or "json" in prompt.lower():
            return json.dumps({
                "age_range": "45-55",
                "gender": "female",
                "conditions": ["type 2 diabetes"],
                "biomarkers": {},
                "medications": [],
                "allergies": [],
                "procedures_history": [],
            })
        else:
            return "This is a mock response. Please configure your Gemini API key for full functionality."
