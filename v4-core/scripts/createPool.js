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
  if (!cfg || !cfg.manager || !cfg.token0 || !cfg.token1 || !cfg.fee || !cfg.tickSpacing || !cfg.sqrtPriceX96) {
    console.error("scripts/app.config.json missing create_pool.{manager,token0,token1,fee,tickSpacing,sqrtPriceX96}");
    process.exit(1);
  }

  const { manager, fee, tickSpacing, sqrtPriceX96 } = cfg;
  let { token0, token1 } = cfg;

  // Ensure token0 < token1 by numeric address ordering (required by v4)
  const a0 = ethers.BigNumber.from(token0);
  const a1 = ethers.BigNumber.from(token1);
  if (!a0.lt(a1)) {
    const tmp = token0; token0 = token1; token1 = tmp;
  }

  console.log("Signer:", signer.address);
  console.log({ manager, token0, token1, fee, tickSpacing, sqrtPriceX96 });

  const pm = await ethers.getContractAt("PoolManager", manager, signer);

  // Try using address(0) for hooks as it should work for fixed fees
  const key = {
    currency0: token0,
    currency1: token1,
    fee,
    tickSpacing,
    hooks: "0x0000000000000000000000000000000000000000",
  };

  console.log("Initializing v4 pool via PoolManager.initialize...");
  
  try {
    // Try with manual gas limit to get more detailed error
    const tx = await pm.initialize(key, sqrtPriceX96, { gasLimit: 500000 });
    const rc = await tx.wait();
    console.log("Initialized. Tx:", rc.transactionHash);
  } catch (error) {
    console.error("Detailed error:", error);
    
    // Try to decode the error data if available
    if (error.error && error.error.data) {
      console.log("Error data:", error.error.data);
      
      // Try to decode common V4 errors
      const errorData = error.error.data;
      if (errorData.startsWith('0x7983c051')) {
        console.log("Error: HookAddressNotValid - The hook address is not valid for this fee");
      } else if (errorData.startsWith('0xe65af6a')) {
        console.log("Error: HookAddressNotValid - The hook address is not valid for this fee");
      } else {
        console.log("Unknown error code:", errorData.substring(0, 10));
      }
    }
    
    process.exit(1);
  }

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${hre.network.name}-pools.json`);
  let data = {};
  if (fs.existsSync(file)) { try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch {} }
  const rec = {
    network: hre.network.name,
    manager,
    token0,
    token1,
    fee,
    tickSpacing,
    sqrtPriceX96,
    txInit: "SUCCESS",
    timestamp: new Date().toISOString(),
  };
  if (!Array.isArray(data.records)) data.records = [];
  data.records.push(rec);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Saved: ${file}`);
}

main().catch((e) => { console.error("Failed to create V4 pool:", e); process.exit(1); });
