/*
Add liquidity to a v4 pool with native token (BNB) via PoolManager.modifyLiquidity using an unlock callback helper.

This script is specifically designed to handle native token pools.
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)'
];

async function main() {
  // Use native token config
  const configPath = path.resolve(__dirname, 'app.config.native.json');
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const cp = cfg.create_pool;
  const al = cfg.add_liquidity;
  
  if (!cp) throw new Error('scripts/app.config.native.json missing create_pool');
  if (!al) throw new Error('scripts/app.config.native.json missing add_liquidity');

  const manager = cp.manager;
  const token0 = cp.token0;
  const token1 = cp.token1;
  const fee = Number(cp.fee);
  const tickSpacing = Number(cp.tickSpacing);
  const hooks = (cp.hooks && cp.hooks !== '') ? cp.hooks : ethers.constants.AddressZero;

  let [signer] = await ethers.getSigners();
  const provider = ethers.provider;
  if (!signer) {
    const pk = process.env.PRIVATE_KEY;
    if (!pk || pk === 'your_private_key_here') throw new Error('No signer available. Set PRIVATE_KEY in .env');
    signer = new ethers.Wallet(pk, provider);
  }
  const deployer = await signer.getAddress();
  const recipient = al.recipient && al.recipient !== '' ? al.recipient : deployer;

  // Check if this is a native token pool
  const hasNativeToken = token0 === ethers.constants.AddressZero || token1 === ethers.constants.AddressZero;
  if (!hasNativeToken) {
    throw new Error('This script is designed for native token pools. Use addLiquidity.js for ERC20 pools.');
  }

  console.log('=== Native Token Pool Detected ===');
  console.log('token0 (native):', token0 === ethers.constants.AddressZero ? 'BNB (native)' : token0);
  console.log('token1:', token1 === ethers.constants.AddressZero ? 'BNB (native)' : token1);

  // Build PoolKey tuple
  const [a, b] = [token0, token1].sort((x, y) => (BigInt(x.toLowerCase()) < BigInt(y.toLowerCase()) ? -1 : 1));
  const key = [a, b, fee, tickSpacing, hooks];

  const managerAbi = [
    'function unlock(bytes) external returns (bytes memory)',
    'function modifyLiquidity((address,address,uint24,int24,address),(int24,int24,int256,bytes32),bytes) returns (int256,int256)',
    'function sync(address) external',
    'function settle() external payable returns (uint256)',
    'function mint(address,uint256,uint256) external',
  ];

  const managerC = new ethers.Contract(manager, managerAbi, signer);

  // Deploy helper that implements IUnlockCallback with native token support
  const source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPoolManagerMinimal {
    struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }
    struct ModifyLiquidityParams { int24 tickLower; int24 tickUpper; int256 liquidityDelta; bytes32 salt; }

    function unlock(bytes calldata data) external returns (bytes memory);
    function modifyLiquidity(PoolKey memory key, ModifyLiquidityParams memory params, bytes calldata hookData)
        external
        returns (int256 callerDelta, int256 feesAccrued);

    function sync(address currency) external;
    function settle() external payable returns (uint256);
    function mint(address to, uint256 id, uint256 amount) external;
    function take(address currency, address to, uint256 amount) external;
    function burn(address from, uint256 id, uint256 amount) external;
}

interface IUnlockCallbackMinimal {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract V4AddLiquidityHelper is IUnlockCallbackMinimal {
    IPoolManagerMinimal public immutable manager;

    constructor(IPoolManagerMinimal _m) { manager = _m; }

    struct Data {
        address sender;
        IPoolManagerMinimal.PoolKey key;
        IPoolManagerMinimal.ModifyLiquidityParams params;
        bytes hookData;
        bool useBurn;
        bool useClaims;
    }

    // Add receive function to accept native tokens
    receive() external payable {}

    function run(
        IPoolManagerMinimal.PoolKey memory key,
        IPoolManagerMinimal.ModifyLiquidityParams memory params,
        bytes memory hookData,
        bool useBurn,
        bool useClaims
    ) external payable returns (int256,int256) {
        bytes memory ret = manager.unlock(abi.encode(Data(msg.sender, key, params, hookData, useBurn, useClaims)));
        return abi.decode(ret,(int256,int256));
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(manager), 'only manager');
        Data memory d = abi.decode(rawData,(Data));
        (int256 callerDelta, ) = manager.modifyLiquidity(d.key, d.params, d.hookData);
        (int128 amt0, int128 amt1) = _decodeDelta(callerDelta);
        if (amt0 < 0) _settle(d.key.currency0, d.sender, uint256(uint128(-amt0)), d.useBurn);
        if (amt1 < 0) _settle(d.key.currency1, d.sender, uint256(uint128(-amt1)), d.useBurn);
        if (amt0 > 0) _take(d.key.currency0, d.sender, uint256(uint128(amt0)), d.useClaims);
        if (amt1 > 0) _take(d.key.currency1, d.sender, uint256(uint128(amt1)), d.useClaims);
        return abi.encode(amt0, amt1);
    }

    function _settle(address currency, address payer, uint256 amount, bool burn) internal {
        if (burn) {
            manager.burn(payer, uint160(currency), amount);
        } else if (currency == address(0)) {
            // For native token, we need to ensure the contract has enough balance
            // The contract should have received the native tokens via msg.value in the run() function
            require(address(this).balance >= amount, "Insufficient native token balance");
            manager.settle{value: amount}();
        } else {
            manager.sync(currency);
            if (payer != address(this)) {
                IERC20Minimal(currency).transferFrom(payer, address(manager), amount);
            } else {
                IERC20Minimal(currency).transfer(address(manager), amount);
            }
            manager.settle();
        }
    }

    function _take(address currency, address to, uint256 amount, bool claims) internal {
        if (claims) {
            manager.mint(to, uint160(currency), amount);
        } else {
            manager.take(currency, to, amount);
        }
    }

    function _decodeDelta(int256 d) internal pure returns (int128 amt0, int128 amt1) {
        assembly {
            amt0 := sar(128, d)
            amt1 := signextend(15, d)
        }
    }

    // Emergency function to withdraw any stuck native tokens
    function withdrawNative() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
`;

  // Write helper to disk and compile
  const helperPath = path.resolve(__dirname, '../tmp/V4AddLiquidityHelperNative.sol');
  const helperDir = path.dirname(helperPath);
  fs.mkdirSync(helperDir, { recursive: true });
  fs.writeFileSync(helperPath, source, 'utf8');

  // Deploy helper
  const HelperFactory = await ethers.getContractFactory('V4AddLiquidityHelper', signer);
  const helper = await HelperFactory.deploy(manager);
  await helper.deployed();

  console.log('Helper deployed at:', helper.address);

  // Pre-approve helper to pull ERC20s as needed for settlement
  if (token0 !== ethers.constants.AddressZero) {
    const t0 = new ethers.Contract(token0, ERC20_ABI, signer);
    const sym0 = await t0.symbol().catch(() => 'T0');
    const MAX = ethers.constants.MaxUint256;
    const allow0 = await t0.allowance(deployer, helper.address).catch(() => ethers.constants.Zero);
    if (allow0.lt(MAX.div(2))) {
      console.log(`approve ${sym0} to helper...`);
      const tx = await t0.approve(helper.address, MAX);
      await tx.wait();
    }
  }

  if (token1 !== ethers.constants.AddressZero) {
    const t1 = new ethers.Contract(token1, ERC20_ABI, signer);
    const sym1 = await t1.symbol().catch(() => 'T1');
    const MAX = ethers.constants.MaxUint256;
    const allow1 = await t1.allowance(deployer, helper.address).catch(() => ethers.constants.Zero);
    if (allow1.lt(MAX.div(2))) {
      console.log(`approve ${sym1} to helper...`);
      const tx = await t1.approve(helper.address, MAX);
      await tx.wait();
    }
  }

  const params = {
    tickLower: Number(al.tickLower),
    tickUpper: Number(al.tickUpper),
    liquidityDelta: ethers.BigNumber.from(String(al.liquidityDelta)).toString(),
    salt: al.salt || '0x0000000000000000000000000000000000000000000000000000000000000000'
  };

  console.log('manager   :', manager);
  console.log('helper    :', helper.address);
  console.log('key       :', key);
  console.log('params    :', params);

  // Calculate native token value to send
  // For native token pools, we need to send BNB to cover the liquidity
  const liquidityDelta = ethers.BigNumber.from(al.liquidityDelta);
  console.log('liquidityDelta:', liquidityDelta);
  // Rough estimate: assume 1:1 ratio for native token
  // You might need to adjust this calculation based on your specific pool
  //const nativeValue = liquidityDelta.div(1000); // Adjust this calculation as needed
  const nativeValue = liquidityDelta;
  
  console.log('Native token (BNB) value to send:', ethers.utils.formatEther(nativeValue), 'BNB');
  console.log('Current account BNB balance:', ethers.utils.formatEther(await signer.getBalance()), 'BNB');

  // Check if we have enough BNB
  if (await signer.getBalance() < nativeValue) {
    throw new Error(`Insufficient BNB balance. Need ${ethers.utils.formatEther(nativeValue)} BNB, have ${ethers.utils.formatEther(await signer.getBalance())} BNB`);
  }

  const tx = await helper.run(key, params, '0x', !!al.useBurn, !!al.useClaims, { value: nativeValue });
  const receipt = await tx.wait();
  console.log('tx        :', receipt.transactionHash);
  console.log('Done.');
}

main().catch((e) => { 
  console.error('Main error:', e); 
  process.exit(1); 
});
