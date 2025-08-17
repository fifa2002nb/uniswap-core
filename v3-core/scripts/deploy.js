const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying Uniswap V3 contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "BNB");

  // Deploy UniswapV3Factory (it includes the pool deployer functionality)
  console.log("\n🏭 Deploying UniswapV3Factory...");
  const UniswapV3Factory = await ethers.getContractFactory("UniswapV3Factory");
  const factory = await UniswapV3Factory.deploy();
  await factory.deployed();

  console.log("UniswapV3Factory deployed to:", factory.address);

  // Verify deployment
  const owner = await factory.owner();
  console.log("Verified owner:", owner);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    factory: factory.address,
    deployer: deployer.address,
    owner: owner,
    timestamp: new Date().toISOString(),
    chainId: hre.network.config.chainId,
  };

  console.log("\n✅ Deployment Summary:");
  console.log("=====================");
  console.log("Network:", deploymentInfo.network);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("Factory Address:", deploymentInfo.factory);
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
  const summaryContent = `# Uniswap V3 Deployment Summary

## Network: ${deploymentInfo.network}
- **Chain ID**: ${deploymentInfo.chainId}
- **Deployer**: ${deploymentInfo.deployer}
- **Owner**: ${deploymentInfo.owner}
- **Timestamp**: ${deploymentInfo.timestamp}

## Contract Addresses
- **UniswapV3Factory**: \`${deploymentInfo.factory}\`

## Next Steps
1. Verify contracts on BSCScan testnet
2. Test factory deployment by creating a pool
3. Test pool functionality with sample tokens

## Verification Commands
\`\`\`bash
# Verify Factory
npx hardhat verify --network ${hre.network.name} ${deploymentInfo.factory}
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
