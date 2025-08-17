require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.5.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
      evmVersion: "istanbul",
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    "bsc-testnet": {
      url: process.env.BSC_TESTNET_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_private_key_here" 
        ? [process.env.PRIVATE_KEY] 
        : [],
      gasPrice: 500000000, // 0.5 gwei
    },
    "bsc-mainnet": {
      url: process.env.BSC_MAINNET_URL || "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_private_key_here" 
        ? [process.env.PRIVATE_KEY] 
        : [],
      gasPrice: 500000000, // 0.5 gwei
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
