# MediChain Architecture

## System Overview

MediChain is a decentralized clinical trial matching platform that leverages AI agents and blockchain technology to connect patients with clinical trials while preserving privacy and ensuring consent integrity.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MediChain Platform                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────────────────────────────────────────────────────────────┐      │
│    │                        Frontend Layer                           │      │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │      │
│    │  │   Next.js    │  │    wagmi     │  │    Clerk     │          │      │
│    │  │   App Router │  │  + viem      │  │     Auth     │          │      │
│    │  └──────────────┘  └──────────────┘  └──────────────┘          │      │
│    └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                         │
│                                    ▼                                         │
│    ┌─────────────────────────────────────────────────────────────────┐      │
│    │                         API Layer                               │      │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │      │
│    │  │   FastAPI    │  │  Middleware  │  │   OpenAPI    │          │      │
│    │  │   Routers    │  │   (Auth)     │  │    Schema    │          │      │
│    │  └──────────────┘  └──────────────┘  └──────────────┘          │      │
│    └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                         │
│                                    ▼                                         │
│    ┌─────────────────────────────────────────────────────────────────┐      │
│    │                       Agent Layer                               │      │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │      │
│    │  │   Patient    │  │   Matcher    │  │   Consent    │          │      │
│    │  │    Agent     │  │    Agent     │  │    Agent     │          │      │
│    │  └──────────────┘  └──────────────┘  └──────────────┘          │      │
│    └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                         │
│                                    ▼                                         │
│    ┌─────────────────────────────────────────────────────────────────┐      │
│    │                       Service Layer                             │      │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │      │
│    │  │     LLM      │  │   Vector     │  │  Blockchain  │          │      │
│    │  │   Service    │  │    DB        │  │   Service    │          │      │
│    │  └──────────────┘  └──────────────┘  └──────────────┘          │      │
│    └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                         │
│                                    ▼                                         │
│    ┌─────────────────────────────────────────────────────────────────┐      │
│    │                      Storage Layer                              │      │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │      │
│    │  │  PostgreSQL  │  │   Pinecone   │  │   Base L2    │          │      │
│    │  │   + Redis    │  │              │  │  + IPFS      │          │      │
│    │  └──────────────┘  └──────────────┘  └──────────────┘          │      │
│    └─────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Layer Descriptions

### 1. Frontend Layer

**Technologies:** Next.js 15, React 19, TailwindCSS, shadcn/ui, wagmi, Web3Modal

The frontend provides a modern, responsive user interface with:
- Server-side rendering for optimal performance
- Web3 wallet integration for blockchain interactions
- Clerk-based authentication with Web3 wallet linking
- Real-time updates via React Query

**Key Components:**
- `Providers.tsx` - Application-wide context providers
- `Navbar.tsx` - Navigation with wallet status
- `TrialCard.tsx`, `MatchCard.tsx` - Data display components
- `ConsentModal.tsx` - Consent workflow modal

### 2. API Layer

**Technologies:** FastAPI, Pydantic, SQLModel

RESTful API with:
- OpenAPI/Swagger documentation
- JWT-based authentication via Clerk
- Request validation and serialization
- CORS and rate limiting

**Endpoints:**
- `/api/v1/patients` - Patient CRUD operations
- `/api/v1/trials` - Clinical trial management
- `/api/v1/matches` - AI-powered matching
- `/api/v1/webhooks/clerk` - User synchronization

### 3. Agent Layer

**Technologies:** Gemini 2.0, MeTTa (planned), LangChain

Multi-agent system for intelligent operations:

#### Patient Agent
- Extracts medical entities from text (NER)
- Generates privacy-preserving DIDs
- Creates encrypted profile hashes

#### Matcher Agent
- Computes eligibility scores (0-100)
- Provides natural language explanations
- Uses hybrid rule-based + ML matching

#### Consent Agent
- Generates personalized consent documents
- Validates digital signatures
- Triggers on-chain recording

### 4. Service Layer

**Technologies:** Google AI, Pinecone, viem, web3.py

External integrations:

#### LLM Service
- Primary: Google Gemini 2.0 Flash
- Fallback: OpenAI GPT-4
- Functions: Embedding, generation, classification

#### Vector DB Service
- Semantic search over clinical trials
- Patient-trial similarity matching
- Real-time index updates

