@echo off
REM ============================================================================
REM MediChain Quick Start Script for Windows
REM ============================================================================
REM This script sets up the MediChain development environment.
REM Run from the project root directory.
REM ============================================================================

echo.
echo ============================================
echo       MediChain Development Setup
echo ============================================
echo.

REM Check for Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop.
    echo Download: https://www.docker.com/products/docker-desktop
    exit /b 1
)

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+.
    echo Download: https://nodejs.org/
    exit /b 1
)

REM Check for Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed. Please install Python 3.11+.
    echo Download: https://www.python.org/downloads/
    exit /b 1
)

echo [OK] Prerequisites check passed!
echo.

REM Create environment files if they don't exist
echo Setting up environment files...

if not exist "backend\.env" (
    echo Creating backend\.env...
    (
        echo # MediChain Backend Environment
        echo ENVIRONMENT=development
        echo DEBUG=true
        echo.
        echo # API Configuration
        echo API_HOST=0.0.0.0
        echo API_PORT=8000
        echo.
        echo # Database
        echo DATABASE_URL=postgresql+asyncpg://medichain:medichain_dev@localhost:5432/medichain
        echo REDIS_URL=redis://localhost:6379/0
        echo.
        echo # Clerk Authentication
        echo CLERK_SECRET_KEY=your_clerk_secret_key_here
        echo CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
        echo CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret_here
        echo.
        echo # AI Services
        echo GOOGLE_AI_API_KEY=your_gemini_api_key_here
        echo OPENAI_API_KEY=your_openai_api_key_here
        echo.
        echo # Vector Database ^(Pinecone^)
        echo PINECONE_API_KEY=your_pinecone_api_key_here
        echo PINECONE_ENVIRONMENT=your_pinecone_environment
        echo PINECONE_INDEX_NAME=medichain-trials
        echo.
        echo # Blockchain
        echo BASE_RPC_URL=https://mainnet.base.org
        echo BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
        echo WALLET_PRIVATE_KEY=your_wallet_private_key_here
        echo CONTRACT_ADDRESS=your_deployed_contract_address
        echo.
        echo # CORS
        echo CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
    ) > backend\.env
    echo [OK] Created backend\.env
) else (
    echo [OK] backend\.env already exists
)

if not exist "frontend\.env.local" (
    echo Creating frontend\.env.local...
    (
        echo # MediChain Frontend Environment
        echo.
        echo # API
        echo NEXT_PUBLIC_API_URL=http://localhost:8000
        echo.
        echo # Clerk Authentication
        echo NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
        echo CLERK_SECRET_KEY=your_clerk_secret_key_here
        echo.
        echo # Clerk URLs
        echo NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
        echo NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
        echo NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
        echo NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
        echo.
        echo # Web3
        echo NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
        echo NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
        echo NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
    ) > frontend\.env.local
    echo [OK] Created frontend\.env.local
) else (
    echo [OK] frontend\.env.local already exists
)

if not exist "contracts\.env" (
    echo Creating contracts\.env...
    (
        echo # Hardhat Configuration
        echo.
        echo # Network RPC URLs
        echo BASE_MAINNET_RPC_URL=https://mainnet.base.org
        echo BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
        echo.
        echo # Deployment
        echo DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here
        echo.
        echo # Verification
        echo BASESCAN_API_KEY=your_basescan_api_key_here
    ) > contracts\.env
    echo [OK] Created contracts\.env
) else (
    echo [OK] contracts\.env already exists
)

echo.
echo Environment files created. Please edit them with your actual keys.
echo.

REM Install dependencies
echo ============================================
echo Installing Dependencies
echo ============================================
echo.

echo Installing backend dependencies...
cd backend
python -m pip install -e ".[dev]" --quiet
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    cd ..
    exit /b 1
)
cd ..
echo [OK] Backend dependencies installed

echo.
echo Installing frontend dependencies...
cd frontend
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    exit /b 1
)
cd ..
echo [OK] Frontend dependencies installed

echo.
echo Installing smart contract dependencies...
cd contracts
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install contract dependencies
    cd ..
    exit /b 1
)
cd ..
echo [OK] Contract dependencies installed

echo.
echo ============================================
echo Setup Complete!
echo ============================================
echo.
echo Next steps:
echo.
echo 1. Edit the .env files with your API keys:
echo    - backend\.env
echo    - frontend\.env.local
echo    - contracts\.env
echo.
echo 2. Start the development environment:
echo    docker-compose up -d
echo.
echo 3. Or start services individually:
echo    Backend:   cd backend ^&^& uvicorn src.main:app --reload
echo    Frontend:  cd frontend ^&^& npm run dev
echo    Contracts: cd contracts ^&^& npx hardhat compile
echo.
echo 4. Open in browser:
echo    Frontend: http://localhost:3000
echo    API Docs: http://localhost:8000/docs
echo.
echo Happy hacking! 🚀
echo.
