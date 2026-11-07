/**
 * Setup Campaign Card (Noir Device Registration)
 *
 * Registers the campaign card, sets the agent policy, and funds the escrow.
 * Uses the Noir SDK to call the deployed Testnet contracts (2026-10-24 redeploy).
 *
 * Run: npm run setup:card
 *
 * Requires: .env with OWNER_SECRET, AGENT_SECRET, DEVICE_HASH, CARD_UID
 *           PER_DEAL_CAP_XLM, DAILY_CAP_XLM, ESCROW_FUNDING_XLM (optional, defaults)
 *
 * Contract calls (in order):
 * 1. registerDevice - link card (deviceHash) to owner wallet with agent key
 * 2. registerAgent - set policy: asset (native XLM), maxAmount (per payment), expiresAt
 * 3. fundEscrow - deposit XLM into escrow for the agent to spend
 *
 * References:
 * - Noir SDK README: card lifecycle for exact parameters
 * - Handbook: registerDevice, registerAgent, fundEscrow call order
 */

import {
  NoirAgentClient,
  keypairSigner,
  toStroops,
  NoirContractError,
} from '@noirx402/agent-sdk';
import { Keypair, Asset, Networks } from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';

// Load .env
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

async function main() {
  console.log('🎫 Setting up Campaign Card (Noir Device Registration)\n');

  const env = loadEnv();

  // Required configuration
  const ownerSecret = env.OWNER_SECRET;
  const agentSecret = env.AGENT_SECRET;
  const deviceHash = env.DEVICE_HASH;
  const cardUid = env.CARD_UID;

  if (!ownerSecret || !agentSecret || !deviceHash) {
    console.error('❌ Missing required env vars. Run setup:testnet first.');
    console.error('   Need: OWNER_SECRET, AGENT_SECRET, DEVICE_HASH');
    process.exit(1);
  }

  const ownerKeypair = Keypair.fromSecret(ownerSecret);
  const agentKeypair = Keypair.fromSecret(agentSecret);

  console.log(`📋 Configuration:`);
  console.log(`   Owner:        ${ownerKeypair.publicKey()}`);
  console.log(`   Agent:        ${agentKeypair.publicKey()}`);
  console.log(`   Device Hash:  ${deviceHash}`);
  console.log(`   Card UID:     ${cardUid}`);

  // Policy configuration
  const perDealCapXlm = env.PER_DEAL_CAP_XLM || '5.0';
  const dailyCapXlm = env.DAILY_CAP_XLM || '20.0';
  const escrowFundingXlm = env.ESCROW_FUNDING_XLM || '100.0';
  const expiresInDays = parseInt(env.POLICY_EXPIRES_DAYS || '7', 10);

  const maxAmountStroops = toStroops(perDealCapXlm);
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const escrowAmountStroops = toStroops(escrowFundingXlm);

  console.log(`\n📜 Policy:`);
  console.log(`   Asset:           Native XLM (Testnet)`);
  console.log(`   Max per payment: ${perDealCapXlm} XLM (${maxAmountStroops} stroops)`);
  console.log(`   Daily cap:       ${dailyCapXlm} XLM (enforced in agent code)`);
  console.log(`   Expires:         ${new Date(expiresAt * 1000).toISOString()} (${expiresInDays} days)`);
  console.log(`   Escrow funding:  ${escrowFundingXlm} XLM (${escrowAmountStroops} stroops)`);

  // Native XLM asset contract ID on Testnet
  const asset = Asset.native().contractId(Networks.TESTNET);

  const noir = new NoirAgentClient();

  // =========================
  // 1. registerDevice
  // Links the card (deviceHash) to owner's wallet with the agent key
  // =========================
  console.log('\n1️⃣  Calling registerDevice...');
  const ownerSigner = keypairSigner(ownerSecret);
  try {
    const { hash: regDeviceHash } = await noir.execute(ownerSigner, {
      kind: 'registerDevice',
      deviceHash,
      agent: agentKeypair.publicKey(),
    });
    console.log(`   ✅ registerDevice succeeded`);
    console.log(`   🔗 Tx: https://stellar.expert/explorer/testnet/tx/${regDeviceHash}`);
  } catch (error) {
    if (error instanceof NoirContractError && (error.errorName === 'AlreadyRegistered' || error.message.includes('AlreadyRegistered') || error.code === 4)) {
      console.log(`   ℹ️  Device already registered, skipping registerDevice`);
    } else {
      console.error(`   ❌ registerDevice failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // =========================
  // 2. registerAgent
  // Sets the agent's policy: asset, maxAmount, expiresAt
  // =========================
  console.log('\n2️⃣  Calling registerAgent...');
  try {
    const { hash: regAgentHash } = await noir.execute(ownerSigner, {
      kind: 'registerAgent',
      deviceHash,
      agent: agentKeypair.publicKey(),
      asset,
      maxAmount: maxAmountStroops,
      expiresAt: new Date(expiresAt * 1000),
    });
    console.log(`   ✅ registerAgent succeeded`);
    console.log(`   🔗 Tx: https://stellar.expert/explorer/testnet/tx/${regAgentHash}`);
  } catch (error) {
    if (error instanceof NoirContractError && error.name === 'AlreadyRegistered') {
      console.log(`   ℹ️  Agent already registered`);
    } else {
      console.error(`   ❌ registerAgent failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // =========================
  // 3. fundEscrow
  // Deposits XLM into the escrow for the agent to spend
  // =========================
  console.log('\n3️⃣  Calling fundEscrow...');
  try {
    const { hash: fundHash } = await noir.execute(ownerSigner, {
      kind: 'fundEscrow',
      deviceHash,
      token: asset,
      amount: escrowAmountStroops,
    });
    console.log(`   ✅ fundEscrow succeeded`);
    console.log(`   🔗 Tx: https://stellar.expert/explorer/testnet/tx/${fundHash}`);
    console.log(`\n💾 SAVE THIS TRANSACTION HASH FOR YOUR README TESTNET PROOF:`);
    console.log(`   ${fundHash}`);
    console.log(`   https://stellar.expert/explorer/testnet/tx/${fundHash}`);
  } catch (error) {
    console.error(`   ❌ fundEscrow failed:`, error instanceof Error ? error.message : error);
    throw error;
  }

  // Verify with checkPayment
  console.log('\n🔍 Verifying with checkPayment (1 XLM test)...');
  const check = await noir.checkPayment({
    deviceHash,
    agent: agentKeypair.publicKey(),
    asset,
    amount: toStroops('1.0'),
  });
  console.log(`   checkPayment: ${check.ok ? '✅ OK' : '❌ ' + check.reason}`);

  console.log('\n✅ Campaign card setup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Copy the fundEscrow transaction hash to docs/proof.md');
  console.log('   2. Add VELO_API_KEY, VELO_WEBHOOK_SECRET, LLM_API_KEY to .env');
  console.log('   3. Deploy server (Render/Railway) and set Velo webhook URL');
  console.log('   4. Run: npm run dev');
}

main().catch(console.error);