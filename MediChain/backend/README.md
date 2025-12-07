# MediChain Backend

FastAPI backend for the MediChain decentralized clinical trial matching platform.

## Features

- 🤖 **AI Agent Mesh**: Patient, Matcher, and Consent agents powered by Gemini
- 🔐 **Clerk Authentication**: Secure JWT-based auth middleware
- 📊 **PostgreSQL + Qdrant**: Relational + vector database storage
- ⛓️ **Blockchain Integration**: On-chain consent verification on Base L2
- 🌐 **SingularityNET**: Marketplace service provider and consumer

## Quick Start

```bash
# Create virtual environment
uv venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
uv sync

# Run migrations
alembic upgrade head

# Start server
uvicorn src.main:app --reload
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── src/
│   ├── agents/         # AI agents (Patient, Matcher, Consent)
│   ├── api/v1/         # REST API endpoints
│   ├── core/           # Database, logging, security
│   ├── models/         # SQLModel data models
│   ├── services/       # External services (LLM, Vector, Blockchain)
│   └── middleware/     # Authentication middleware
├── migrations/         # Alembic database migrations
├── snet-service/       # SingularityNET gRPC service
└── tests/              # Unit tests
```

## Environment Variables

See `.env.example` for required configuration.

## License

MIT