#### Blockchain Service
- Consent recording on Base L2
- Transaction signing and broadcasting
- Event monitoring and verification

### 5. Storage Layer

**Technologies:** PostgreSQL, Redis, Pinecone, Base L2, IPFS

#### PostgreSQL
- Primary relational data store
- Patient profiles, trial metadata, match records
- Full-text search capabilities

#### Redis
- Session caching
- Rate limiting counters
- Real-time pub/sub

#### Pinecone
- Vector embeddings for trials
- Semantic similarity search
- Sub-100ms query latency

#### Base L2
- Consent smart contracts
- Immutable audit trail
- Low-cost transactions (~$0.001)

#### IPFS (Planned)
- Encrypted patient documents
- Consent form storage
- Decentralized file sharing

## Data Flow

### Patient Registration Flow

```
User                    Frontend                 Backend                  Database
 │                         │                        │                        │
 │  1. Sign Up             │                        │                        │
 │────────────────────────▶│                        │                        │
 │                         │  2. Clerk Auth         │                        │
 │                         │───────────────────────▶│                        │
 │                         │                        │  3. Create User        │
 │                         │                        │───────────────────────▶│
 │                         │                        │                        │
 │                         │  4. Webhook Event      │                        │
 │                         │◀───────────────────────│                        │
 │                         │                        │                        │
 │  5. Profile Form        │                        │                        │
 │────────────────────────▶│                        │                        │
 │                         │  6. POST /patients     │                        │
 │                         │───────────────────────▶│                        │
 │                         │                        │  7. Patient Agent      │
 │                         │                        │  - Extract entities    │
 │                         │                        │  - Generate DID        │
 │                         │                        │                        │
 │                         │                        │  8. Store Profile      │
 │                         │                        │───────────────────────▶│
 │                         │  9. Success Response   │                        │
 │◀────────────────────────│◀───────────────────────│                        │
 │                         │                        │                        │
```

### Trial Matching Flow

```
Patient                 Frontend                 Backend                 Services
 │                         │                        │                        │
 │  1. View Matches        │                        │                        │
 │────────────────────────▶│                        │                        │
 │                         │  2. GET /matches       │                        │
 │                         │───────────────────────▶│                        │
 │                         │                        │  3. Matcher Agent      │
 │                         │                        │───────────────────────▶│
 │                         │                        │     - Load Profile     │
 │                         │                        │     - Search Trials    │
 │                         │                        │     - Score Matches    │
 │                         │                        │◀───────────────────────│
 │                         │                        │                        │
 │                         │  4. Matches + Scores   │                        │
 │◀────────────────────────│◀───────────────────────│                        │
 │                         │                        │                        │
 │  5. Select Trial        │                        │                        │
 │────────────────────────▶│                        │                        │
 │                         │  6. GET /trials/{id}   │                        │
 │                         │───────────────────────▶│                        │
 │                         │                        │                        │
 │                         │  7. Trial Details      │                        │
 │◀────────────────────────│◀───────────────────────│                        │
 │                         │                        │                        │
```

### Consent Recording Flow

```
Patient                 Frontend                 Backend                Blockchain
 │                         │                        │                        │
 │  1. Click Consent       │                        │                        │
 │────────────────────────▶│                        │                        │
 │                         │  2. Generate Consent   │                        │
 │                         │───────────────────────▶│                        │
 │                         │                        │  3. Consent Agent      │
 │                         │                        │  - Generate Doc        │
 │                         │                        │  - Compute Hash        │
 │                         │                        │                        │
 │                         │  4. Consent Document   │                        │
 │◀────────────────────────│◀───────────────────────│                        │
 │                         │                        │                        │
 │  5. Sign (Wallet)       │                        │                        │
 │────────────────────────▶│                        │                        │
 │                         │  6. POST /consents     │                        │
 │                         │───────────────────────▶│                        │
 │                         │                        │  7. Record On-Chain    │
 │                         │                        │───────────────────────▶│
 │                         │                        │                        │
 │                         │                        │  8. Transaction Hash   │
 │                         │                        │◀───────────────────────│
 │                         │  9. Confirmation       │                        │
 │◀────────────────────────│◀───────────────────────│                        │
 │                         │                        │                        │
```

