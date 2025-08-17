const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function readJSON(filePath) { try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return undefined; } }
function saveJSON(filePath, obj) { fs.writeFileSync(filePath, JSON.stringify(obj, null, 2)); }

function appConfigPath() { return path.join(__dirname, "app.config.json"); }

async function main() {
  const [signer] = await ethers.getSigners();
  const cfgPath = appConfigPath();
  const root = readJSON(cfgPath);
  const cfg = root && root.create_pair ? root.create_pair : undefined;

  if (!cfg || !cfg.factory || !cfg.tokenA || !cfg.tokenB) {
    console.error("scripts/app.config.json missing create_pair.{factory,tokenA,tokenB}");
    process.exit(1);
  }

  const factoryAddress = cfg.factory;
  const tokenA = cfg.tokenA;
  const tokenB = cfg.tokenB;

  console.log("Using signer:", signer.address);
  console.log("Factory:", factoryAddress);
  console.log("TokenA:", tokenA);
  console.log("TokenB:", tokenB);

  const factory = await ethers.getContractAt("UniswapV2Factory", factoryAddress, signer);

  console.log("Creating pair...");
  const tx = await factory.createPair(tokenA, tokenB);
  const receipt = await tx.wait();

  const [token0, token1] = ethers.BigNumber.from(tokenA).lt(ethers.BigNumber.from(tokenB))
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
  const pair = await factory.getPair(token0, token1);

  console.log("Pair created at:", pair);

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${hre.network.name}-pairs.json`);
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  }
  const record = {
    network: hre.network.name,
    factory: factoryAddress,
    tokenA,
    tokenB,
    token0,
    token1,
    pair,
    txHash: receipt.transactionHash,
    timestamp: new Date().toISOString(),
  };
  if (!Array.isArray(data.records)) data.records = [];
  data.records.push(record);
  saveJSON(file, data);
  console.log(`Saved: ${file}`);
}

main().catch((e) => {
  console.error("Failed to create V2 pair:", e);
  process.exit(1);
});
