/**
 * Shared types for Agentic Ad Broker
 * Used by both the agent package and the server/web apps
 */

// =========================
// Social feed types
// =========================

export interface Post {
  id: string;
  creatorId: string;
  creatorHandle: string;
  creatorWallet: string; // Stellar public key (G...)
  platform: 'x' | 'tiktok' | 'instagram' | 'simulated';
  content: string;
  metrics: PostMetrics;
  timestamp: number; // Unix ms
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
  wallet: string; // Stellar public key
  platform: 'x' | 'tiktok' | 'instagram' | 'simulated';
  followerCount: number;
  avgEngagementRate: number;
}

// =========================
// Agent decision types
// =========================

export interface Candidate {
  post: Post;
  vvi: number; // Viral Velocity Index
  delta: PostDelta;
}

export interface Decision {
  candidate: Candidate;
  sponsor: string; // Brand name
  amountXlm: string; // e.g. "2.5" (human readable, will be converted to stroops)
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

// =========================
// Noir policy types
// =========================

export interface NoirPolicy {
  asset: string; // Contract ID, e.g. native XLM on Testnet
  maxAmountStroops: bigint; // Per-payment cap
  expiresAt: number; // Unix seconds
}

export interface EscrowState {
  balanceStroops: bigint;
  perDealCapStroops: bigint;
  dailySpentStroops: bigint;
  dailyResetAt: number; // Unix seconds
  expiresAt: number; // Unix seconds
}

// =========================
// Velo types
// =========================

export interface TopupSession {
  checkoutUrl: string;
  paymentIntentId: string;
  amountXlm: string;
  status: 'created' | 'pending' | 'succeeded' | 'failed' | 'cancelled';
  createdAt: number;
  paymentReceivedAt?: number;
  creditedAt?: number;
  creditedAmountXlm?: string;
}

export interface BudgetState {
  escrowBalanceXlm: string;
  perDealCapXlm: string;
  dailySpentXlm: string;
  dailyCapXlm: string;
  expiresAt: number;
  lastTopupAt?: number;
  appliedPaymentIds?: string[];
}

// =========================
// Configuration constants
// =========================

export const VVI_THRESHOLD = 50; // Minimum VVI to flag for LLM review
export const PER_DEAL_CAP_XLM = '5.0'; // Max per payment (mirrors on-chain policy)
export const DAILY_CAP_XLM = '20.0'; // Max per day (enforced in agent code)
export const MIN_ESCROW_LEFT_XLM = '1.0'; // Guardrail: keep at least this much
export const AGENT_FEE_BUFFER_XLM = '3.0'; // Extra XLM for agent fees (first tap ~2.3 XLM)

export function toStroops(xlm: string): bigint {
  return BigInt(Math.round(parseFloat(xlm) * 10_000_000));
}

export function fromStroops(stroops: bigint): string {
  return (Number(stroops) / 10_000_000).toFixed(7).replace(/\.?0+$/, '');
}

export function computeVVI(delta: PostDelta): number {
  if (delta.minutes <= 0) return 0;
  const numerator = delta.views + 5 * delta.shares + 2 * delta.comments;
  return numerator / delta.minutes;
}

// Re-export the simulated feed singleton
export { simulatedFeed, SimulatedFeed } from './feed.js';
