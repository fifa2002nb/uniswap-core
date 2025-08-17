#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found. Please run this command from the project root directory.');
  process.exit(1);
}

// Check if .env exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found.');
  console.log('Please create a .env file with the following content:');
  console.log('');
  console.log('BSC_TESTNET_URL=https://data-seed-prebsc-1-s1.binance.org:8545/');
  console.log('PRIVATE_KEY=your_private_key_here');
  console.log('BSCSCAN_API_KEY=your_bscscan_api_key_here');
  console.log('');
  console.log('You can copy from env.example: cp env.example .env');
  process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);
const network = args[0] || 'bsc-testnet';

console.log(`🚀 Deploying Uniswap V3 to ${network}...`);

// Run the deployment
const deployProcess = spawn('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', network], {
  stdio: 'inherit',
  shell: true
});

deployProcess.on('close', (code) => {
  if (code === 0) {
    console.log('');
    console.log('✅ Deployment completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify your contracts on BSCScan testnet');
    console.log('2. Test the factory by creating a pool');
    console.log('3. Check the deployment info in the deployments/ directory');
    console.log('');
    console.log('To verify contracts:');
    console.log(`npx hardhat run scripts/verify.js --network ${network}`);
  } else {
    console.error(`❌ Deployment failed with code ${code}`);
    process.exit(code);
  }
});