## Security Model

### Authentication
- **Clerk** handles user authentication
- JWT tokens for API authorization
- Web3 wallet signatures for blockchain ops

### Authorization
- Role-based access control (RBAC)
- Middleware validates all protected routes
- Patients can only access their own data

### Data Protection
- Patient data encrypted at rest
- TLS 1.3 for data in transit
- Zero-knowledge proofs for eligibility (planned)

### Blockchain Security
- Smart contracts audited (pending)
- Multi-sig for contract upgrades
- On-chain data is hashed, not plaintext

## Deployment

### Development
```bash
# Start all services
docker-compose up -d

# Individual services
cd backend && uvicorn src.main:app --reload
cd frontend && npm run dev
```

### Production
- **Frontend:** Vercel Edge Network
- **Backend:** Railway / GCP Cloud Run
- **Database:** Supabase (PostgreSQL)
- **Contracts:** Base L2 Mainnet

### CI/CD Pipeline
```yaml
# GitHub Actions workflow
on: [push, pull_request]
jobs:
  - lint-and-type-check
  - run-tests
  - build-docker
  - deploy (on main)
```

## Future Enhancements

1. **MeTTa Integration** - Hybrid reasoning with symbolic AI
2. **IPFS Storage** - Decentralized document storage
3. **ZK Proofs** - Private eligibility verification
4. **Mobile Apps** - iOS and Android native clients
5. **Multi-chain** - Ethereum L1, Arbitrum, Polygon support

---

## SingularityNET Integration

MediChain is deeply integrated with the SingularityNET Decentralized AI Platform, enabling both consumption and publication of AI services.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SingularityNET Ecosystem Integration                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌───────────────────────────────────────────────────────────────────┐    │
│    │                  MediChain as Service Consumer                     │    │
│    │                                                                     │    │
│    │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │    │
│    │   │  Medical    │    │    Text     │    │   Entity    │           │    │
│    │   │    NLP      │    │ Summarizer  │    │ Extraction  │           │    │
│    │   └─────────────┘    └─────────────┘    └─────────────┘           │    │
│    │          │                  │                  │                   │    │
│    │          └──────────────────┴──────────────────┘                   │    │
│    │                             │                                       │    │
│    │                             ▼                                       │    │
│    │                 ┌─────────────────────┐                            │    │
│    │                 │   snet-sdk-python   │                            │    │
│    │                 │  (Service Client)   │                            │    │
│    │                 └─────────────────────┘                            │    │
│    │                             │                                       │    │
│    └─────────────────────────────┼───────────────────────────────────────┘    │
│                                  │                                       │
│                                  ▼                                       │
│    ┌───────────────────────────────────────────────────────────────────┐    │
│    │               SingularityNET Platform Layer                        │    │
│    │                                                                     │    │
│    │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │    │
│    │   │     MPE     │    │   Service   │    │    IPFS     │           │    │
│    │   │  Contracts  │    │  Registry   │    │  Metadata   │           │    │
│    │   └─────────────┘    └─────────────┘    └─────────────┘           │    │
│    │                                                                     │    │
│    └───────────────────────────────────────────────────────────────────┘    │
│                                  │                                       │
│                                  ▼                                       │
│    ┌───────────────────────────────────────────────────────────────────┐    │
│    │                  MediChain as Service Provider                     │    │
│    │                                                                     │    │
│    │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │    │
│    │   │   Trial     │    │ Eligibility │    │   Match     │           │    │
│    │   │  Matcher    │    │  Checker    │    │  Insights   │           │    │
│    │   └─────────────┘    └─────────────┘    └─────────────┘           │    │
│    │          │                  │                  │                   │    │
│    │          └──────────────────┴──────────────────┘                   │    │
│    │                             │                                       │    │
│    │                             ▼                                       │    │
│    │                 ┌─────────────────────┐                            │    │
│    │                 │    snet-daemon      │                            │    │
│    │                 │  (gRPC Passthrough) │                            │    │
│    │                 └─────────────────────┘                            │    │
│    │                                                                     │    │
│    └───────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Consumer

MediChain uses the SingularityNET Python SDK to consume AI services from the marketplace:

