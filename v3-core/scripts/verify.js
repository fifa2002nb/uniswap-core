const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🔍 Verifying Uniswap V3 contracts on", hre.network.name);
  console.log("Deployer address:", deployer.address);

  // Load deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found:", deploymentFile);
    console.log("Please run deployment first: npx hardhat run scripts/deploy.js --network", hre.network.name);
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  console.log("📄 Loaded deployment info:", deploymentInfo);

  try {
    // Verify UniswapV3Factory
    console.log("\n🔍 Verifying UniswapV3Factory...");
    await hre.run("verify:verify", {
      address: deploymentInfo.factory,
      constructorArguments: [],
    });
    console.log("✅ UniswapV3Factory verified successfully!");

    console.log("\n🎉 All contracts verified successfully!");
    console.log("\n📋 Verification Summary:");
    console.log("========================");
    console.log("Network:", hre.network.name);
    console.log("Factory:", deploymentInfo.factory);
    console.log("BSCScan URL:", `https://testnet.bscscan.com/address/${deploymentInfo.factory}`);

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    
    // Check if contracts are already verified
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contracts are already verified on BSCScan");
    } else {
      console.log("\n🔧 Manual verification steps:");
      console.log("1. Go to https://testnet.bscscan.com/");
      console.log("2. Search for contract address:", deploymentInfo.factory);
      console.log("3. Click 'Contract' tab");
      console.log("4. Click 'Verify and Publish'");
      console.log("5. Fill in the verification details");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });
