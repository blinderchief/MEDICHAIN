const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying MediChainConsent...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const MediChainConsent = await ethers.getContractFactory("MediChainConsent");
  const contract = await MediChainConsent.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n✅ MediChainConsent deployed successfully!");
  console.log("Contract Address:", address);
  console.log("\n📝 Add this to your .env files:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
