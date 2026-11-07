/**
 * Setup Testnet Accounts
 *
 * Creates and funds 3 Testnet accounts:
 * - Owner (registers card, sets policy, funds escrow)
 * - Agent (holds agent key, pays fees ~2.3 XLM first tap)
 * - Creator/Merchant (claims payments)
 *
 * Run: npm run setup:testnet
 *
 * Requires: AGENT_SECRET, OWNER_SECRET, CREATOR_SECRET in .env (or will generate new)
 * Outputs: Prints public keys, secrets, and Horizon balances
 *          Saves DEVICE_HASH to console for .env
 */

import { Keypair, Horizon, Networks } from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Load .env if exists
function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) {
        env[key.trim()] = rest.join('=').trim();
      }
    }
  }
  return env;
}

function saveEnv(env: Record<string, string>): void {
  const envPath = path.resolve(process.cwd(), '.env');
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join('\n') + '\n');
}

async function fundWithFriendbot(publicKey: string): Promise<boolean> {
  const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function checkBalance(horizon: Horizon.Server, publicKey: string): Promise<string> {
  try {
    const account = await horizon.loadAccount(publicKey);
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    return xlmBalance ? `${parseFloat(xlmBalance.balance).toFixed(7)} XLM` : '0 XLM';
  } catch {
    return 'Account not found';
  }
}

async function main() {
  console.log('🔧 Setting up Testnet accounts for Agentic Ad Broker\n');

  const env = loadEnv();
  const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');

  // Owner account
  let ownerKeypair: Keypair;
  if (env.OWNER_SECRET) {
    ownerKeypair = Keypair.fromSecret(env.OWNER_SECRET);
    console.log('📋 Using existing OWNER_SECRET');
  } else {
    ownerKeypair = Keypair.random();
    env.OWNER_SECRET = ownerKeypair.secret();
    console.log('🆕 Generated new OWNER_SECRET');
  }
  console.log(`   Owner Public:  ${ownerKeypair.publicKey()}`);
  console.log(`   Owner Secret:  ${ownerKeypair.secret()}`);

  // Agent account (needs extra XLM for fees ~2.3 XLM first tap)
  let agentKeypair: Keypair;
  if (env.AGENT_SECRET) {
    agentKeypair = Keypair.fromSecret(env.AGENT_SECRET);
    console.log('📋 Using existing AGENT_SECRET');
  } else {
    agentKeypair = Keypair.random();
    env.AGENT_SECRET = agentKeypair.secret();
    console.log('🆕 Generated new AGENT_SECRET');
  }
  console.log(`   Agent Public:  ${agentKeypair.publicKey()}`);
  console.log(`   Agent Secret:  ${agentKeypair.secret()}`);

  // Creator account
  let creatorKeypair: Keypair;
  if (env.CREATOR_SECRET) {
    creatorKeypair = Keypair.fromSecret(env.CREATOR_SECRET);
    console.log('📋 Using existing CREATOR_SECRET');
  } else {
    creatorKeypair = Keypair.random();
    env.CREATOR_SECRET = creatorKeypair.secret();
    console.log('🆕 Generated new CREATOR_SECRET');
  }
  console.log(`   Creator Public: ${creatorKeypair.publicKey()}`);
  console.log(`   Creator Secret: ${creatorKeypair.secret()}`);

  // CARD_UID (campaign card identifier)
  const cardUid = env.CARD_UID || 'velo-noir-campaign-2026';
  env.CARD_UID = cardUid;

  // Compute deviceHash = SHA-256(CARD_UID)
  const deviceHash = crypto.createHash('sha256').update(cardUid).digest('hex').toUpperCase();
  env.DEVICE_HASH = deviceHash;
  console.log(`\n🔐 Campaign Card:`);
  console.log(`   CARD_UID:     ${cardUid}`);
  console.log(`   DEVICE_HASH:  ${deviceHash}`);

  // Save updated .env
  saveEnv(env);
  console.log('\n💾 Saved to .env');

  // Fund accounts with Friendbot
  console.log('\n💰 Funding accounts with Friendbot...');
  const accounts = [
    { name: 'Owner', keypair: ownerKeypair },
    { name: 'Agent', keypair: agentKeypair },
    { name: 'Creator', keypair: creatorKeypair },
  ];

  for (const { name, keypair } of accounts) {
    const publicKey = keypair.publicKey();
    console.log(`   Funding ${name} (${publicKey})...`);
    const success = await fundWithFriendbot(publicKey);
    if (success) {
      console.log(`   ✅ ${name} funded`);
    } else {
      console.log(`   ⚠️  ${name} funding failed (may already have balance)`);
    }
  }

  // Wait a moment for ledger to catch up
  console.log('\n⏳ Waiting for ledger...');
  await new Promise(r => setTimeout(r, 3000));

  // Check balances
  console.log('\n📊 Account Balances:');
  for (const { name, keypair } of accounts) {
    const balance = await checkBalance(horizon, keypair.publicKey());
    console.log(`   ${name}: ${balance}`);
  }

  // Summary
  console.log('\n✅ Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Verify AGENT_SECRET has extra XLM (first tap costs ~2.3 XLM in fees)');
  console.log('   2. Run: npm run setup:card');
  console.log('   3. Add VELO_API_KEY, VELO_WEBHOOK_SECRET, LLM_API_KEY to .env');
  console.log('\n🔗 Useful links:');
  console.log(`   Owner:   https://stellar.expert/explorer/testnet/account/${ownerKeypair.publicKey()}`);
  console.log(`   Agent:   https://stellar.expert/explorer/testnet/account/${agentKeypair.publicKey()}`);
  console.log(`   Creator: https://stellar.expert/explorer/testnet/account/${creatorKeypair.publicKey()}`);
  console.log(`   Friendbot: https://friendbot.stellar.org`);
}

main().catch(console.error);