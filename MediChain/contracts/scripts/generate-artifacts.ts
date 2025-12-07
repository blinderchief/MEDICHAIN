import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Export contract ABI and deployment info for frontend and backend integration
 */
async function main() {
  console.log("📦 Generating contract artifacts...\n");

  // Load compiled contract
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/MediChainConsent.sol/MediChainConsent.json"
  );
  
  if (!fs.existsSync(artifactPath)) {
    console.error("❌ Contract artifact not found. Please compile first: npx hardhat compile");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  // Extract ABI
  const abi = artifact.abi;

  // Create output directories
  const backendOutputDir = path.join(__dirname, "../../backend/src/contracts");
  const frontendOutputDir = path.join(__dirname, "../../frontend/src/contracts");

  [backendOutputDir, frontendOutputDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Generate TypeScript types for frontend
  const frontendOutput = `// Auto-generated - do not edit manually
// Generated at: ${new Date().toISOString()}

export const MEDICHAIN_CONSENT_ABI = ${JSON.stringify(abi, null, 2)} as const;

export interface ConsentRecord {
  patientId: string;
  trialId: string;
  consentHash: string;
  timestamp: bigint;
  expiresAt: bigint;
  isActive: boolean;
  consentType: number;
}

export interface MatchRecord {
  patientId: string;
  trialId: string;
  matchScore: bigint;
  verifiedAt: bigint;
  isVerified: boolean;
}

// Contract addresses per network
export const CONTRACT_ADDRESSES = {
  "base-sepolia": process.env.NEXT_PUBLIC_CONSENT_CONTRACT_ADDRESS || "",
  "base-mainnet": process.env.NEXT_PUBLIC_CONSENT_CONTRACT_ADDRESS || "",
  hardhat: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Default hardhat address
} as const;

export type SupportedNetwork = keyof typeof CONTRACT_ADDRESSES;
`;

  // Generate Python types for backend
  const backendOutput = `"""
MediChain Consent Contract ABI and Types

Auto-generated - do not edit manually
Generated at: ${new Date().toISOString()}
"""

from typing import TypedDict, List
import json

MEDICHAIN_CONSENT_ABI = json.loads('''${JSON.stringify(abi)}''')


class ConsentRecord(TypedDict):
    """On-chain consent record structure."""
    patient_id: str
    trial_id: str
    consent_hash: str
    timestamp: int
    expires_at: int
    is_active: bool
    consent_type: int


class MatchRecord(TypedDict):
    """On-chain match verification record."""
    patient_id: str
    trial_id: str
    match_score: int
    verified_at: int
    is_verified: bool


# Contract addresses per network
CONTRACT_ADDRESSES = {
    "base-sepolia": "",  # Set via CONSENT_CONTRACT_ADDRESS env var
    "base-mainnet": "",
    "hardhat": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
}


def get_contract_address(network: str) -> str:
    """Get contract address for a given network."""
    import os
    
    env_address = os.getenv("CONSENT_CONTRACT_ADDRESS")
    if env_address:
        return env_address
    
    return CONTRACT_ADDRESSES.get(network, "")
`;

  // Write files
  fs.writeFileSync(
    path.join(frontendOutputDir, "MediChainConsent.ts"),
    frontendOutput
  );
  console.log("✅ Generated frontend types:", path.join(frontendOutputDir, "MediChainConsent.ts"));

  fs.writeFileSync(
    path.join(backendOutputDir, "medichain_consent.py"),
    backendOutput
  );
  console.log("✅ Generated backend types:", path.join(backendOutputDir, "medichain_consent.py"));

  // Also generate a simple JSON ABI file
  fs.writeFileSync(
    path.join(frontendOutputDir, "MediChainConsent.abi.json"),
    JSON.stringify(abi, null, 2)
  );
  fs.writeFileSync(
    path.join(backendOutputDir, "MediChainConsent.abi.json"),
    JSON.stringify(abi, null, 2)
  );
  console.log("✅ Generated ABI JSON files");

  console.log("\n🎉 Artifact generation complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Generation failed:", error);
    process.exit(1);
  });
