# Uniswap V2

[![Actions Status](https://github.com/Uniswap/uniswap-v2-core/workflows/CI/badge.svg)](https://github.com/Uniswap/uniswap-v2-core/actions)
[![Version](https://img.shields.io/npm/v/@uniswap/v2-core)](https://www.npmjs.com/package/@uniswap/v2-core)

In-depth documentation on Uniswap V2 is available at [uniswap.org](https://uniswap.org/docs).

The built contract artifacts can be browsed via [unpkg.com](https://unpkg.com/browse/@uniswap/v2-core@latest/).

# Local Development

The following assumes the use of `node@>=10`.

## Install Dependencies

```bash
yarn
# or
npm install
```

## Compile Contracts

```bash
yarn compile
```

## Run Tests

```bash
yarn test
```

# BSC Testnet Deployment

This project has been enhanced to support deployment to BSC (Binance Smart Chain) testnet using npx.

## Quick Deployment

### Using npx (Recommended)

```bash
# Deploy to BSC testnet
npx uniswap-v2-deploy bsc-testnet

# Deploy to local network
npx uniswap-v2-deploy localhost
```

### Using yarn/npm scripts

```bash
# Compile with Hardhat
yarn compile:hardhat

# Deploy to BSC testnet
yarn deploy:bsc-testnet

# Deploy to local network
yarn deploy:local
```

## Setup for Deployment

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

3. **Configure your .env file:**
   ```env
   # BSC Testnet Configuration
   BSC_TESTNET_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
   
   # Your private key (without 0x prefix)
   PRIVATE_KEY=your_private_key_here
   ```

## Network Information

### BSC Testnet
- **Chain ID:** 97
- **RPC URL:** https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer:** https://testnet.bscscan.com/
- **Currency:** tBNB

### BSC Mainnet
- **Chain ID:** 56
- **RPC URL:** https://bsc-dataseed.binance.org/
- **Explorer:** https://bscscan.com/
- **Currency:** BNB

## Detailed Deployment Guide

For detailed deployment instructions, troubleshooting, and post-deployment steps, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Security Notes

- Never commit your `.env` file to version control
- Keep your private key secure
- Test thoroughly on testnet before mainnet deployment
- Consider using a hardware wallet for mainnet deployments

Deploying contracts with the account: 0x658F54C9bA37CF5C3cfE1775245a82fBa639314A
Account balance: 2302726076700000000
UniswapV2Factory deployed to: 0xD56cE9501890f58755Af71c26A403f7FE9465944
FeeToSetter set to: 0x658F54C9bA37CF5C3cfE1775245a82fBa639314A
Verified feeToSetter: 0x658F54C9bA37CF5C3cfE1775245a82fBa639314A

Deployment Summary:
===================
Network: bsc-testnet
Factory Address: 0xD56cE9501890f58755Af71c26A403f7FE9465944
FeeToSetter: 0x658F54C9bA37CF5C3cfE1775245a82fBa639314A
Deployer: 0x658F54C9bA37CF5C3cfE1775245a82fBa639314A
Timestamp: 2025-08-08T14:43:54.154Z
