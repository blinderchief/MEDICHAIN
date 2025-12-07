#!/usr/bin/env python
"""
MediChain - SingularityNET Marketplace Publisher

Automates the process of publishing MediChain service to the SingularityNET marketplace.

Usage:
    python publish_to_marketplace.py --network mainnet --private-key <key>
    python publish_to_marketplace.py --network sepolia --check-only
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional


# Configuration
ORG_ID = "medichain-health"
ORG_NAME = "MediChain Health AI"
ORG_DESCRIPTION = "Decentralized Clinical Trial Matching powered by AI and SingularityNET"

SERVICE_ID = "clinical-trial-matcher"
SERVICE_NAME = "MediChain Clinical Trial Matcher"
SERVICE_DESCRIPTION = """
AI-powered clinical trial matching service that connects patients with relevant research studies.

Features:
- Intelligent trial matching based on medical conditions and biomarkers
- Eligibility checking with detailed criteria analysis
- Medical entity extraction from clinical text
- Match insights and recommendations

Powered by advanced NLP and neuro-symbolic AI on the SingularityNET decentralized network.
"""

PRICE_IN_COGS = 10  # 10 cogs per call
FREE_CALLS = 20     # 20 free calls for demo
GROUP_NAME = "default_group"


class SNETPublisher:
    """Publisher for SingularityNET marketplace."""
    
    def __init__(self, network: str = "mainnet", dry_run: bool = False):
        self.network = network
        self.dry_run = dry_run
        self.snet_dir = Path(__file__).parent
        
    def run_command(self, cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
        """Run a shell command."""
        print(f"  > {' '.join(cmd)}")
        
        if self.dry_run:
            print("    [DRY RUN - skipped]")
            return subprocess.CompletedProcess(cmd, 0, "", "")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0 and check:
            print(f"    Error: {result.stderr}")
            raise RuntimeError(f"Command failed: {' '.join(cmd)}")
        
        if result.stdout:
            print(f"    {result.stdout.strip()}")
        
        return result
    
    def check_snet_cli(self) -> bool:
        """Check if snet-cli is installed."""
        print("\n1. Checking snet-cli installation...")
        try:
            result = subprocess.run(["snet", "version"], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"   ✓ snet-cli version: {result.stdout.strip()}")
                return True
        except FileNotFoundError:
            pass
        
        print("   ✗ snet-cli not found")
        print("   Install with: pip install snet-cli")
        return False
    
    def check_identity(self) -> bool:
        """Check if identity is configured."""
        print("\n2. Checking identity configuration...")
        
        result = subprocess.run(["snet", "identity", "list"], capture_output=True, text=True)
        
        if "medichain" in result.stdout.lower():
            print("   ✓ MediChain identity found")
            return True
        
        if result.stdout.strip():
            print(f"   ⚠ Available identities: {result.stdout.strip()}")
            return True
        
        print("   ✗ No identity configured")
        print("   Create with: snet identity create medichain key --private-key <key>")
        return False
    
    def set_network(self) -> bool:
        """Set the target network."""
        print(f"\n3. Setting network to {self.network}...")
        
        try:
            self.run_command(["snet", "network", self.network])
            print(f"   ✓ Network set to {self.network}")
            return True
        except RuntimeError:
            return False
    
    def check_organization(self) -> bool:
        """Check if organization exists."""
        print(f"\n4. Checking organization {ORG_ID}...")
        
        result = subprocess.run(
            ["snet", "organization", "info", ORG_ID],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            print(f"   ✓ Organization {ORG_ID} exists")
            return True
        
        print(f"   ⚠ Organization {ORG_ID} not found, will create")
        return False
    
    def create_organization(self) -> bool:
        """Create organization on the marketplace."""
        print(f"\n5. Creating organization {ORG_ID}...")
        
        try:
            # Initialize metadata
            self.run_command([
                "snet", "organization", "metadata-init",
                ORG_ID,
                "--org-type", "individual",
                "--display-name", ORG_NAME
            ])
            
            # Create organization
            self.run_command([
                "snet", "organization", "create", ORG_ID
            ])
            
            print(f"   ✓ Organization {ORG_ID} created")
            return True
            
        except RuntimeError as e:
            print(f"   ✗ Failed to create organization: {e}")
            return False
    
    def check_service(self) -> bool:
        """Check if service exists."""
        print(f"\n6. Checking service {SERVICE_ID}...")
        
        result = subprocess.run(
            ["snet", "service", "print-metadata", ORG_ID, SERVICE_ID],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            print(f"   ✓ Service {SERVICE_ID} exists")
            return True
        
        print(f"   ⚠ Service {SERVICE_ID} not found, will create")
        return False
    
    def prepare_metadata(self, endpoint: str) -> dict:
        """Prepare service metadata."""
        metadata = {
            "version": 1,
            "display_name": SERVICE_NAME,
            "encoding": "proto",
            "service_type": "grpc",
            "model_ipfs_hash": "",
            "mpe_address": "",
            "groups": [
                {
                    "group_name": GROUP_NAME,
                    "group_id": "",
                    "payment": {
                        "payment_address": "",
                        "payment_expiration_threshold": 40320,
                        "payment_channel_storage_type": "etcd",
                        "payment_channel_storage_client": {
                            "connection_timeout": "5s",
                            "request_timeout": "3s",
                            "endpoints": []
                        }
                    },
                    "pricing": [
                        {
                            "price_model": "fixed_price",
                            "price_in_cogs": PRICE_IN_COGS
                        }
                    ],
                    "endpoints": [endpoint],
                    "free_calls": FREE_CALLS,
                    "free_call_signer_address": ""
                }
            ],
            "service_description": {
                "url": "https://github.com/medichain-health/medichain",
                "short_description": "AI-powered clinical trial matching",
                "description": SERVICE_DESCRIPTION,
            },
            "tags": [
                "healthcare", "clinical-trials", "ai-matching",
                "medical-nlp", "patient-matching", "fhir"
            ]
        }
        return metadata
    
    def publish_service(self, endpoint: str) -> bool:
        """Publish service to marketplace."""
        print(f"\n7. Publishing service {SERVICE_ID}...")
        
        metadata_file = self.snet_dir / "service_metadata.json"
        
        try:
            # Use existing metadata file if present
            if metadata_file.exists():
                print(f"   Using existing metadata: {metadata_file}")
            else:
                # Create new metadata
                metadata = self.prepare_metadata(endpoint)
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
                print(f"   Created metadata: {metadata_file}")
            
            # Initialize service metadata
            self.run_command([
                "snet", "service", "metadata-init",
                "--metadata-file", str(metadata_file),
                "--display-name", SERVICE_NAME,
                "--encoding", "proto",
                "--service-type", "grpc",
                "--group-name", GROUP_NAME
            ], check=False)  # May fail if already initialized
            
            # Set pricing
            self.run_command([
                "snet", "service", "metadata-set-fixed-price",
                "--metadata-file", str(metadata_file),
                "--group-name", GROUP_NAME,
                "--price", str(PRICE_IN_COGS)
            ], check=False)
            
            # Set free calls
            self.run_command([
                "snet", "service", "metadata-set-free-calls",
                "--metadata-file", str(metadata_file),
                "--group-name", GROUP_NAME,
                "--free-calls", str(FREE_CALLS)
            ], check=False)
            
            # Add endpoint
            self.run_command([
                "snet", "service", "metadata-add-endpoints",
                "--metadata-file", str(metadata_file),
                "--group-name", GROUP_NAME,
                "--endpoints", endpoint
            ], check=False)
            
            # Publish
            self.run_command([
                "snet", "service", "publish",
                ORG_ID, SERVICE_ID,
                "--metadata-file", str(metadata_file)
            ])
            
            print(f"   ✓ Service {SERVICE_ID} published!")
            return True
            
        except RuntimeError as e:
            print(f"   ✗ Failed to publish service: {e}")
            return False
    
    def update_service(self, endpoint: Optional[str] = None) -> bool:
        """Update existing service metadata."""
        print(f"\n8. Updating service {SERVICE_ID}...")
        
        metadata_file = self.snet_dir / "service_metadata.json"
        
        try:
            if endpoint:
                self.run_command([
                    "snet", "service", "metadata-add-endpoints",
                    "--metadata-file", str(metadata_file),
                    "--group-name", GROUP_NAME,
                    "--endpoints", endpoint
                ], check=False)
            
            self.run_command([
                "snet", "service", "update-metadata",
                ORG_ID, SERVICE_ID,
                "--metadata-file", str(metadata_file)
            ])
            
            print(f"   ✓ Service {SERVICE_ID} updated!")
            return True
            
        except RuntimeError as e:
            print(f"   ✗ Failed to update service: {e}")
            return False
    
    def verify_publication(self) -> bool:
        """Verify service is published."""
        print("\n9. Verifying publication...")
        
        result = subprocess.run(
            ["snet", "service", "print-metadata", ORG_ID, SERVICE_ID],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            print("   ✓ Service verified on blockchain")
            print(f"\n   View on marketplace:")
            print(f"   https://marketplace.singularitynet.io/servicedetails/org/{ORG_ID}/service/{SERVICE_ID}")
            return True
        
        print("   ✗ Service not found on blockchain")
        return False
    
    def run(self, endpoint: str, create_org: bool = False, update_only: bool = False):
        """Run the full publishing workflow."""
        print("=" * 60)
        print("MediChain - SingularityNET Marketplace Publisher")
        print("=" * 60)
        print(f"Network: {self.network}")
        print(f"Endpoint: {endpoint}")
        print(f"Dry run: {self.dry_run}")
        
        # Check prerequisites
        if not self.check_snet_cli():
            sys.exit(1)
        
        if not self.check_identity():
            sys.exit(1)
        
        if not self.set_network():
            sys.exit(1)
        
        # Check/create organization
        org_exists = self.check_organization()
        if not org_exists:
            if create_org:
                if not self.create_organization():
                    sys.exit(1)
            else:
                print("\n   Use --create-org to create the organization")
                sys.exit(1)
        
        # Check/publish service
        service_exists = self.check_service()
        
        if update_only:
            if service_exists:
                if not self.update_service(endpoint):
                    sys.exit(1)
            else:
                print("   Service doesn't exist, cannot update")
                sys.exit(1)
        else:
            if service_exists:
                print("   Service exists, updating...")
                if not self.update_service(endpoint):
                    sys.exit(1)
            else:
                if not self.publish_service(endpoint):
                    sys.exit(1)
        
        # Verify
        self.verify_publication()
        
        print("\n" + "=" * 60)
        print("Publication complete!")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Publish MediChain to SingularityNET marketplace",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        "--network",
        choices=["mainnet", "sepolia"],
        default="mainnet",
        help="Target network (default: mainnet)"
    )
    
    parser.add_argument(
        "--endpoint",
        default="https://medichain.example.com:7001",
        help="Public endpoint for your service"
    )
    
    parser.add_argument(
        "--private-key",
        help="Ethereum private key (or set SNET_PRIVATE_KEY env var)"
    )
    
    parser.add_argument(
        "--create-org",
        action="store_true",
        help="Create organization if it doesn't exist"
    )
    
    parser.add_argument(
        "--update-only",
        action="store_true",
        help="Only update existing service, don't create"
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print commands without executing"
    )
    
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only check prerequisites, don't publish"
    )
    
    args = parser.parse_args()
    
    # Handle private key
    if args.private_key:
        os.environ["SNET_PRIVATE_KEY"] = args.private_key
    
    publisher = SNETPublisher(
        network=args.network,
        dry_run=args.dry_run
    )
    
    if args.check_only:
        publisher.check_snet_cli()
        publisher.check_identity()
        publisher.set_network()
        publisher.check_organization()
        publisher.check_service()
        return
    
    publisher.run(
        endpoint=args.endpoint,
        create_org=args.create_org,
        update_only=args.update_only
    )


if __name__ == "__main__":
    main()
