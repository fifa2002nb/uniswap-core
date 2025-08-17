/*
Query the current task/deployer account balance or any target addresses:
 - Native balance (BNB on BSC testnet)
 - Balances for tokens listed in scripts/app.config.json.deployed_tokens (if present)

Usage:
  ADDRESS=0x... npx hardhat run --network bsc-testnet scripts/checkBalance.js
  # or set in scripts/app.config.json: { "query_balance": { "address": ["0x...","0x..."] } }
*/

require('dotenv').config();
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return undefined; } }
function appConfigPath() { return path.join(__dirname, '../app.config.json'); }

async function printForAddress(provider, address, tokens, label) {
  const net = await provider.getNetwork();
  const nativeBal = await provider.getBalance(address);
  console.log('--------------------------------');
  if (label) console.log('Label      :', label);
  console.log('Network    :', net.chainId, net.name || '');
  console.log('Account    :', address);
  console.log('Native Bal :', ethers.utils.formatEther(nativeBal), '(BNB)');

  const entries = Object.entries(tokens || {});
  if (entries.length > 0) {
    console.log('\nERC20 balances:');
    for (const [alias, addr] of entries) {
      try {
        const ERC20_ABI = [
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
          'function balanceOf(address) view returns (uint256)'
        ];
        const token = new ethers.Contract(addr, ERC20_ABI, provider);
        let symbol = 'TOKEN';
        let decimals = 18;
        try { symbol = await token.symbol(); } catch {}
        try { decimals = await token.decimals(); } catch {}
        const bal = await token.balanceOf(address);
        const human = decimals ? ethers.utils.formatUnits(bal, decimals) : bal.toString();
        console.log(`- ${alias} (${symbol}) @ ${addr}: ${human}`);
      } catch (e) {
        console.log(`- ${alias} @ ${addr}: error -> ${e.message}`);
      }
    }
  }
  console.log('');
}

async function main() {
  const provider = ethers.provider;

  // addresses precedence: env ADDRESS > config.query_balance.accounts > config.query_balance.address > signer
  const root = readJSON(appConfigPath()) || {};
  let targets = [];

  if (process.env.ADDRESS) {
    targets = [{ address: process.env.ADDRESS, description: process.env.ADDRESS_DESC || '' }];
  } else if (root.query_balance && Array.isArray(root.query_balance.accounts)) {
    targets = root.query_balance.accounts
      .filter(x => x && x.address)
      .map(x => ({ address: x.address, description: x.description || '' }));
  } else if (root.query_balance && root.query_balance.address) {
    const value = root.query_balance.address;
    const arr = Array.isArray(value) ? value : [value];
    targets = arr.map(a => ({ address: a, description: '' }));
  } else {
    const signers = await ethers.getSigners();
    const signer = signers && signers.length > 0 ? signers[0] : undefined;
    if (signer) targets = [{ address: await signer.getAddress(), description: 'signer' }];
  }

  if (!targets || targets.length === 0) {
    throw new Error('No target address found. Set ADDRESS env or query_balance.address in scripts/app.config.json');
  }

  const tokens = root.deployed_tokens || {};
  for (const t of targets) {
    await printForAddress(provider, t.address, tokens, t.description);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


