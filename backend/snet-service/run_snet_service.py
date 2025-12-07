#!/usr/bin/env python
"""
MediChain SNET Service Runner

Complete setup and runner for deploying MediChain on SingularityNET marketplace.

Usage:
    python run_snet_service.py --mode dev      # Development mode (no daemon)
    python run_snet_service.py --mode daemon   # With snet-daemon
    python run_snet_service.py --mode full     # Full production setup
"""

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path


# Configuration
SERVICE_PORT = 7000
DAEMON_PORT = 7001
ORG_ID = "medichain-health"
SERVICE_ID = "clinical-trial-matcher"


def check_dependencies():
    """Check if required dependencies are installed."""
    print("Checking dependencies...")
    
    missing = []
    
    # Check Python packages
    try:
        import grpc
        print("  ✓ grpcio installed")
    except ImportError:
        missing.append("grpcio")
    
    try:
        import grpc_tools
        print("  ✓ grpcio-tools installed")
    except ImportError:
        missing.append("grpcio-tools")
    
    # Check snet-daemon (optional)
    try:
        result = subprocess.run(["snetd", "version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  ✓ snet-daemon installed: {result.stdout.strip()}")
        else:
            print("  ⚠ snet-daemon not found (optional for dev mode)")
    except FileNotFoundError:
        print("  ⚠ snet-daemon not found (optional for dev mode)")
    
    if missing:
        print(f"\nMissing packages: {', '.join(missing)}")
        print(f"Install with: pip install {' '.join(missing)}")
        return False
    
    return True


def compile_protos():
    """Compile protocol buffer definitions."""
    print("\nCompiling protocol buffers...")
    
    snet_dir = Path(__file__).parent
    compile_script = snet_dir / "compile_proto.py"
    
    result = subprocess.run([sys.executable, str(compile_script)], cwd=snet_dir)
    return result.returncode == 0


def start_grpc_service(port: int = SERVICE_PORT):
    """Start the gRPC service."""
    print(f"\nStarting MediChain gRPC service on port {port}...")
    
    snet_dir = Path(__file__).parent
    service_script = snet_dir / "grpc_service.py"
    
    # Set environment
    env = os.environ.copy()
    env["PYTHONPATH"] = str(snet_dir.parent)
    
    process = subprocess.Popen(
        [sys.executable, str(service_script), "--port", str(port)],
        env=env,
        cwd=snet_dir.parent
    )
    
    return process


def start_snet_daemon():
    """Start the snet-daemon."""
    print(f"\nStarting snet-daemon...")
    
    snet_dir = Path(__file__).parent
    config_file = snet_dir / "snetd.config.json"
    
    if not config_file.exists():
        print(f"Error: {config_file} not found")
        return None
    
    process = subprocess.Popen(
        ["snetd", "--config", str(config_file)],
        cwd=snet_dir
    )
    
    return process


def run_dev_mode():
    """Run in development mode (gRPC service only)."""
    print("=" * 60)
    print("MediChain SNET Service - Development Mode")
    print("=" * 60)
    
    if not check_dependencies():
        sys.exit(1)
    
    if not compile_protos():
        print("Warning: Proto compilation failed, running in stub mode")
    
    process = start_grpc_service()
    
    print("\n" + "=" * 60)
    print("Service is running!")
    print("=" * 60)
    print(f"gRPC endpoint: localhost:{SERVICE_PORT}")
    print("\nTest with grpcurl:")
    print(f"  grpcurl -plaintext localhost:{SERVICE_PORT} medichain.ClinicalTrialMatcher/HealthCheck")
    print("\nPress Ctrl+C to stop")
    
    try:
        process.wait()
    except KeyboardInterrupt:
        print("\nShutting down...")
        process.terminate()


def run_daemon_mode():
    """Run with snet-daemon for marketplace integration."""
    print("=" * 60)
    print("MediChain SNET Service - Daemon Mode")
    print("=" * 60)
    
    if not check_dependencies():
        sys.exit(1)
    
    if not compile_protos():
        print("Warning: Proto compilation failed")
    
    # Start gRPC service
    grpc_process = start_grpc_service()
    time.sleep(2)  # Wait for service to start
    
    # Start daemon
    daemon_process = start_snet_daemon()
    
    if daemon_process is None:
        grpc_process.terminate()
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("Service is running with snet-daemon!")
    print("=" * 60)
    print(f"Internal gRPC: localhost:{SERVICE_PORT}")
    print(f"Daemon endpoint: localhost:{DAEMON_PORT}")
    print(f"\nOrganization: {ORG_ID}")
    print(f"Service: {SERVICE_ID}")
    print("\nPress Ctrl+C to stop")
    
    try:
        daemon_process.wait()
    except KeyboardInterrupt:
        print("\nShutting down...")
        daemon_process.terminate()
        grpc_process.terminate()


def show_publish_instructions():
    """Show instructions for publishing to marketplace."""
    print("=" * 60)
    print("Publishing to SingularityNET Marketplace")
    print("=" * 60)
    print("""
Prerequisites:
1. Install snet-cli: pip install snet-cli
2. Configure identity: snet identity create <name> key --private-key <key>
3. Have FET tokens for gas fees

Steps to publish:

1. Create organization (if not exists):
   snet organization metadata-init {org_id} --org-type individual
   snet organization create {org_id}

2. Initialize service metadata:
   snet service metadata-init \\
       --metadata-file service_metadata.json \\
       --display-name "MediChain Clinical Trial Matcher" \\
       --encoding proto \\
       --service-type grpc \\
       --group-name default_group

3. Add endpoints:
   snet service metadata-add-endpoints \\
       --metadata-file service_metadata.json \\
       --endpoints https://your-server.com:7000

4. Publish service:
   snet service publish {org_id} {service_id} \\
       --metadata-file service_metadata.json

5. Verify on marketplace:
   https://marketplace.singularitynet.io/servicedetails/org/{org_id}/service/{service_id}

Your service will be live on:
https://marketplace.singularitynet.io/
""".format(org_id=ORG_ID, service_id=SERVICE_ID))


def main():
    parser = argparse.ArgumentParser(
        description="MediChain SNET Service Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_snet_service.py --mode dev       # Development mode
  python run_snet_service.py --mode daemon    # With snet-daemon
  python run_snet_service.py --mode publish   # Show publish instructions
        """
    )
    
    parser.add_argument(
        "--mode",
        choices=["dev", "daemon", "publish"],
        default="dev",
        help="Run mode: dev (gRPC only), daemon (with snet-daemon), publish (show instructions)"
    )
    
    parser.add_argument(
        "--port",
        type=int,
        default=SERVICE_PORT,
        help=f"gRPC service port (default: {SERVICE_PORT})"
    )
    
    args = parser.parse_args()
    
    if args.mode == "dev":
        run_dev_mode()
    elif args.mode == "daemon":
        run_daemon_mode()
    elif args.mode == "publish":
        show_publish_instructions()


if __name__ == "__main__":
    main()
