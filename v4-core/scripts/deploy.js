const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying Uniswap V4 contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "BNB");

  // Deploy PoolManager (includes ProtocolFees, ERC6909, and ERC6909Claims functionality)
  console.log("\n🏊 Deploying PoolManager...");
  const PoolManager = await ethers.getContractFactory("PoolManager");
  const poolManager = await PoolManager.deploy(deployer.address);
  await poolManager.deployed();

  console.log("PoolManager deployed to:", poolManager.address);

  // Verify deployments
  const poolManagerOwner = await poolManager.owner();
  console.log("Verified PoolManager owner:", poolManagerOwner);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    poolManager: poolManager.address,
    deployer: deployer.address,
    owner: poolManagerOwner,
    timestamp: new Date().toISOString(),
    chainId: hre.network.config.chainId,
  };

  console.log("\n✅ Deployment Summary:");
  console.log("=====================");
  console.log("Network:", deploymentInfo.network);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("PoolManager Address:", deploymentInfo.poolManager);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("Owner:", deploymentInfo.owner);
  console.log("Timestamp:", deploymentInfo.timestamp);

  // Save to file
  const deploymentsDir = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to: ${deploymentFile}`);

  // Create a summary file
  const summaryFile = path.join(deploymentsDir, "deployment-summary.md");
  const summaryContent = `# Uniswap V4 Deployment Summary

## Network: ${deploymentInfo.network}
- **Chain ID**: ${deploymentInfo.chainId}
- **Deployer**: ${deploymentInfo.deployer}
- **Owner**: ${deploymentInfo.owner}
- **Timestamp**: ${deploymentInfo.timestamp}

## Contract Addresses
- **PoolManager**: \`${deploymentInfo.poolManager}\` (includes ProtocolFees, ERC6909, and ERC6909Claims functionality)

## Next Steps
1. Verify contracts on BSCScan testnet
2. Test PoolManager functionality
3. Test protocol fees collection
4. Test ERC6909 token functionality

## Verification Commands
\`\`\`bash
# Verify PoolManager
npx hardhat verify --network ${hre.network.name} ${deploymentInfo.poolManager} ${deploymentInfo.deployer}
\`\`\`
`;

  fs.writeFileSync(summaryFile, summaryContent);
  console.log(`📋 Deployment summary saved to: ${summaryFile}`);

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
