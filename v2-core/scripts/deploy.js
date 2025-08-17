const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy UniswapV2Factory
  const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2Factory.deploy(deployer.address);
  await factory.deployed();

  console.log("UniswapV2Factory deployed to:", factory.address);
  console.log("FeeToSetter set to:", deployer.address);

  // Verify deployment
  const feeToSetter = await factory.feeToSetter();
  console.log("Verified feeToSetter:", feeToSetter);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    factory: factory.address,
    feeToSetter: feeToSetter,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log("Network:", deploymentInfo.network);
  console.log("Factory Address:", deploymentInfo.factory);
  console.log("FeeToSetter:", deploymentInfo.feeToSetter);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("Timestamp:", deploymentInfo.timestamp);

  // Save to file
  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deploymentFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
