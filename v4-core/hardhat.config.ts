import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 44444444,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      gas: 300000000,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY || ""}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY || ""}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY || ""}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    bnb: {
      url: `https://bsc-dataseed.binance.org/`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 56,
      gasPrice: 500000000, // 0.5 gwei
    },
    "bsc-testnet": {
      url: process.env.BSC_TESTNET_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 97,
      gasPrice: 500000000, // 0.5 gwei
    },
  },
  paths: {
    sources: "./src/deploy",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000
  },
};

export default config;
