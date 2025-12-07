#!/usr/bin/env python
"""
MediChain Quick Setup Script
============================

This script helps you set up MediChain for local development.
Run with: python setup.py
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_banner():
    """Print setup banner."""
    print(f"""
{Colors.CYAN}{Colors.BOLD}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███╗   ███╗███████╗██████╗ ██╗ ██████╗██╗  ██╗ █████╗ ██╗  ║
║   ████╗ ████║██╔════╝██╔══██╗██║██╔════╝██║  ██║██╔══██╗██║  ║
║   ██╔████╔██║█████╗  ██║  ██║██║██║     ███████║███████║██║  ║
║   ██║╚██╔╝██║██╔══╝  ██║  ██║██║██║     ██╔══██║██╔══██║██║  ║
║   ██║ ╚═╝ ██║███████╗██████╔╝██║╚██████╗██║  ██║██║  ██║██║  ║
║   ╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ║
║                                                               ║
║           Quick Setup Script - SingularityNET Hackathon       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
{Colors.ENDC}
""")


def print_step(step_num, message):
    """Print a step message."""
    print(f"{Colors.CYAN}[{step_num}]{Colors.ENDC} {message}")


def print_success(message):
    """Print success message."""
    print(f"{Colors.GREEN}✓{Colors.ENDC} {message}")


def print_warning(message):
    """Print warning message."""
    print(f"{Colors.WARNING}⚠{Colors.ENDC} {message}")


def print_error(message):
    """Print error message."""
    print(f"{Colors.FAIL}✗{Colors.ENDC} {message}")


def check_prerequisites():
    """Check if required tools are installed."""
    print_step(1, "Checking prerequisites...")
    
    required = {
        "python": "Python 3.12+",
        "node": "Node.js 20+",
        "docker": "Docker",
        "docker-compose": "Docker Compose",
        "git": "Git",
    }
    
    optional = {
        "uv": "UV (Python package manager)",
        "pnpm": "pnpm (Node package manager)",
    }
    
    missing = []
    
    for cmd, name in required.items():
        if shutil.which(cmd):
            print_success(f"{name} found")
        else:
            print_error(f"{name} not found")
            missing.append(name)
    
    for cmd, name in optional.items():
        if shutil.which(cmd):
            print_success(f"{name} found (recommended)")
        else:
            print_warning(f"{name} not found (will use fallback)")
    
    if missing:
        print(f"\n{Colors.FAIL}Missing required tools:{Colors.ENDC}")
        for tool in missing:
            print(f"  - {tool}")
        print("\nPlease install the missing tools and run this script again.")
        sys.exit(1)
    
    print()
    return True


def setup_environment_files():
    """Create environment files from examples."""
    print_step(2, "Setting up environment files...")
    
    env_files = [
        ("backend/.env.example", "backend/.env"),
        ("frontend/.env.example", "frontend/.env.local"),
        ("contracts/.env.example", "contracts/.env"),
    ]
    
    for example, target in env_files:
        example_path = Path(example)
        target_path = Path(target)
        
        if target_path.exists():
            print_warning(f"{target} already exists, skipping")
        elif example_path.exists():
            shutil.copy(example_path, target_path)
            print_success(f"Created {target}")
        else:
            print_warning(f"{example} not found")
    
    print(f"\n{Colors.WARNING}Important:{Colors.ENDC} Edit the .env files with your API keys:")
    print("  - backend/.env: Add GOOGLE_API_KEY, CLERK_SECRET_KEY, etc.")
    print("  - frontend/.env.local: Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, etc.")
    print("  - contracts/.env: Add PRIVATE_KEY for deployment")
    print()


def install_backend_dependencies():
    """Install backend Python dependencies."""
    print_step(3, "Installing backend dependencies...")
    
    os.chdir("backend")
    
    if shutil.which("uv"):
        subprocess.run(["uv", "sync"], check=True)
        print_success("Backend dependencies installed with UV")
    else:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print_success("Backend dependencies installed with pip")
    
    os.chdir("..")
    print()


def install_frontend_dependencies():
    """Install frontend Node dependencies."""
    print_step(4, "Installing frontend dependencies...")
    
    os.chdir("frontend")
    
    if shutil.which("pnpm"):
        subprocess.run(["pnpm", "install"], check=True)
        print_success("Frontend dependencies installed with pnpm")
    else:
        subprocess.run(["npm", "install"], check=True)
        print_success("Frontend dependencies installed with npm")
    
    os.chdir("..")
    print()


def install_contract_dependencies():
    """Install smart contract dependencies."""
    print_step(5, "Installing contract dependencies...")
    
    os.chdir("contracts")
    
    if shutil.which("pnpm"):
        subprocess.run(["pnpm", "install"], check=True)
    else:
        subprocess.run(["npm", "install"], check=True)
    
    print_success("Contract dependencies installed")
    os.chdir("..")
    print()


def setup_database():
    """Initialize database with Docker Compose."""
    print_step(6, "Setting up database with Docker Compose...")
    
    # Start only postgres and qdrant services
    subprocess.run([
        "docker-compose", "up", "-d", "postgres", "qdrant"
    ], check=True)
    
    print_success("PostgreSQL and Qdrant containers started")
    print_warning("Waiting for services to be ready...")
    
    import time
    time.sleep(5)  # Wait for services to start
    
    print()


def run_migrations():
    """Run database migrations."""
    print_step(7, "Running database migrations...")
    
    os.chdir("backend")
    
    if shutil.which("uv"):
        subprocess.run(["uv", "run", "alembic", "upgrade", "head"], check=True)
    else:
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
    
    print_success("Database migrations completed")
    os.chdir("..")
    print()


def print_next_steps():
    """Print instructions for next steps."""
    print(f"""
{Colors.GREEN}{Colors.BOLD}
╔═══════════════════════════════════════════════════════════════╗
║                    Setup Complete! 🎉                         ║
╚═══════════════════════════════════════════════════════════════╝
{Colors.ENDC}

