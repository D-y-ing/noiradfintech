/**
 * Shared types for Agentic Ad Broker
 * Used by both the agent package and the server/web apps
 */
export interface Post {
    id: string;
    creatorId: string;
    creatorHandle: string;
    creatorWallet: string;
    platform: 'x' | 'tiktok' | 'instagram' | 'simulated';
    content: string;
    metrics: PostMetrics;
    timestamp: number;
    url?: string;
}
export interface PostMetrics {
    views: number;
    shares: number;
    comments: number;
    likes: number;
}
export interface PostDelta {
    views: number;
    shares: number;
    comments: number;
    minutes: number;
}
export interface Creator {
    id: string;
    handle: string;
    wallet: string;
    platform: 'x' | 'tiktok' | 'instagram' | 'simulated';
    followerCount: number;
    avgEngagementRate: number;
}
export interface Candidate {
    post: Post;
    vvi: number;
    delta: PostDelta;
}
export interface Decision {
    candidate: Candidate;
    sponsor: string;
    amountXlm: string;
    reason: string;
    brandSafe: boolean;
    timestamp: number;
}
export interface PaymentRecord {
    decision: Decision;
    txHash?: string;
    stellarExpertUrl?: string;
    status: 'pending' | 'paid' | 'blocked' | 'skipped' | 'failed';
    error?: string;
    timestamp: number;
}
export interface NoirPolicy {
    asset: string;
    maxAmountStroops: bigint;
    expiresAt: number;
}
export interface EscrowState {
    balanceStroops: bigint;
    perDealCapStroops: bigint;
    dailySpentStroops: bigint;
    dailyResetAt: number;
    expiresAt: number;
}
export interface TopupSession {
    checkoutUrl: string;
    paymentIntentId: string;
    amountXlm: string;
    status: 'created' | 'pending' | 'succeeded' | 'failed' | 'cancelled';
    createdAt: number;
    paymentReceivedAt?: number;
}
export interface BudgetState {
    escrowBalanceXlm: string;
    perDealCapXlm: string;
    dailySpentXlm: string;
    dailyCapXlm: string;
    expiresAt: number;
    lastTopupAt?: number;
}
export declare const VVI_THRESHOLD = 25;
export declare const PER_DEAL_CAP_XLM = "5.0";
export declare const DAILY_CAP_XLM = "20.0";
export declare const MIN_ESCROW_LEFT_XLM = "1.0";
export declare const AGENT_FEE_BUFFER_XLM = "3.0";
export declare function toStroops(xlm: string): bigint;
export declare function fromStroops(stroops: bigint): string;
export declare function computeVVI(delta: PostDelta): number;
export { simulatedFeed, SimulatedFeed } from './feed.js';
//# sourceMappingURL=index.d.ts.map