#!/bin/bash
# ============================================================================
# MediChain Quick Start Script for Unix/macOS
# ============================================================================
# This script sets up the MediChain development environment.
# Run from the project root directory.
# ============================================================================

set -e

echo ""
echo "============================================"
echo "       MediChain Development Setup"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Docker is not installed. Please install Docker."
    echo "Download: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed. Please install Node.js 18+."
    echo "Download: https://nodejs.org/"
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Python is not installed. Please install Python 3.11+."
    echo "Download: https://www.python.org/downloads/"
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Prerequisites check passed!"
echo ""

# Create environment files if they don't exist
echo "Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env..."
    cat > backend/.env << 'EOF'
# MediChain Backend Environment
ENVIRONMENT=development
DEBUG=true

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Database
DATABASE_URL=postgresql+asyncpg://medichain:medichain_dev@localhost:5432/medichain
REDIS_URL=redis://localhost:6379/0

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key_here
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret_here

# AI Services
GOOGLE_AI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Vector Database (Pinecone)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=medichain-trials

# Blockchain
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
WALLET_PRIVATE_KEY=your_wallet_private_key_here
CONTRACT_ADDRESS=your_deployed_contract_address

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
EOF
    echo -e "${GREEN}[OK]${NC} Created backend/.env"
else
    echo -e "${GREEN}[OK]${NC} backend/.env already exists"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "Creating frontend/.env.local..."
    cat > frontend/.env.local << 'EOF'
# MediChain Frontend Environment

# API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Web3
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
EOF
    echo -e "${GREEN}[OK]${NC} Created frontend/.env.local"
else
    echo -e "${GREEN}[OK]${NC} frontend/.env.local already exists"
fi

if [ ! -f "contracts/.env" ]; then
    echo "Creating contracts/.env..."
    cat > contracts/.env << 'EOF'
# Hardhat Configuration

# Network RPC URLs
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Deployment
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here

# Verification
BASESCAN_API_KEY=your_basescan_api_key_here
EOF
    echo -e "${GREEN}[OK]${NC} Created contracts/.env"
else
    echo -e "${GREEN}[OK]${NC} contracts/.env already exists"
fi

echo ""
echo -e "${YELLOW}Environment files created. Please edit them with your actual keys.${NC}"
echo ""

# Install dependencies
echo "============================================"
echo "Installing Dependencies"
echo "============================================"
echo ""

echo "Installing backend dependencies..."
cd backend
python3 -m pip install -e ".[dev]" --quiet
cd ..
echo -e "${GREEN}[OK]${NC} Backend dependencies installed"

echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..
echo -e "${GREEN}[OK]${NC} Frontend dependencies installed"

echo ""
echo "Installing smart contract dependencies..."
cd contracts
npm install --silent
cd ..
echo -e "${GREEN}[OK]${NC} Contract dependencies installed"

echo ""
echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Edit the .env files with your API keys:"
echo "   - backend/.env"
echo "   - frontend/.env.local"
echo "   - contracts/.env"
echo ""
echo "2. Start the development environment:"
echo "   docker-compose up -d"
echo ""
echo "3. Or start services individually:"
echo "   Backend:   cd backend && uvicorn src.main:app --reload"
echo "   Frontend:  cd frontend && npm run dev"
echo "   Contracts: cd contracts && npx hardhat compile"
echo ""
echo "4. Open in browser:"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Happy hacking! 🚀"
echo ""
