# Uniswap V3

[![Lint](https://github.com/Uniswap/uniswap-v3-core/actions/workflows/lint.yml/badge.svg)](https://github.com/Uniswap/uniswap-v3-core/actions/workflows/lint.yml)
[![Tests](https://github.com/Uniswap/uniswap-v3-core/actions/workflows/tests.yml/badge.svg)](https://github.com/Uniswap/uniswap-v3-core/actions/workflows/tests.yml)
[![Fuzz Testing](https://github.com/Uniswap/uniswap-v3-core/actions/workflows/fuzz-testing.yml/badge.svg)](https://github.com/Uniswap/uniswap-v3-core/actions/workflows/fuzz-testing.yml)
[![Mythx](https://github.com/Uniswap/uniswap-v3-core/actions/workflows/mythx.yml/badge.svg)](https://github.com/Uniswap/uniswap-v3-core/actions/workflows/mythx.yml)
[![npm version](https://img.shields.io/npm/v/@uniswap/v3-core/latest.svg)](https://www.npmjs.com/package/@uniswap/v3-core/v/latest)

This repository contains the core smart contracts for the Uniswap V3 Protocol.
For higher level contracts, see the [uniswap-v3-periphery](https://github.com/Uniswap/uniswap-v3-periphery)
repository.

## Bug bounty

This repository is subject to the Uniswap V3 bug bounty program, per the terms defined [here](./bug-bounty.md).

## Local deployment

In order to deploy this code to a local testnet, you should install the npm package
`@uniswap/v3-core`
and import the factory bytecode located at
`@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json`.
For example:

```typescript
import {
  abi as FACTORY_ABI,
  bytecode as FACTORY_BYTECODE,
} from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'

// deploy the bytecode
```

This will ensure that you are testing against the same bytecode that is deployed to
mainnet and public testnets, and all Uniswap code will correctly interoperate with
your local deployment.

## Using solidity interfaces

The Uniswap v3 interfaces are available for import into solidity smart contracts
via the npm artifact `@uniswap/v3-core`, e.g.:

```solidity
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';

contract MyContract {
  IUniswapV3Pool pool;

  function doSomethingWithPool() {
    // pool.swap(...);
  }
}

```

## Licensing

The primary license for Uniswap V3 Core is the Business Source License 1.1 (`BUSL-1.1`), see [`LICENSE`](./LICENSE). However, some files are dual licensed under `GPL-2.0-or-later`:

- All files in `contracts/interfaces/` may also be licensed under `GPL-2.0-or-later` (as indicated in their SPDX headers), see [`contracts/interfaces/LICENSE`](./contracts/interfaces/LICENSE)
- Several files in `contracts/libraries/` may also be licensed under `GPL-2.0-or-later` (as indicated in their SPDX headers), see [`contracts/libraries/LICENSE`](contracts/libraries/LICENSE)

### Other Exceptions

- `contracts/libraries/FullMath.sol` is licensed under `MIT` (as indicated in its SPDX header), see [`contracts/libraries/LICENSE_MIT`](contracts/libraries/LICENSE_MIT)
- All files in `contracts/test` remain unlicensed (as indicated in their SPDX headers).

Creating Typechain artifacts in directory typechain for target ethers-v5
Successfully generated Typechain artifacts!
(node:20176) [DEP0044] DeprecationWarning: The `util.isArray` API is deprecated. Please use `Array.isArray()` instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
🚀 Deploying Uniswap V3 contracts with the account: 0x658F54C9bA37CF5C3cfE1775245a82fBa639314A
Account balance: 2.2711477967 BNB

🏭 Deploying UniswapV3Factory...
UniswapV3Factory deployed to: 0x5E8d6cD52e3aCD28D8fBB8d13FE2bB87015bF8c1
Verified owner: 0x658F54C9bA37CF5C3cfE1775245a82fBa639314A

✅ Deployment Summary:
=====================
Network: bsc-testnet
Chain ID: 97
Factory Address: 0x5E8d6cD52e3aCD28D8fBB8d13FE2bB87015bF8c1
Deployer: 0x658F54C9bA37CF5C3cfE1775245a82fBa639314A
Owner: 0x658F54C9bA37CF5C3cfE1775245a82fBa639314A
Timestamp: 2025-08-08T15:14:24.881Z