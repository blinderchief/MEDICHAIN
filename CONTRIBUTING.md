# Contributing to MediChain

Thank you for your interest in contributing to MediChain! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/medichain.git
   cd medichain
   ```

2. **Run Setup Script**
   ```bash
   # Windows
   scripts\setup.bat
   
   # macOS/Linux
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. **Configure Environment**
   
   Edit the generated `.env` files with your API keys:
   - `backend/.env`
   - `frontend/.env.local`
   - `contracts/.env`

4. **Start Development Server**
   ```bash
   # Start all services with Docker
   docker-compose up -d
   
   # Or run individually
   cd backend && uvicorn src.main:app --reload
   cd frontend && npm run dev
   ```

## 📁 Project Structure

```
medichain/
├── backend/           # FastAPI Python backend
│   ├── src/
│   │   ├── agents/   # AI agents (Patient, Matcher, Consent)
│   │   ├── api/v1/   # API endpoints
│   │   ├── core/     # Database, logging, security
│   │   ├── models/   # SQLModel entities
│   │   ├── services/ # External services
│   │   └── middleware/
│   ├── tests/        # Pytest test suite
│   └── migrations/   # Alembic migrations
│
├── frontend/         # Next.js React frontend
│   ├── src/
│   │   ├── app/     # App Router pages
│   │   ├── components/
│   │   ├── hooks/   # Custom React hooks
│   │   ├── lib/     # Utilities
│   │   └── types/   # TypeScript types
│   └── __tests__/   # Vitest tests
│
├── contracts/        # Solidity smart contracts
│   └── scripts/     # Hardhat scripts
│
└── docs/            # Documentation
```

## 🔧 Development Workflow

### Branch Naming

- `feature/short-description` - New features
- `fix/issue-number-description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(agents): add eligibility scoring algorithm
fix(api): handle missing patient profile gracefully
docs(readme): update installation instructions
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Update documentation if needed
5. Submit PR with clear description
6. Address review feedback

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Run specific test file
pytest tests/test_api.py -v
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Smart Contract Tests

```bash
cd contracts

# Run tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

## 📝 Code Style

### Python (Backend)

- Follow PEP 8 style guide
- Use type hints
- Maximum line length: 88 (Black formatter)
- Docstrings for all public functions

```python
from typing import Optional

async def get_patient(
    patient_id: str,
    include_matches: bool = False
) -> Optional[Patient]:
    """
    Retrieve a patient by ID.
    
    Args:
        patient_id: Unique patient identifier
        include_matches: Whether to include trial matches
        
    Returns:
        Patient object if found, None otherwise
    """
    ...
```

### TypeScript (Frontend)

- Use TypeScript strict mode
- Prefer functional components
- Use React Query for data fetching
- Follow ESLint + Prettier configuration

```typescript
interface PatientCardProps {
  patient: Patient;
  onSelect?: (id: string) => void;
}

export function PatientCard({ patient, onSelect }: PatientCardProps) {
  // Component implementation
}
```

### Solidity (Contracts)

- Follow Solidity style guide
- Use NatSpec comments
- Gas-efficient patterns
- Comprehensive tests

```solidity
/// @notice Records patient consent on-chain
/// @param patientDID Decentralized identifier of patient
/// @param trialId Identifier of the clinical trial
/// @param documentHash Hash of signed consent document
function recordConsent(
    bytes32 patientDID,
    bytes32 trialId,
    bytes32 documentHash
) external returns (bytes32 consentId) {
    // Implementation
}
```

## 🔍 Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass and cover new functionality
- [ ] Documentation is updated
- [ ] No sensitive data exposed
- [ ] Error handling is appropriate
- [ ] Performance considerations addressed

## 🐛 Bug Reports

When filing a bug report, include:

1. **Description** - Clear description of the issue
2. **Steps to Reproduce** - Minimal steps to reproduce
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - OS, browser, versions
6. **Logs/Screenshots** - Relevant error messages

## 💡 Feature Requests

For feature requests, describe:

1. **Problem** - What problem does this solve?
2. **Solution** - Proposed implementation
3. **Alternatives** - Other approaches considered
4. **Impact** - Who benefits from this feature?

## 📚 Areas for Contribution

### High Priority
- [ ] MeTTa agent integration for symbolic reasoning
- [ ] IPFS integration for document storage
- [ ] Zero-knowledge proof implementation
- [ ] Mobile app (React Native)

### Medium Priority
- [ ] Additional LLM provider support
- [ ] Multi-language support (i18n)
- [ ] Enhanced analytics dashboard
- [ ] Accessibility improvements (a11y)

### Documentation
- [ ] API reference expansion
- [ ] Video tutorials
- [ ] Architecture deep-dives
- [ ] Integration guides

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Team page (for significant contributions)

## 📫 Contact

- GitHub Issues - Bug reports and features
- Discussions - Questions and ideas
- Email - team@medichain.io (for sensitive matters)

---

Thank you for helping make MediChain better! 🙏
