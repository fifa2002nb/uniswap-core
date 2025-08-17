const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return undefined; } }
function appConfigPath() { return path.join(__dirname, "app.config.json"); }

async function main() {
  const [signer] = await ethers.getSigners();
  const p = appConfigPath();
  const root = readJSON(p);
  const cfg = root && root.create_pool ? root.create_pool : undefined;
  if (!cfg || !cfg.factory || !cfg.token0 || !cfg.token1 || !cfg.fee || !cfg.sqrtPriceX96) {
    console.error("scripts/app.config.json missing create_pool.{factory,token0,token1,fee,sqrtPriceX96}");
    process.exit(1);
  }

  const { factory, token0, token1, fee, sqrtPriceX96 } = cfg;

  console.log("Signer:", signer.address);
  console.log({ factory, token0, token1, fee, sqrtPriceX96 });

  const factoryCtr = await ethers.getContractAt("UniswapV3Factory", factory, signer);

  console.log("Creating pool...");
  const tx = await factoryCtr.createPool(token0, token1, fee);
  const rc = await tx.wait();

  const pool = await factoryCtr.getPool(token0, token1, fee);
  console.log("Pool:", pool);

  console.log("Initializing pool...");
  const poolCtr = await ethers.getContractAt("UniswapV3Pool", pool, signer);
  const tx2 = await poolCtr.initialize(sqrtPriceX96);
  await tx2.wait();
  console.log("Initialized.");

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${hre.network.name}-pools.json`);
  let data = {};
  if (fs.existsSync(file)) { try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch {} }
  const rec = {
    network: hre.network.name,
    factory,
    token0,
    token1,
    fee,
    sqrtPriceX96,
    pool,
    txCreate: tx.hash,
    timestamp: new Date().toISOString(),
  };
  if (!Array.isArray(data.records)) data.records = [];
  data.records.push(rec);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Saved: ${file}`);
}

main().catch((e) => { console.error("Failed to create V3 pool:", e); process.exit(1); });
