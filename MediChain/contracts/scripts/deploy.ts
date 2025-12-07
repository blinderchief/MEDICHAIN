import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying MediChain Consent Contract...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ASI Token address on Base Sepolia (placeholder - replace with actual address)
  const ASI_TOKEN_ADDRESS = process.env.ASI_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  // SingularityNET MPE address (placeholder - replace with actual address)
  const MPE_ADDRESS = process.env.MPE_ADDRESS || "0x0000000000000000000000000000000000000000";

  console.log("📝 Constructor arguments:");
  console.log("   - ASI Token:", ASI_TOKEN_ADDRESS);
  console.log("   - MPE Address:", MPE_ADDRESS);
  console.log("");

  // Deploy the contract
  const MediChainConsent = await ethers.getContractFactory("MediChainConsent");
  const consent = await MediChainConsent.deploy(ASI_TOKEN_ADDRESS, MPE_ADDRESS);
  
  await consent.waitForDeployment();
  const contractAddress = await consent.getAddress();

  console.log("✅ MediChainConsent deployed to:", contractAddress);
  console.log("");

  // Set up initial roles
  console.log("🔐 Setting up roles...");
  
  // Grant ADMIN_ROLE to deployer (already has DEFAULT_ADMIN_ROLE)
  const ADMIN_ROLE = await consent.ADMIN_ROLE();
  const VERIFIER_ROLE = await consent.VERIFIER_ROLE();
  
  console.log("   - ADMIN_ROLE:", ADMIN_ROLE);
  console.log("   - VERIFIER_ROLE:", VERIFIER_ROLE);
  console.log("");

  // Verify contract configuration
  console.log("⚙️  Contract configuration:");
  console.log("   - Base reward:", ethers.formatEther(await consent.baseRewardAmount()), "ASI");
  console.log("   - Min consent duration:", (await consent.minConsentDuration()).toString(), "seconds");
  console.log("   - Max consent duration:", (await consent.maxConsentDuration()).toString(), "seconds");
  console.log("");

  // Output deployment info for backend configuration
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 Add to your .env file:");
  console.log(`CONSENT_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Verify on block explorer (if not localhost)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337n) { // Not Hardhat local network
    console.log("\n📡 Waiting for block confirmations for verification...");
    // Wait for 5 block confirmations
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log("\n🔍 Verify contract with:");
    console.log(`npx hardhat verify --network base-sepolia ${contractAddress} "${ASI_TOKEN_ADDRESS}" "${MPE_ADDRESS}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
