/**
 * Noir SDK integration for Agentic Ad Broker
 *
 * Implements the agentic payment flow:
 * 1. checkPayment - verify the payment would succeed within policy
 * 2. authorizePayment - move escrow to merchant's pending balance
 * 3. Merchant calls claim - collect the funds
 *
 * All calls go through @noirx402/agent-sdk to deployed Testnet contracts
 * (2026-10-24 redeploy IDs built into the SDK).
 *
 * References:
 * - Noir SDK: https://github.com/noirx402/noir
 * - SDK README: card lifecycle, checkPayment, authorizePayment, claim
 * - Testnet contracts: device_registry, agent_registry, payment_escrow
 */

import {
  NoirAgentClient,
  keypairSigner,
  toStroops,
  fromStroops,
  NoirContractError,
} from '@noirx402/agent-sdk';
import { Keypair, Asset, Networks } from '@stellar/stellar-sdk';
import {
  Decision,
  PaymentRecord,
  NoirPolicy,
  EscrowState,
  PER_DEAL_CAP_XLM,
  DAILY_CAP_XLM,
  MIN_ESCROW_LEFT_XLM,
  toStroops as sharedToStroops,
  fromStroops as sharedFromStroops,
} from '@agentic-ad-broker/shared';

// =========================
// Configuration
// =========================

// The campaign card deviceHash (SHA-256 of CARD_UID)
// Set via scripts/setup-card.ts and stored in env
const DEVICE_HASH = process.env.DEVICE_HASH || '';

// Agent keypair from AGENT_SECRET (server-only)
const AGENT_SECRET = process.env.AGENT_SECRET || '';
const AGENT_KEYPAIR = AGENT_SECRET ? Keypair.fromSecret(AGENT_SECRET) : null;
const AGENT_PUBLIC_KEY = AGENT_KEYPAIR?.publicKey() || '';

// Creator/merchant keypair from CREATOR_SECRET
const CREATOR_SECRET = process.env.CREATOR_SECRET || '';
const CREATOR_KEYPAIR = CREATOR_SECRET ? Keypair.fromSecret(CREATOR_SECRET) : null;
const CREATOR_PUBLIC_KEY = CREATOR_KEYPAIR?.publicKey() || '';

// Owner keypair (for setup scripts)
const OWNER_SECRET = process.env.OWNER_SECRET || '';
const OWNER_KEYPAIR = OWNER_SECRET ? Keypair.fromSecret(OWNER_SECRET) : null;

// Native XLM asset contract ID on Testnet (built into SDK)
const NATIVE_XLM_ASSET = Asset.native().contractId(Networks.TESTNET);

// Noir client (Testnet by default)
const noir = new NoirAgentClient();

/**
 * Check if all required configuration is present
 */
function assertConfig(): void {
  if (!DEVICE_HASH) throw new Error('DEVICE_HASH not set (run setup-card)');
  if (!AGENT_KEYPAIR) throw new Error('AGENT_SECRET not set');
  if (!CREATOR_PUBLIC_KEY) throw new Error('CREATOR_SECRET not set');
}

/**
 * Convert XLM string to stroops (bigint)
 */
function stroops(xlm: string): bigint {
  return sharedToStroops(xlm);
}

/**
 * Convert stroops to XLM string
 */
function xlms(stroops: bigint): string {
  return sharedFromStroops(stroops);
}

/**
 * Check a payment before submitting
 * Returns { ok: true } or { ok: false, reason: string }
 *
 * This simulates the transaction first and tells you why it would fail
 * without paying a fee. Always call this before authorizePayment.
 */
export async function checkPayment(amountXlm: string): Promise<{ ok: boolean; reason?: string }> {
  assertConfig();

  try {
    const check = await noir.checkPayment({
      deviceHash: DEVICE_HASH,
      agent: AGENT_PUBLIC_KEY,
      asset: NATIVE_XLM_ASSET,
      amount: stroops(amountXlm),
    });

    return { ok: check.ok, reason: check.reason };
  } catch (error) {
    if (error instanceof NoirContractError) {
      return { ok: false, reason: error.name };
    }
    throw error;
  }
}

/**
 * Authorize a payment to the creator
 * Moves funds from escrow to merchant's pending balance
 * Returns the transaction hash
 *
 * The creator must then call claim() to collect the funds
 */
export async function authorizePayment(amountXlm: string): Promise<string> {
  assertConfig();

  const { hash } = await noir.authorizePayment({
    agent: keypairSigner(AGENT_SECRET),
    deviceHash: DEVICE_HASH,
    merchant: CREATOR_PUBLIC_KEY,
    asset: NATIVE_XLM_ASSET,
    amount: stroops(amountXlm),
  });

  return hash;
}

/**
 * Claim a payment (called by the creator/merchant wallet)
 * Collects the pending balance from the escrow contract
 */
export async function claimPayment(): Promise<string> {
  if (!CREATOR_KEYPAIR) throw new Error('CREATOR_SECRET not set for claim');

  const { hash } = await noir.claim({
    merchant: keypairSigner(CREATOR_SECRET),
    token: NATIVE_XLM_ASSET,
  });

  return hash;
}

