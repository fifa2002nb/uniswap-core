const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function readJSON(filePath) { try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return undefined; } }
function saveJSON(filePath, obj) { fs.writeFileSync(filePath, JSON.stringify(obj, null, 2)); }

// Hardcoded token plan (edit here)
// mode: "named" uses NamedERC20(name,symbol,decimals,totalSupply)
// mode: "simple" uses ERC20(totalSupply) with default name/symbol/decimals from UniswapV2ERC20
const TOKENS = [
  //{ alias: "TokenA", mode: "named", name: "Token A", symbol: "TKA", decimals: 18, supply: "1000000" },
  //{ alias: "TokenB", mode: "named", name: "Token B", symbol: "TKB", decimals: 18, supply: "1000000" }
  { alias: "WETH", mode: "named", name: "Wrapped ETH", symbol: "WETH", decimals: 18, supply: "1000000000000000000000000000" }
];

function appConfigPath() { return path.join(__dirname, "app.config.json"); }

async function deployOneToken(plan) {
  const [signer] = await ethers.getSigners();
  if (plan.mode === "named") {
    const total = (BigInt(plan.supply) * 10n ** BigInt(plan.decimals)).toString();
    console.log(`Deploying NamedERC20 alias=${plan.alias} ${plan.name}(${plan.symbol}) decimals=${plan.decimals} supply=${plan.supply}`);
    const Token = await ethers.getContractFactory("NamedERC20");
    const token = await Token.deploy(plan.name, plan.symbol, plan.decimals, total);
    await token.deployed();
    console.log(`Token[${plan.alias}] ->`, token.address);
    return token.address;
  } else {
    const decimals = 18n;
    const total = (BigInt(plan.supply) * 10n ** decimals).toString();
    console.log(`Deploying ERC20 alias=${plan.alias} supply=${plan.supply} (+${decimals} decimals)`);
    const Token = await ethers.getContractFactory("ERC20");
    const token = await Token.deploy(total);
    await token.deployed();
    console.log(`Token[${plan.alias}] ->`, token.address);
    return token.address;
  }
}

async function main() {
  const cfgPath = appConfigPath();
  let cfg = readJSON(cfgPath);
  if (!cfg) cfg = { create_pair: { factory: "", tokenA: "", tokenB: "" }, verify_token: {}, deployed_tokens: {} };
  if (!cfg.deployed_tokens) cfg.deployed_tokens = {};

  for (const t of TOKENS) {
    const current = cfg.deployed_tokens[t.alias];
    if (current && current.startsWith("0x")) {
      console.log(`Skip ${t.alias}: ${current}`);
      continue;
    }
    const addr = await deployOneToken({ ...t });
    cfg.deployed_tokens[t.alias] = addr;
    saveJSON(cfgPath, cfg);
  }

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${hre.network.name}-tokens.json`);
  let data = readJSON(file) || {};
  if (!Array.isArray(data.records)) data.records = [];
  for (const t of TOKENS) {
    if (cfg.deployed_tokens[t.alias]) {
      data.records.push({
        network: hre.network.name,
        alias: t.alias,
        deployed_tokens: cfg.deployed_tokens[t.alias],
        name: t.name || "",
        symbol: t.symbol || "",
        decimals: t.decimals || 18,
        supply: String(t.supply),
        timestamp: new Date().toISOString(),
      });
    }
  }
  saveJSON(file, data);

  console.log(`App config updated: ${cfgPath}`);
  console.log(`Deployment log saved: ${file}`);
}

main().catch((e) => { console.error("Failed to deploy v2 test tokens:", e); process.exit(1); });
