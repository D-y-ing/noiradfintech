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
import { NoirAgentClient } from '@noirx402/agent-sdk';
import { Decision, PaymentRecord, EscrowState } from '@agentic-ad-broker/shared';
declare const DEVICE_HASH: string;
declare const AGENT_PUBLIC_KEY: string;
declare const CREATOR_PUBLIC_KEY: string;
declare const NATIVE_XLM_ASSET: string;
declare const noir: NoirAgentClient;
/**
 * Check a payment before submitting
 * Returns { ok: true } or { ok: false, reason: string }
 *
 * This simulates the transaction first and tells you why it would fail
 * without paying a fee. Always call this before authorizePayment.
 */
export declare function checkPayment(amountXlm: string): Promise<{
    ok: boolean;
    reason?: string;
}>;
/**
 * Authorize a payment to the creator
 * Moves funds from escrow to merchant's pending balance
 * Returns the transaction hash
 *
 * The creator must then call claim() to collect the funds
 */
export declare function authorizePayment(amountXlm: string): Promise<string>;
/**
 * Claim a payment (called by the creator/merchant wallet)
 * Collects the pending balance from the escrow contract
 */
export declare function claimPayment(): Promise<string>;
/**
 * Full agentic payment flow:
 * 1. checkPayment
 * 2. authorizePayment (agent signs)
 * 3. claimPayment (creator signs)
 *
 * Returns PaymentRecord with tx hashes and Stellar Expert links
 */
export declare function payCreator(decision: Decision): Promise<PaymentRecord>;
/**
 * Force an overspend attempt (for demo)
 * Tries to pay above the per-deal cap - Noir should refuse with over_limit
 */
export declare function forceOverspend(): Promise<PaymentRecord>;
/**
 * Get current escrow state (for dashboard)
 * Note: Noir SDK doesn't have a direct read method, so this reads from
 * the payment_escrow contract via Stellar RPC or estimates from known values
 */
export declare function getEscrowState(): Promise<EscrowState>;
/**
 * Watch for payment events (optional, for real-time updates)
 * noir.watch({ types: ['payment.authorized'], onEvent })
 */
export declare function watchPayments(onEvent: (event: any) => void): () => void;
export { noir, DEVICE_HASH, AGENT_PUBLIC_KEY, CREATOR_PUBLIC_KEY, NATIVE_XLM_ASSET };
//# sourceMappingURL=noir.d.ts.map