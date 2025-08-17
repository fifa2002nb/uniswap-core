const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return undefined; } }
function appConfigPath() { return path.join(__dirname, "app.config.json"); }

async function verifyOne(tokenAddr, signer, other) {
  console.log("\n=== Verifying token:", tokenAddr, "===");
  const token = await ethers.getContractAt("IERC20", tokenAddr, signer);

  try { console.log("name:", await token.name()); } catch { console.log("name(): not implemented"); }
  try { console.log("symbol:", await token.symbol()); } catch { console.log("symbol(): not implemented"); }
  try { console.log("decimals:", await token.decimals()); } catch { console.log("decimals(): not implemented"); }

  const total = await token.totalSupply();
  const bal0 = await token.balanceOf(signer.address);
  console.log("totalSupply:", total.toString());
  console.log("balanceOf(signer):", bal0.toString());

  const testAmount = ethers.BigNumber.from(1);
  const spender = other.address;

  console.log(`Approving ${testAmount.toString()} to ${spender} ...`);
  try {
    const txA = await token.approve(spender, testAmount);
    await txA.wait();
    const allowance = await token.allowance(signer.address, spender);
    console.log(`allowance(${signer.address}->${spender}):`, allowance.toString());
  } catch (e) {
    console.log("approve failed:", e.message);
  }

  // Transfer 1 to other (if same signer, it will be self-transfer)
  try {
    console.log("transfer 1 -> other ...");
    const txT = await token.transfer(other.address, testAmount);
    await txT.wait();
  } catch (e) {
    console.log("transfer failed:", e.message);
  }

  // Transfer back via transferFrom using other as spender if we have 2 signers
  try {
    const tokenOther = token.connect(other);
    console.log("other.transferFrom(other->signer, 1) ...");
    const txTF = await tokenOther.transferFrom(other.address, signer.address, testAmount);
    await txTF.wait();
  } catch (e) {
    console.log("transferFrom failed:", e.message);
  }

  const balSigner2 = await token.balanceOf(signer.address);
  const balOther2 = await token.balanceOf(other.address);
  console.log("final balances:", { signer: balSigner2.toString(), other: balOther2.toString() });
}

async function main() {
  const signers = await ethers.getSigners();
  const signer = signers[0];
  const other = signers.length > 1 ? signers[1] : signer;
  if (!signer) {
    throw new Error('No signer available. Configure PRIVATE_KEY in .env');
  }

  const root = readJSON(appConfigPath());
  if (!root || !root.deployed_tokens || Object.keys(root.deployed_tokens).length === 0) {
    console.error("scripts/app.config.json missing deployed_tokens");
    process.exit(1);
  }

  console.log("Verifier:", signer.address);
  const entries = Object.entries(root.deployed_tokens);
  for (const [alias, addr] of entries) {
    console.log(`\n[${alias}] ${addr}`);
    await verifyOne(addr, signer, other);
  }

  console.log("\nAll tokens verified.");
}

main().catch((e) => { console.error("verifyToken failed:", e); process.exit(1); });
