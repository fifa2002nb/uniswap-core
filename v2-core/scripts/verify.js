const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Verifying deployment with account:", deployer.address);

  // Read deployment info
  const fs = require("fs");
  const path = require("path");
  const network = hre.network.name;
  const deploymentFile = path.join(__dirname, "../deployments", `${network}.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.error(`Deployment file not found: ${deploymentFile}`);
    console.log("Please run the deployment first: yarn deploy:bsc-testnet");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log("Deployment info:", deploymentInfo);

  // Verify the factory contract
  try {
    console.log(`\nVerifying UniswapV2Factory at ${deploymentInfo.factory}...`);
    
    // Get the contract factory
    const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
    
    // Attach to the deployed contract
    const factory = UniswapV2Factory.attach(deploymentInfo.factory);
    
    // Verify basic functionality
    const feeToSetter = await factory.feeToSetter();
    const allPairsLength = await factory.allPairsLength();
    
    console.log("✅ Factory verification successful!");
    console.log(`   FeeToSetter: ${feeToSetter}`);
    console.log(`   AllPairsLength: ${allPairsLength}`);
    console.log(`   Expected FeeToSetter: ${deploymentInfo.feeToSetter}`);
    
    if (feeToSetter.toLowerCase() === deploymentInfo.feeToSetter.toLowerCase()) {
      console.log("✅ FeeToSetter matches deployment info");
    } else {
      console.log("❌ FeeToSetter does not match deployment info");
    }
    
  } catch (error) {
    console.error("❌ Factory verification failed:", error.message);
  }

  console.log("\nVerification completed!");
  console.log("\nNext steps:");
  console.log("1. Visit BSCScan testnet to verify the contract:");
  console.log(`   https://testnet.bscscan.com/address/${deploymentInfo.factory}`);
  console.log("2. Test creating a pair using the factory");
  console.log("3. Test adding liquidity to the pair");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
