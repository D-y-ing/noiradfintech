/**
 * Shared types for Agentic Ad Broker
 * Used by both the agent package and the server/web apps
 */
// =========================
// Configuration constants
// =========================
export const VVI_THRESHOLD = 25; // Minimum VVI to flag for LLM review (lowered for demo)
export const PER_DEAL_CAP_XLM = '5.0'; // Max per payment (mirrors on-chain policy)
export const DAILY_CAP_XLM = '20.0'; // Max per day (enforced in agent code)
export const MIN_ESCROW_LEFT_XLM = '1.0'; // Guardrail: keep at least this much
export const AGENT_FEE_BUFFER_XLM = '3.0'; // Extra XLM for agent fees (first tap ~2.3 XLM)
export function toStroops(xlm) {
    return BigInt(Math.round(parseFloat(xlm) * 10_000_000));
}
export function fromStroops(stroops) {
    return (Number(stroops) / 10_000_000).toFixed(7).replace(/\.?0+$/, '');
}
export function computeVVI(delta) {
    if (delta.minutes <= 0)
        return 0;
    const numerator = delta.views + 5 * delta.shares + 2 * delta.comments;
    return numerator / delta.minutes;
}
// Re-export the simulated feed singleton
export { simulatedFeed, SimulatedFeed } from './feed.js';
//# sourceMappingURL=index.js.map