/*
Add liquidity to a Uniswap V3 pool using TestUniswapV3Callee (implements IUniswapV3MintCallback).

Flow:
 1) Deploy TestUniswapV3Callee if not provided
 2) Approve callee to spend token0 & token1
 3) Call callee.mint(pool, recipient, tickLower, tickUpper, liquidity)

Config (scripts/app.config.json):
{
  "add_liquidity": {
    "pool": "0x...",              // required
    "tickLower": -60000,            // required
    "tickUpper":  60000,            // required
    "liquidity":  "100000",        // uint128 as string
    "recipient": "",               // optional; defaults to deployer
    "callee": ""                   // optional; pre-deployed TestUniswapV3Callee
  }
}

Usage:
  npx hardhat run --network bsc-testnet scripts/addLiquidity.js
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

const POOL_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function tickSpacing() view returns (int24)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick,,,,,)'   
];

const FACTORY_ABI = [
  'function getPool(address tokenA,address tokenB,uint24 fee) view returns (address)'
];

async function main() {
  const configPath = path.resolve(__dirname, 'app.config.json');
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!cfg.add_liquidity) throw new Error('scripts/app.config.json missing add_liquidity');

  let { pool, tickLower, tickUpper, liquidity, recipient, callee } = cfg.add_liquidity;
  const provider = ethers.provider;
  if (!pool) {
    // try load from create_pool
    const cp = cfg.create_pool;
    if (!cp || !cp.factory || !cp.token0 || !cp.token1 || cp.fee === undefined) {
      throw new Error('add_liquidity requires pool, or provide create_pool.{factory,token0,token1,fee}');
    }
    const factory = new ethers.Contract(cp.factory, FACTORY_ABI, provider);
    // sort tokens for factory.getPool (expects token0 < token1)
    const [a, b] = [cp.token0, cp.token1].sort((x, y) => (BigInt(x.toLowerCase()) < BigInt(y.toLowerCase()) ? -1 : 1));
    pool = await factory.getPool(a, b, Number(cp.fee));
    if (pool === ethers.constants.AddressZero) throw new Error('Factory returned zero pool. Ensure pool is created.');
  }
  if (tickLower === undefined || tickUpper === undefined || liquidity === undefined) {
    throw new Error('add_liquidity requires tickLower, tickUpper, liquidity');
  }

  let [signer] = await ethers.getSigners();
  if (!signer) {
    const pk = process.env.PRIVATE_KEY;
    if (!pk || pk === 'your_private_key_here') throw new Error('No signer available. Set PRIVATE_KEY in .env');
    signer = new ethers.Wallet(pk, provider);
  }
  const deployer = await signer.getAddress();
  const recipientAddr = recipient && recipient !== '' ? recipient : deployer;

  const poolC = new ethers.Contract(pool, POOL_ABI, provider);
  const token0 = await poolC.token0();
  const token1 = await poolC.token1();
  const [t0, t1] = [
    new ethers.Contract(token0, ERC20_ABI, signer),
    new ethers.Contract(token1, ERC20_ABI, signer)
  ];
  const [dec0, dec1] = await Promise.all([t0.decimals(), t1.decimals()]);
  const [sym0, sym1] = await Promise.all([t0.symbol().catch(()=> 'T0'), t1.symbol().catch(()=> 'T1')]);
  const { sqrtPriceX96, tick } = await poolC.slot0();

  // Deploy or use provided TestUniswapV3Callee
  let calleeAddr = callee && callee !== '' ? callee : undefined;
  if (!calleeAddr) {
    const Callee = await ethers.getContractFactory('TestUniswapV3Callee', signer);
    const calleeCtr = await Callee.deploy();
    await calleeCtr.deployed();
    calleeAddr = calleeCtr.address;
  }

  // Approve callee to spend tokens on behalf of deployer
  const MAX = ethers.constants.MaxUint256;
  const allow0 = await t0.allowance(deployer, calleeAddr);
  if (allow0.lt(MAX.div(2))) {
    const tx = await t0.approve(calleeAddr, MAX);
    await tx.wait();
  }
  const allow1 = await t1.allowance(deployer, calleeAddr);
  if (allow1.lt(MAX.div(2))) {
    const tx = await t1.approve(calleeAddr, MAX);
    await tx.wait();
  }

  console.log('pool        :', pool);
  console.log('callee      :', calleeAddr);
  console.log('recipient   :', recipientAddr);
  console.log('token0/1    :', token0, `(${sym0}/${sym1})`);
  console.log('dec0/1      :', dec0, dec1);
  // snap ticks to spacing multiples
  const spacing = await poolC.tickSpacing();
  function snapDown(x, s) { return Math.floor(x / s) * s; }
  function snapUp(x, s) { return Math.ceil(x / s) * s; }
  const tickLowerSnap = snapDown(Number(tickLower), Number(spacing));
  const tickUpperSnap = snapUp(Number(tickUpper), Number(spacing));
  if (tickLowerSnap >= tickUpperSnap) throw new Error('tickLower must be < tickUpper after snapping to spacing');

  console.log('tickSpacing :', spacing);
  console.log('tickLower   :', tickLowerSnap, 'tickUpper:', tickUpperSnap, 'current tick:', tick);
  console.log('sqrtPriceX96:', sqrtPriceX96.toString());
  console.log('liquidity   :', String(liquidity));

  const calleeIface = new ethers.utils.Interface([
    'function mint(address pool,address recipient,int24 tickLower,int24 tickUpper,uint128 amount) external'
  ]);
  const calleeC = new ethers.Contract(calleeAddr, calleeIface.fragments, signer);

  // Perform mint
  const tx = await calleeC.mint(
    pool,
    recipientAddr,
    tickLowerSnap,
    tickUpperSnap,
    ethers.BigNumber.from(String(liquidity))
  );
  const receipt = await tx.wait();
  console.log('Mint tx     :', receipt.transactionHash);
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


