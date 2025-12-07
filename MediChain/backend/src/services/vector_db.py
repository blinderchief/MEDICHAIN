"""
MediChain Vector Database Service

Unified interface for vector operations supporting:
- Qdrant (production)
- FAISS (local development)
- In-memory (testing)
"""

from typing import Any
from uuid import uuid4

import structlog

from src.config import settings

logger = structlog.get_logger(__name__)


class VectorDBService:
    """
    Vector database service for semantic search.
    
    Supports:
    - Qdrant Cloud/Self-hosted (recommended for production)
    - FAISS (local development)
    - In-memory mock (testing)
    
    Features:
    - Trial embeddings storage
    - Patient-trial similarity search
    - Hybrid search (dense + sparse)
    """
    
    def __init__(self, use_mock: bool = False):
        """Initialize the vector database service."""
        self.logger = logger.bind(service="VectorDBService")
        self._client = None
        self._use_mock = use_mock or settings.qdrant_url == "http://localhost:6333"
        self._mock_data: dict[str, list[dict]] = {}
    
    @property
    def client(self):
        """Lazy-load Qdrant client."""
        if self._client is None and not self._use_mock:
            try:
                from qdrant_client import QdrantClient
                
                if settings.qdrant_api_key:
                    self._client = QdrantClient(
                        url=settings.qdrant_url,
                        api_key=settings.qdrant_api_key.get_secret_value(),
                    )
                else:
                    self._client = QdrantClient(url=settings.qdrant_url)
                    
                self.logger.info("Qdrant client connected", url=settings.qdrant_url)
            except Exception as e:
                self.logger.warning(
                    "Qdrant connection failed, using mock",
                    error=str(e),
                )
                self._use_mock = True
        
        return self._client
    
    async def create_collection(
        self,
        collection_name: str,
        vector_size: int | None = None,
        distance: str = "Cosine",
    ) -> bool:
        """
        Create a new collection for storing vectors.
        
        Args:
            collection_name: Name of the collection
            vector_size: Dimension of vectors
            distance: Distance metric (Cosine, Euclid, Dot)
            
        Returns:
            True if successful
        """
        vector_size = vector_size or settings.embedding_dimension
        
        if self._use_mock:
            self._mock_data[collection_name] = []
            self.logger.info("Created mock collection", name=collection_name)
            return True
        
        try:
            from qdrant_client.models import Distance, VectorParams
            
            distance_map = {
                "Cosine": Distance.COSINE,
                "Euclid": Distance.EUCLID,
                "Dot": Distance.DOT,
            }
            
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=distance_map.get(distance, Distance.COSINE),
                ),
            )
            
            self.logger.info(
                "Created Qdrant collection",
                name=collection_name,
                vector_size=vector_size,
            )
            return True
            
        except Exception as e:
            if "already exists" in str(e).lower():
                self.logger.info("Collection already exists", name=collection_name)
                return True
            self.logger.error("Failed to create collection", error=str(e))
            return False
    
    async def upsert(
        self,
        collection_name: str,
        points: list[dict[str, Any]],
    ) -> bool:
        """
        Insert or update vectors.
        
        Args:
            collection_name: Target collection
            points: List of dicts with 'id', 'vector', and optional 'payload'
            
        Returns:
            True if successful
        """
        if self._use_mock:
            if collection_name not in self._mock_data:
                self._mock_data[collection_name] = []
            
            # Update or insert
            existing_ids = {p["id"] for p in self._mock_data[collection_name]}
            for point in points:
                if point["id"] in existing_ids:
                    # Update
                    self._mock_data[collection_name] = [
                        point if p["id"] == point["id"] else p
                        for p in self._mock_data[collection_name]
                    ]
                else:
                    # Insert
                    self._mock_data[collection_name].append(point)
            
            self.logger.debug("Upserted to mock", count=len(points))
            return True
        
        try:
            from qdrant_client.models import PointStruct
            
            qdrant_points = [
                PointStruct(
                    id=str(p["id"]),
                    vector=p["vector"],
                    payload=p.get("payload", {}),
                )
                for p in points
            ]
            
            self.client.upsert(
                collection_name=collection_name,
                points=qdrant_points,
            )
            
            self.logger.debug("Upserted to Qdrant", count=len(points))
            return True
            
        except Exception as e:
            self.logger.error("Upsert failed", error=str(e))
            return False
    
    async def search(
        self,
        collection_name: str,
        query_vector: list[float],
        limit: int = 10,
        score_threshold: float | None = None,
        filter_conditions: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Search for similar vectors.
        
        Args:
            collection_name: Collection to search
            query_vector: Query embedding
            limit: Maximum results
            score_threshold: Minimum similarity score
            filter_conditions: Metadata filters
            
        Returns:
            List of results with 'id', 'score', and 'payload'
        """
        if self._use_mock:
            return self._mock_search(
                collection_name,
                query_vector,
                limit,
                score_threshold,
            )
        
        try:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            
            # Build filter if provided
            qdrant_filter = None
            if filter_conditions:
                conditions = [
                    FieldCondition(
                        key=key,
                        match=MatchValue(value=value),
                    )
                    for key, value in filter_conditions.items()
                ]
                qdrant_filter = Filter(must=conditions)
            
            results = self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold,
                query_filter=qdrant_filter,
            )
            
            return [
                {
                    "id": str(r.id),
                    "score": r.score,
                    "payload": r.payload,
                }
                for r in results
            ]
            
        except Exception as e:
            self.logger.error("Search failed", error=str(e))
            return []
    
    def _mock_search(
        self,
        collection_name: str,
        query_vector: list[float],
        limit: int,
        score_threshold: float | None,
    ) -> list[dict[str, Any]]:
        """Mock search using cosine similarity."""
        import math
        
        def cosine_similarity(v1: list[float], v2: list[float]) -> float:
            if len(v1) != len(v2):
                return 0.0
            
            dot_product = sum(a * b for a, b in zip(v1, v2))
            norm1 = math.sqrt(sum(a * a for a in v1))
            norm2 = math.sqrt(sum(b * b for b in v2))
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return dot_product / (norm1 * norm2)
        
        points = self._mock_data.get(collection_name, [])
        
        results = []
        for point in points:
            score = cosine_similarity(query_vector, point.get("vector", []))
            if score_threshold is None or score >= score_threshold:
                results.append({
                    "id": point["id"],
                    "score": score,
                    "payload": point.get("payload", {}),
                })
        
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return results[:limit]
    
    async def delete(
        self,
        collection_name: str,
        ids: list[str],
    ) -> bool:
        """Delete vectors by ID."""
        if self._use_mock:
            if collection_name in self._mock_data:
                self._mock_data[collection_name] = [
                    p for p in self._mock_data[collection_name]
                    if p["id"] not in ids
                ]
            return True
        
        try:
            from qdrant_client.models import PointIdsList
            
            self.client.delete(
                collection_name=collection_name,
                points_selector=PointIdsList(points=ids),
            )
            return True
            
        except Exception as e:
            self.logger.error("Delete failed", error=str(e))
            return False
    
    async def get_collection_info(self, collection_name: str) -> dict[str, Any]:
        """Get collection statistics."""
        if self._use_mock:
            points = self._mock_data.get(collection_name, [])
            return {
                "name": collection_name,
                "vectors_count": len(points),
                "status": "mock",
            }
        
        try:
            info = self.client.get_collection(collection_name)
            return {
                "name": collection_name,
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": info.status.value,
            }
        except Exception as e:
            self.logger.error("Get collection info failed", error=str(e))
            return {"name": collection_name, "error": str(e)}