{Colors.CYAN}Next Steps:{Colors.ENDC}

1. {Colors.BOLD}Configure API Keys{Colors.ENDC}
   Edit the environment files with your actual API keys:
   
   {Colors.WARNING}backend/.env:{Colors.ENDC}
   - GOOGLE_API_KEY: Get from https://ai.google.dev
   - CLERK_SECRET_KEY: Get from https://clerk.dev
   
   {Colors.WARNING}frontend/.env.local:{Colors.ENDC}
   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Get from https://clerk.dev
   - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: Get from https://cloud.walletconnect.com

2. {Colors.BOLD}Start the Development Servers{Colors.ENDC}
   
   Option A - Using Docker Compose (recommended):
   {Colors.CYAN}docker-compose up{Colors.ENDC}
   
   Option B - Run individually:
   {Colors.CYAN}# Terminal 1 - Backend
   cd backend && uv run uvicorn app.main:app --reload
   
   # Terminal 2 - Frontend  
   cd frontend && pnpm dev
   
   # Terminal 3 - Local Blockchain
   cd contracts && npx hardhat node{Colors.ENDC}

3. {Colors.BOLD}Access the Application{Colors.ENDC}
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs
   - Qdrant UI: http://localhost:6333/dashboard

4. {Colors.BOLD}Run the Demo{Colors.ENDC}
   {Colors.CYAN}python demo.py{Colors.ENDC}

{Colors.GREEN}Happy Hacking! 🚀{Colors.ENDC}
""")


def main():
    """Main setup function."""
    print_banner()
    
    try:
        check_prerequisites()
        setup_environment_files()
        
        response = input("Install all dependencies? (y/n): ")
        if response.lower() == 'y':
            install_backend_dependencies()
            install_frontend_dependencies()
            install_contract_dependencies()
        
        response = input("Start database containers? (y/n): ")
        if response.lower() == 'y':
            setup_database()
            
            response = input("Run database migrations? (y/n): ")
            if response.lower() == 'y':
                run_migrations()
        
        print_next_steps()
        
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nSetup cancelled.")
        sys.exit(0)


if __name__ == "__main__":
    main()
