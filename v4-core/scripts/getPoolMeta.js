/*
Reads pool meta from PoolManager using extsload.

Usage:
  npx hardhat run --network bsc-testnet scripts/getPoolMeta.js

Data source:
  scripts/app.config.json create_pool: { manager, token0, token1, fee, tickSpacing, sqrtPriceX96?, hooks? }
*/

const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

function toChecksum(addr) {
  return ethers.utils.getAddress(addr);
}

function sortTokens(a, b) {
  // sort by address lexicographically (as numbers)
  const aa = BigInt(a.toLowerCase());
  const bb = BigInt(b.toLowerCase());
  return aa < bb ? [a, b] : [b, a];
}

function bnToHex32(n) {
  const hex = n.toString(16);
  return '0x' + hex.padStart(64, '0');
}

async function main() {
  const configPath = path.resolve(__dirname, 'app.config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  if (!cfg.create_pool) throw new Error('scripts/app.config.json missing create_pool');

  const { manager, token0, token1, fee, tickSpacing, hooks } = cfg.create_pool;
  if (!manager || !token0 || !token1 || fee === undefined || tickSpacing === undefined) {
    throw new Error('create_pool requires { manager, token0, token1, fee, tickSpacing }');
  }

  const hooksAddr = hooks && hooks !== '' ? hooks : ethers.constants.AddressZero;

  // sort tokens to form PoolKey correctly
  const [t0, t1] = sortTokens(token0, token1);

  const poolKeyTypes = [
    'tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)'
  ];
  const poolKeyValue = [
    [t0, t1, Number(fee), Number(tickSpacing), hooksAddr]
  ];

  // poolId = keccak256(abi.encode(poolKey))
  const encoded = ethers.utils.defaultAbiCoder.encode(poolKeyTypes, poolKeyValue);
  const poolId = ethers.utils.keccak256(encoded);

  // mapping slot index for pools is 6 (see StateLibrary.POOLS_SLOT)
  const POOLS_SLOT = 6n;
  const stateSlot = ethers.utils.keccak256(
    ethers.utils.solidityPack(['bytes32', 'uint256'], [poolId, POOLS_SLOT])
  );

  const managerAbi = [
    'function extsload(bytes32) view returns (bytes32)',
    'function extsload(bytes32,uint256) view returns (bytes32[])'
  ];
  const provider = ethers.provider;
  const mgr = new ethers.Contract(manager, managerAbi, provider);

  // slot0 packed at stateSlot
  const packed = await mgr['extsload(bytes32)'](stateSlot);
  const d = BigInt(packed);
  const mask160 = (1n << 160n) - 1n;
  const mask24 = (1n << 24n) - 1n;
  const sqrtPriceX96 = d & mask160;
  const tickRaw = (d >> 160n) & mask24;
  const protocolFee = Number((d >> 184n) & mask24);
  const lpFee = Number((d >> 208n) & mask24);
  const tick = tickRaw >= (1n << 23n) ? Number(tickRaw - (1n << 24n)) : Number(tickRaw);

  // liquidity at stateSlot + 3
  const liquiditySlot = bnToHex32(BigInt(stateSlot) + 3n);
  const liqWord = await mgr['extsload(bytes32)'](liquiditySlot);
  const liquidity = BigInt(liqWord) & ((1n << 128n) - 1n);

  // try read ERC20 decimals & symbols for nicer price output (best-effort)
  const erc20Abi = [
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ];
  async function safeCall(addr, fn, fallback) {
    try {
      return await fn(addr);
    } catch (_) {
      return fallback;
    }
  }
  const dec0 = await safeCall(t0, (a)=> new ethers.Contract(a, erc20Abi, provider).decimals(), 18);
  const dec1 = await safeCall(t1, (a)=> new ethers.Contract(a, erc20Abi, provider).decimals(), 18);
  const sym0 = await safeCall(t0, (a)=> new ethers.Contract(a, erc20Abi, provider).symbol(), 'T0');
  const sym1 = await safeCall(t1, (a)=> new ethers.Contract(a, erc20Abi, provider).symbol(), 'T1');

  // compute price token1 per token0
  let price1Per0 = null;
  if (sqrtPriceX96 !== 0n) {
    // price = (sqrtP^2) / 2^192 adjusted by decimals
    const num = sqrtPriceX96 * sqrtPriceX96;
    const denom = 1n << 192n;
    const ratio = Number((num * 10n ** BigInt(dec0)) / denom) / 10 ** dec1;
    price1Per0 = ratio;
  }

  console.log('=== Pool Meta (v4) ===');
  console.log('manager        :', toChecksum(manager));
  console.log('poolId         :', poolId);
  console.log('token0         :', toChecksum(t0), `(${sym0}, decimals=${dec0})`);
  console.log('token1         :', toChecksum(t1), `(${sym1}, decimals=${dec1})`);
  console.log('fee            :', Number(fee));
  console.log('tickSpacing    :', Number(tickSpacing));
  console.log('hooks          :', toChecksum(hooksAddr));
  console.log('sqrtPriceX96   :', sqrtPriceX96.toString());
  console.log('tick           :', tick);
  console.log('lpFee (swap)   :', lpFee);
  console.log('protocolFee    :', protocolFee);
  console.log('liquidity      :', liquidity.toString());
  if (price1Per0 !== null) {
    console.log(`price ${sym1}/${sym0}:`, price1Per0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