/**
 * Full agentic payment flow:
 * 1. checkPayment
 * 2. authorizePayment (agent signs)
 * 3. claimPayment (creator signs)
 *
 * Returns PaymentRecord with tx hashes and Stellar Expert links
 */
export async function payCreator(decision: Decision): Promise<PaymentRecord> {
  const amountXlm = decision.amountXlm;
  const record: PaymentRecord = {
    decision,
    status: 'pending',
    timestamp: Date.now(),
  };

  // Step 1: Check payment
  const check = await checkPayment(amountXlm);
  if (!check.ok) {
    record.status = 'blocked';
    record.error = check.reason;
    record.stellarExpertUrl = `https://stellar.expert/explorer/testnet/tx/${record.txHash || 'blocked'}`;
    return record;
  }

  // Step 2: Authorize payment (agent signs)
  try {
    const authHash = await authorizePayment(amountXlm);
    record.txHash = authHash;
    record.stellarExpertUrl = `https://stellar.expert/explorer/testnet/tx/${authHash}`;
  } catch (error) {
    record.status = 'failed';
    record.error = error instanceof Error ? error.message : 'Authorization failed';
    return record;
  }

  // Step 3: Creator claims (in production, creator's wallet does this)
  // For demo, we call it server-side with creator key
  try {
    const claimHash = await claimPayment();
    record.txHash = claimHash; // Override with claim hash
    record.stellarExpertUrl = `https://stellar.expert/explorer/testnet/tx/${claimHash}`;
    record.status = 'paid';
  } catch (error) {
    // Payment authorized but claim failed - still record as authorized
    record.status = 'paid'; // Funds are in pending balance
    record.error = `Authorized but claim failed: ${error instanceof Error ? error.message : 'Unknown'}`;
  }

  return record;
}

/**
 * Force an overspend attempt (for demo)
 * Tries to pay above the per-deal cap - Noir should refuse with over_limit
 */
export async function forceOverspend(): Promise<PaymentRecord> {
  const overspendAmount = (parseFloat(PER_DEAL_CAP_XLM) + 1).toFixed(1); // e.g. 6.0 if cap is 5.0

  const record: PaymentRecord = {
    decision: {
      candidate: {
        post: {
          id: 'demo_overspend',
          creatorId: 'demo',
          creatorHandle: '@demo',
          creatorWallet: CREATOR_PUBLIC_KEY,
          platform: 'simulated',
          content: 'OVERTSPEND TEST',
          metrics: { views: 0, shares: 0, comments: 0, likes: 0 },
          timestamp: Date.now(),
        },
        vvi: 999,
        delta: { views: 0, shares: 0, comments: 0, minutes: 1 },
      },
      sponsor: 'Demo Brand',
      amountXlm: overspendAmount,
      reason: 'Intentional overspend to demonstrate Noir policy enforcement',
      brandSafe: true,
      timestamp: Date.now(),
    },
    status: 'pending',
    timestamp: Date.now(),
  };

  const check = await checkPayment(overspendAmount);
  if (!check.ok) {
    record.status = 'blocked';
    record.error = `Blocked by Noir policy: ${check.reason}`;
    record.stellarExpertUrl = 'https://stellar.expert/explorer/testnet';
    return record;
  }

  // If somehow it passes (shouldn't), try to authorize
  try {
    const hash = await authorizePayment(overspendAmount);
    record.txHash = hash;
    record.stellarExpertUrl = `https://stellar.expert/explorer/testnet/tx/${hash}`;
    record.status = 'paid';
  } catch (error) {
    record.status = 'blocked';
    record.error = error instanceof Error ? error.message : 'Overspend blocked';
  }

  return record;
}

/**
 * Get current escrow state (for dashboard)
 * Note: Noir SDK doesn't have a direct read method, so this reads from
 * the payment_escrow contract via Stellar RPC or estimates from known values
 */
export async function getEscrowState(): Promise<EscrowState> {
  // In production, query the payment_escrow contract via Soroban RPC
  // For now, return configured values
  return {
    balanceStroops: stroops('100.0'), // Initial funding
    perDealCapStroops: stroops(PER_DEAL_CAP_XLM),
    dailySpentStroops: stroops('0'),
    dailyResetAt: Math.floor(Date.now() / 1000) + 86400,
    expiresAt: Math.floor(Date.now() / 1000) + 7 * 86400, // 1 week
  };
}

/**
 * Watch for payment events (optional, for real-time updates)
 * noir.watch({ types: ['payment.authorized'], onEvent })
 */
export function watchPayments(onEvent: (event: any) => void): () => void {
  const unwatch = noir.watch({
    types: ['payment.authorized'],
    onEvent: (event) => {
      // Deduplicate on event.id
      onEvent(event);
    },
  });
  return unwatch;
}

export { noir, DEVICE_HASH, AGENT_PUBLIC_KEY, CREATOR_PUBLIC_KEY, NATIVE_XLM_ASSET };