/*
Add liquidity to an existing Uniswap V2 pair by direct core interactions:
 - transfers tokenA & tokenB to the pair
 - calls pair.mint(to) to mint LP tokens

Config (scripts/app.config.json):
{
  "add_liquidity": {
    "factory": "0x...",
    "tokenA": "0x...",
    "tokenB": "0x...",
    "amountA": "1.0",
    "amountB": "1.0",
    "to": "0x..." // optional; defaults to deployer
  }
}

Usage:
  npx hardhat run --network bsc-testnet scripts/addLiquidity.js
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 value) returns (bool)'
];

const PAIR_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function mint(address to) returns (uint256 liquidity)',
  'event Mint(address indexed sender, uint256 amount0, uint256 amount1)'
];

async function main() {
  const configPath = path.resolve(__dirname, 'app.config.json');
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!cfg.add_liquidity) throw new Error('scripts/app.config.json missing add_liquidity');

  const { factory, tokenA, tokenB, amountA, amountB, to } = cfg.add_liquidity;
  if (!factory || !tokenA || !tokenB || amountA === undefined || amountB === undefined) {
    throw new Error('add_liquidity requires { factory, tokenA, tokenB, amountA, amountB }');
  }

  let [signer] = await ethers.getSigners();
  const provider = ethers.provider;
  if (!signer) {
    const pk = process.env.PRIVATE_KEY;
    if (!pk || pk === 'your_private_key_here') {
      throw new Error('No signer available. Please set PRIVATE_KEY in .env');
    }
    signer = new ethers.Wallet(pk, provider);
  }
  const toAddress = to && to !== '' ? to : await signer.getAddress();

  const factoryC = new ethers.Contract(factory, FACTORY_ABI, provider);
  const pair = await factoryC.getPair(tokenA, tokenB);
  if (pair === ethers.constants.AddressZero) {
    throw new Error('Pair does not exist. Create it first.');
  }

  const pairC = new ethers.Contract(pair, PAIR_ABI, provider);
  const token0 = await pairC.token0();
  const token1 = await pairC.token1();

  const tA = new ethers.Contract(tokenA, ERC20_ABI, signer);
  const tB = new ethers.Contract(tokenB, ERC20_ABI, signer);
  const [decA, decB] = await Promise.all([tA.decimals(), tB.decimals()]);
  const [symA, symB] = await Promise.all([tA.symbol().catch(()=> 'TKA'), tB.symbol().catch(()=> 'TKB')]);

  const amtA = ethers.utils.parseUnits(String(amountA), decA);
  const amtB = ethers.utils.parseUnits(String(amountB), decB);

  const balA = await tA.balanceOf(await signer.getAddress());
  const balB = await tB.balanceOf(await signer.getAddress());
  if (balA.lt(amtA) || balB.lt(amtB)) {
    throw new Error('Insufficient token balances to add liquidity');
  }

  const [reserve0Before, reserve1Before] = await pairC.getReserves().then(r => [r.reserve0, r.reserve1]);

  console.log('Pair        :', pair);
  console.log('tokenA      :', tokenA, `(${symA}, dec=${decA})`);
  console.log('tokenB      :', tokenB, `(${symB}, dec=${decB})`);
  console.log('amountA     :', amtA.toString());
  console.log('amountB     :', amtB.toString());
  console.log('recipient   :', toAddress);
  console.log('reserves0/1 :', reserve0Before.toString(), reserve1Before.toString());

  // transfer tokens to pair
  const tx1 = await tA.transfer(pair, amtA);
  await tx1.wait();
  const tx2 = await tB.transfer(pair, amtB);
  await tx2.wait();

  // mint LP tokens to recipient
  const pairWithSigner = pairC.connect(signer);
  const mintTx = await pairWithSigner.mint(toAddress);
  const receipt = await mintTx.wait();

  // parse Mint event if present
  let minted0 = null, minted1 = null, liquidityMinted = null;
  try {
    for (const log of receipt.logs) {
      try {
        const parsed = pairC.interface.parseLog(log);
        if (parsed.name === 'Mint') {
          minted0 = parsed.args.amount0;
          minted1 = parsed.args.amount1;
        }
      } catch (_) {}
    }
  } catch (_) {}

  // read LP minted via return value if accessible (not directly from receipt), fallback to reserves delta
  const [reserve0After, reserve1After] = await pairC.getReserves().then(r => [r.reserve0, r.reserve1]);

  console.log('Minted0/1   :', minted0 ? minted0.toString() : 'n/a', minted1 ? minted1.toString() : 'n/a');
  console.log('Reserves new:', reserve0After.toString(), reserve1After.toString());
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