```python
# backend/src/services/snet_service.py

from snet import sdk

# Initialize SDK
config = sdk.config.Config(
    private_key=settings.snet_private_key,
    eth_rpc_endpoint=settings.snet_eth_rpc_endpoint,
)
snet_sdk = sdk.SnetSDK(config)

# Create service client
service_client = snet_sdk.create_service_client(
    org_id="snet",
    service_id="medical-nlp",
    payment_strategy_type=PaymentStrategyType.FREE_CALL
)

# Call the service
result = service_client.call_rpc("analyze", "TextInput", text="Patient has type 2 diabetes")
```

**Consumed Services:**
- Medical NLP analysis
- Entity extraction
- Text summarization
- Sentiment analysis for patient feedback

### Service Provider

MediChain publishes its own AI services to the SingularityNET marketplace:

**Service Definition (Protocol Buffers):**
```protobuf
// backend/snet-service/medichain.proto

service ClinicalTrialMatcher {
    rpc MatchTrials(PatientMatchRequest) returns (TrialMatchResponse);
    rpc CheckEligibility(EligibilityCheckRequest) returns (EligibilityCheckResponse);
    rpc ExtractMedicalEntities(TextAnalysisRequest) returns (MedicalEntitiesResponse);
    rpc GetMatchInsights(MatchInsightsRequest) returns (MatchInsightsResponse);
}
```

**Service Metadata:**
```json
{
    "display_name": "MediChain Clinical Trial Matcher",
    "encoding": "proto",
    "service_type": "grpc",
    "tags": ["healthcare", "clinical-trials", "ai-matching", "metta"]
}
```

### Payment Handling

MediChain uses SingularityNET's Multi-Party Escrow (MPE) for service payments:

1. **Deposit FET tokens** to MPE smart contract
2. **Open payment channel** with service provider
3. **Pay per call** with automatic channel management
4. **Claim unused funds** after channel expiration

**Payment Strategies:**
- `FREE_CALL`: Use available free calls first
- `PAID_CALL`: Standard pay-per-call
- `PREPAID_CALL`: Batch payment for multiple calls

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/snet/status` | SDK initialization status |
| `GET /api/v1/snet/organizations` | List marketplace organizations |
| `GET /api/v1/snet/services/{org}` | List org services |
| `POST /api/v1/snet/call` | Call any SNET service |
| `POST /api/v1/snet/medical/analyze` | Medical text analysis |
| `POST /api/v1/snet/medical/entities` | Extract medical entities |
| `POST /api/v1/snet/deposit` | Deposit FET to MPE |

### Configuration

```env
# .env file
SNET_PRIVATE_KEY=0x...
SNET_ETH_RPC_ENDPOINT=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
SNET_NETWORK=sepolia
SNET_ORGANIZATION_ID=medichain-health
SNET_IPFS_ENDPOINT=https://ipfs.singularitynet.io
```

### Daemon Deployment

To publish services, run the snet-daemon:

```bash
# Start daemon
snetd --config backend/snet-service/snetd.config.json

# Daemon passes gRPC calls to FastAPI backend
# Handles payment verification and channel management
```

### Publishing to Marketplace

**Marketplace URL:** [https://marketplace.singularitynet.io/](https://marketplace.singularitynet.io/)

**Publisher Portal:** [https://publisher.singularitynet.io/](https://publisher.singularitynet.io/)

```bash
# 1. Register organization
snet organization create medichain-health --org-id medichain-health

# 2. Publish service
snet service publish medichain-health clinical-trial-matcher \
    --metadata-file backend/snet-service/service_metadata.json \
    --proto-path backend/snet-service/medichain.proto

# 3. Start daemon
snetd serve

# 4. Service is now available on marketplace.singularitynet.io!
```

### MeTTa Reasoning Integration

MediChain implements MeTTa-style symbolic reasoning for trial matching:

```metta
; Example MeTTa-style eligibility rules
(= (eligible-for-trial $patient $trial)
   (and
     (age-in-range $patient $trial)
     (condition-matches $patient $trial)
     (no-exclusions $patient $trial)))

(= (age-in-range $patient $trial)
   (and
     (>= (age $patient) (min-age $trial))
     (<= (age $patient) (max-age $trial))))
```

This symbolic reasoning is combined with neural NLP for hybrid neuro-symbolic AI.


