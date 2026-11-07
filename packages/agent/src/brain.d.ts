/**
 * Agent Brain - Decision logic for Agentic Ad Broker
 *
 * Flow:
 * 1. Get candidates from SocialSource (VVI > threshold)
 * 2. For each candidate, run guardrails (cap, daily limit, escrow)
 * 3. If guardrails pass, call LLM for sponsor/amount/reason
 * 4. Validate LLM response with schema, retry once, fallback to rule
 * 5. Return Decision
 *
 * Guardrails enforced in code (not on-chain):
 * - Per-deal cap (mirrors on-chain maxAmount)
 * - Daily cap
 * - One payment per post
 * - Minimum escrow left
 */
import { Candidate, Decision, PaymentRecord } from '@agentic-ad-broker/shared';
interface GuardrailsState {
    dailySpentXlm: number;
    paidPostIds: Set<string>;
    lastReset: number;
}
/**
 * Check all guardrails before allowing a payment
 * Returns { ok: true } or { ok: false, reason: string }
 */
export declare function checkGuardrails(candidate: Candidate, amountXlm: string): {
    ok: boolean;
    reason?: string;
};
/**
 * Record a successful payment for guardrails tracking
 */
export declare function recordPayment(postId: string, amountXlm: string): void;
/**
 * Get current guardrails state (for dashboard)
 */
export declare function getGuardrailsState(): GuardrailsState;
/**
 * Main decision function
 * Returns Decision or null if guardrails fail
 */
export declare function decide(candidate: Candidate): Promise<Decision | null>;
/**
 * Execute a decision: pay the creator
 * Returns PaymentRecord
 */
export declare function executeDecision(decision: Decision): Promise<PaymentRecord>;
/**
 * Run one cycle of the agent loop
 * Returns array of PaymentRecords for this cycle
 */
export declare function runAgentCycle(): Promise<PaymentRecord[]>;
export {};
//# sourceMappingURL=brain.d.ts.map