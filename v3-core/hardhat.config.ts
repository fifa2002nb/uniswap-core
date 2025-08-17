import 'hardhat-typechain'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import * as dotenv from 'dotenv'

dotenv.config()

export default {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrumRinkeby: {
      url: `https://arbitrum-rinkeby.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrum: {
      url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    optimismKovan: {
      url: `https://optimism-kovan.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    optimism: {
      url: `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY || ''}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    bnb: {
      url: `https://bsc-dataseed.binance.org/`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 56,
      gasPrice: 500000000, // 0.5 gwei
    },
    'bsc-testnet': {
      url: process.env.BSC_TESTNET_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 97,
      gasPrice: 500000000, // 0.5 gwei
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      ropsten: process.env.ETHERSCAN_API_KEY || '',
      rinkeby: process.env.ETHERSCAN_API_KEY || '',
      goerli: process.env.ETHERSCAN_API_KEY || '',
      kovan: process.env.ETHERSCAN_API_KEY || '',
      arbitrumRinkeby: process.env.ARBISCAN_API_KEY || '',
      arbitrum: process.env.ARBISCAN_API_KEY || '',
      optimismKovan: process.env.OPTIMISM_API_KEY || '',
      optimism: process.env.OPTIMISM_API_KEY || '',
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || '',
      bsc: process.env.BSCSCAN_API_KEY || '',
      bscTestnet: process.env.BSCSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com"
        }
      },
      {
        network: "bsc-testnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com"
        }
      }
    ]
  },
  solidity: {
    version: '0.7.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 800,
      },
      metadata: {
        // do not include the metadata hash, since this is machine dependent
        // and we want all generated code to be deterministic
        // https://docs.soliditylang.org/en/v0.7.6/metadata.html
        bytecodeHash: 'none',
      },
    },
  },
}
