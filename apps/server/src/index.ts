/**
 * Agentic Ad Broker - Server
 *
 * Express API server with:
 * - Velo checkout sessions (/api/topup)
 * - Velo signed webhooks (/api/webhooks/velo)
 * - Agent decision loop (runs on timer)
 * - Decision log storage (JSON file)
 * - REST endpoints for dashboard
 *
 * Runs on Render/Railway. Velo webhooks need public URL.
 */

import './load-env.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Velo, VeloWebhookSignatureVerificationError } from '@carts1024/velo-sdk';
import {
  runAgentCycle,
  restoreGuardrailsState,
  forceOverspend,
  getGuardrailsState,
} from '../../../packages/agent/src/index.js';
import {
  Decision,
  PaymentRecord,
  Candidate,
  TopupSession,
  BudgetState,
  PER_DEAL_CAP_XLM,
  DAILY_CAP_XLM,
  MIN_ESCROW_LEFT_XLM,
  toStroops,
  fromStroops,
  simulatedFeed,
} from '../../../packages/shared/src/index.js';

// =========================
// Setup
// =========================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL === '1' ? '/tmp/noiradfintech-data' : path.resolve(__dirname, '../../data'));
const DECISIONS_FILE = path.join(DATA_DIR, 'decisions.json');
const BUDGET_FILE = path.join(DATA_DIR, 'budget.json');
const TOPUP_FILE = path.join(DATA_DIR, 'topups.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Velo client
if (!process.env.VELO_API_KEY) {
  console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ VELO_API_KEY is not set in .env!');
}
const velo = process.env.VELO_API_KEY ? new Velo({
  apiKey: process.env.VELO_API_KEY,
  environment: 'testnet',
}) : null;

// Public API URL for webhooks and redirect URLs
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:5173`;

// In-memory state (backed by JSON files)
let decisionLog: PaymentRecord[] = [];
let budgetState: BudgetState = {
  escrowBalanceXlm: '100.0',
  perDealCapXlm: PER_DEAL_CAP_XLM,
  dailySpentXlm: '0',
  dailyCapXlm: DAILY_CAP_XLM,
  expiresAt: Math.floor(Date.now() / 1000) + 7 * 86400,
};
let topupSessions: Map<string, TopupSession> = new Map();

// =========================
// Persistence
// =========================

function loadData(): void {
  try {
    if (fs.existsSync(DECISIONS_FILE)) {
      const content = fs.readFileSync(DECISIONS_FILE, 'utf-8');
      if (content.trim()) decisionLog = JSON.parse(content);
    }
    if (fs.existsSync(BUDGET_FILE)) {
      const content = fs.readFileSync(BUDGET_FILE, 'utf-8');
      if (content.trim()) budgetState = JSON.parse(content);
    }
    if (fs.existsSync(TOPUP_FILE)) {
      const content = fs.readFileSync(TOPUP_FILE, 'utf-8');
      if (content.trim()) {
        const data = JSON.parse(content);
        topupSessions = new Map(Object.entries(data));
      }
    }
  } catch (error) {
    console.warn('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â  Failed to load data files (will use defaults):', error);
  }
}

function saveData(): void {
  try {
    fs.writeFileSync(DECISIONS_FILE, JSON.stringify(decisionLog, null, 2));
    fs.writeFileSync(BUDGET_FILE, JSON.stringify(budgetState, null, 2));
    fs.writeFileSync(TOPUP_FILE, JSON.stringify(Object.fromEntries(topupSessions), null, 2));
  } catch (error) {
    console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Failed to save data:', error);
  }
}

function applyPaidRecordToBudget(record: PaymentRecord): void {
  if (record.status !== 'paid') return;
  const paymentId = record.txHash || `${record.decision.candidate.post.id}:${record.timestamp}`;
  const applied = new Set(budgetState.appliedPaymentIds || []);
  if (applied.has(paymentId)) return;

  const amount = parseFloat(record.decision.amountXlm) || 0;
  budgetState.escrowBalanceXlm = Math.max(0, parseFloat(budgetState.escrowBalanceXlm) - amount).toFixed(7);
  applied.add(paymentId);
  budgetState.appliedPaymentIds = [...applied];
}

function creditTopupOnce(paymentIntentId: string, amount: string | number): boolean {
  const session = topupSessions.get(paymentIntentId);
  const creditedAmount = Number(amount);
  if (!session || session.creditedAt || !Number.isFinite(creditedAmount) || creditedAmount <= 0) return false;

  const now = Date.now();
  session.status = 'succeeded';
  session.paymentReceivedAt = now;
  session.creditedAt = now;
  session.creditedAmountXlm = creditedAmount.toFixed(7);
  budgetState.escrowBalanceXlm = (parseFloat(budgetState.escrowBalanceXlm) + creditedAmount).toFixed(7);
  budgetState.lastTopupAt = now;
  saveData();
  console.log(`ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Budget credited: +${creditedAmount} XLM, new balance: ${budgetState.escrowBalanceXlm} XLM`);
  return true;
}

// Load on startup
loadData();
restoreGuardrailsState(decisionLog);
budgetState.dailySpentXlm = getGuardrailsState().dailySpentXlm.toFixed(7);
// Backfill successful payments from older decision logs. The payment ID ledger
// makes this safe on every restart and prevents deducting the same payout twice.
decisionLog.forEach(applyPaidRecordToBudget);
saveData();

let activeAgentCycle: Promise<PaymentRecord[]> | null = null;

function runAndRecordAgentCycle(): Promise<PaymentRecord[]> {
  if (activeAgentCycle) return activeAgentCycle;

  activeAgentCycle = (async () => {
    const results = await runAgentCycle();
    const freshResults = results.filter(record => {
      const samePostRecords = decisionLog.filter(existing =>
        existing.decision.candidate.post.id === record.decision.candidate.post.id,
      );
      if (record.status === 'paid') return !samePostRecords.some(existing => existing.status === 'paid');
      if (record.status === 'skipped') return false;
      // Keep recurring guardrail failures from making the decision log grow every cycle.
      return !samePostRecords.some(existing =>
        existing.status === record.status && existing.error === record.error &&
        Date.now() - existing.timestamp < 24 * 60 * 60 * 1000,
      );
    });

    for (const record of freshResults) {
      if (record.status !== 'paid') continue;
      const amount = parseFloat(record.decision.amountXlm) || 0;
      applyPaidRecordToBudget(record);
      budgetState.dailySpentXlm = (parseFloat(budgetState.dailySpentXlm) + amount).toFixed(7);
    }

    if (freshResults.length > 0) {
      decisionLog.push(...freshResults);
      decisionLog = decisionLog.slice(-500);
      saveData();
    }
    return freshResults;
  })().finally(() => {
    activeAgentCycle = null;
  });

  return activeAgentCycle;
}

// =========================
// Middleware
// =========================

app.use(cors());
// Raw body parser for Velo webhook verification
app.use('/api/webhooks/velo', express.raw({ type: 'application/json' }));
// Mount before express.json so signature verification receives the raw bytes.
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// =========================
// Health check
// =========================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// =========================
// Dashboard API
// =========================

// Get live feed with VVI
app.get('/api/feed', async (_req: Request, res: Response) => {
  try {
    const postsWithVVI = simulatedFeed.getFeedWithVVI();
    const candidates = postsWithVVI.filter(post => post.flagged);
    const guardrails = getGuardrailsState();

    const eligibleCandidates = candidates.filter(
      candidate => !guardrails.paidPostIds.has(candidate.id)
    );

    res.json({
      posts: postsWithVVI,
      candidates: candidates.length,
      eligibleCandidates: eligibleCandidates.length,
      vviThreshold: 50,
      simulated: true,
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

// Get decision log
app.get('/api/decisions', (_req: Request, res: Response) => {
  // Don't surface internal duplicate-payment skips as new decisions.
  const sorted = decisionLog
    .filter(record => record.status !== 'skipped')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 500);
  res.json({ decisions: sorted });
});

// Get budget state
app.get('/api/budget', (_req: Request, res: Response) => {
  const guardrails = getGuardrailsState();
  budgetState.dailySpentXlm = guardrails.dailySpentXlm.toFixed(7);
  res.json({
    budget: budgetState,
    guardrails: {
      dailySpentXlm: guardrails.dailySpentXlm,
      paidPostsCount: guardrails.dailyPaidPostIds.size,
      dailyResetAt: new Date(guardrails.lastReset + 24 * 60 * 60 * 1000).toISOString(),
    },
  });
});

// Run a safe, read-only demo agent scan. No payments are sent.
app.post('/api/agent/run', (_req: Request, res: Response) => {
  try {
    const candidates = simulatedFeed.getCandidates();
    const guardrails = getGuardrailsState();

    const eligibleCandidates = candidates.filter(
      candidate => !guardrails.paidPostIds.has(candidate.post.id)
    );

    res.json({
      success: true,
      simulated: true,
      results: [],
      count: 0,
      flaggedCandidates: candidates.length,
      eligibleCandidates: eligibleCandidates.length,
      message: 'Demo scan completed. No payments were sent.',
    });
  } catch (error) {
    console.error('Demo agent scan error:', error);

    res.status(500).json({
      success: false,
      simulated: true,
      error: error instanceof Error ? error.message : 'Demo agent scan failed',
    });
  }
});
// Generate read-only campaign recommendation previews.
// Demo Credits are simulated values only. No payments are executed.
app.get('/api/agent/previews', (_req: Request, res: Response) => {
  try {
    const candidates = simulatedFeed.getCandidates();

    const campaigns = [
      {
        name: 'Dance & Movement Demo Campaign',
        category: 'Entertainment',
        keywords: ['dance', 'trend', 'movement', 'music'],
      },
      {
        name: 'Learning & Productivity Demo Campaign',
        category: 'Education',
        keywords: ['productivity', 'hack', 'learn', 'study', 'tutorial'],
      },
      {
        name: 'Art & Creativity Demo Campaign',
        category: 'Creative',
        keywords: ['artist', 'art', 'sketch', 'design', 'creative', 'color', 'studio'],
      },
    ];

    const sensitiveKeywords = [
      'violence',
      'weapon',
      'hate',
      'scam',
      'adult',
      'explicit',
    ];

    const previews = candidates.map(candidate => {
      const content = candidate.post.content.toLowerCase();

      const matches = campaigns.map(campaign => ({
        campaign,
        matchedKeywords: campaign.keywords.filter(keyword =>
          content.includes(keyword)
        ),
      }));

      matches.sort(
        (a, b) => b.matchedKeywords.length - a.matchedKeywords.length
      );

      const bestMatch = matches[0];
      const hasCampaignMatch = bestMatch.matchedKeywords.length > 0;

      const campaign = hasCampaignMatch
        ? bestMatch.campaign
        : {
            name: 'General Creator Demo Campaign',
            category: 'General',
            keywords: [],
          };

      const matchedKeywords = hasCampaignMatch
        ? bestMatch.matchedKeywords
        : [];

      const campaignFit = campaign.keywords.length > 0
        ? Math.round((matchedKeywords.length / campaign.keywords.length) * 100)
        : 0;

      const brandSafe = !sensitiveKeywords.some(keyword =>
        content.includes(keyword)
      );

      const demoValue = Math.min(
        1000,
        Math.max(10, Math.round(candidate.vvi / 1000))
      );

      return {
        postId: candidate.post.id,
        creatorHandle: candidate.post.creatorHandle,
        platform: candidate.post.platform,
        content: candidate.post.content,
        vvi: candidate.vvi,
        campaign: campaign.name,
        category: campaign.category,
        campaignFit,
        matchedKeywords,
        demoValue,
        brandSafe,
        reason: hasCampaignMatch
          ? `Matched ${matchedKeywords.length} campaign keyword(s): ${matchedKeywords.join(', ')}. This is a rule-based demo recommendation.`
          : 'No specific campaign keywords matched. Assigned to the general demo campaign.',
        source: 'rule-based-demo',
      };
    });

    res.json({
      success: true,
      simulated: true,
      previews,
      message: 'Read-only campaign previews generated. No payments were sent.',
    });
  } catch (error) {
    console.error('Campaign preview error:', error);

    res.status(500).json({
      success: false,
      simulated: true,
      message: error instanceof Error
        ? error.message
        : 'Could not generate campaign previews.',
    });
  }
});

// Force overspend (demo moment)
app.post('/api/agent/overspend', async (_req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_CONTROLS !== 'true') {
      return res.status(404).json({ error: 'Demo control is disabled on the public deployment' });
    }
    const result = await forceOverspend();
    decisionLog.push(result);
    saveData();
    res.json({ result });
  } catch (error) {
    console.error('Overspend error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Overspend failed' });
  }
});

// Trigger viral spike (demo)
app.post('/api/feed/spike', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_CONTROLS !== 'true') {
      return res.status(404).json({ error: 'Demo control is disabled on the public deployment' });
    }
    const { postIndex } = req.body;
    const posts = simulatedFeed.getAllPosts();
    const selectedIndex = typeof postIndex === 'number'
      ? postIndex
      : Math.floor(Math.random() * posts.length);

    if (!posts[selectedIndex]) {
      return res.status(400).json({ success: false, message: 'Invalid post index' });
    }

    // postIndex is an index into the full feed, not the filtered candidate list.
    simulatedFeed.triggerViralSpike(selectedIndex);
    const post = simulatedFeed.getAllPosts()[selectedIndex];
    const candidate = simulatedFeed.getCandidates().find(item => item.post.id === post.id);
    res.json({
      success: true,
      post: { id: post.id, creatorHandle: post.creatorHandle, content: post.content },
      vvi: candidate?.vvi ?? 0,
      flagged: Boolean(candidate),
    });
  } catch (error) {
    console.error('Spike error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Spike failed' });
  }
});

// =========================
// Demo-only top-up. No payment provider or blockchain transaction is used.
app.post('/api/demo/topup', (req: Request, res: Response) => {
  try {
    const amount = Number(req.body?.amountXlm);

    if (!Number.isFinite(amount) || amount < 0.1 || amount > 100) {
      return res.status(400).json({
        error: 'Amount must be between 0.1 and 100 simulated XLM.',
      });
    }

    budgetState.escrowBalanceXlm = (
      Number(budgetState.escrowBalanceXlm) + amount
    ).toFixed(7);

    budgetState.lastTopupAt = Date.now();

    saveData();

    return res.json({
      success: true,
      simulated: true,
      amountXlm: amount.toFixed(7),
      budget: budgetState,
      message: 'Demo funds added. No real payment was made.',
    });
  } catch (error) {
    console.error('Demo top-up error:', error);
    return res.status(500).json({
      error: 'Could not add simulated demo funds.',
    });
  }
});
// Velo: Create Checkout Session (Brand tops up campaign budget)
// =========================

app.post('/api/topup', async (req: Request, res: Response) => {
  if (process.env.ENABLE_DEMO_PAYMENTS !== 'true') { return res.status(404).json({ error: 'Payments are disabled in this demo' }); }
  try {
    if (!velo) {
      return res.status(500).json({ error: 'Velo is not configured. Please add VELO_API_KEY to .env' });
    }
    const { amountXlm = '10.0', description = 'Campaign budget top-up' } = req.body;

    const frontendUrl = FRONTEND_URL.replace(/\/+$/, '');
    const successUrl = `${frontendUrl}/?topup=success`;
    const cancelUrl = `${frontendUrl}/?topup=cancelled`;

    const { checkoutUrl, paymentIntentId } = await velo.checkout.sessions.create({
      amount: amountXlm,
      asset: 'native',
      description,
      successUrl,
      cancelUrl,
    });

    const session: TopupSession = {
      checkoutUrl: checkoutUrl ?? '',
      paymentIntentId,
      amountXlm,
      status: 'created',
      createdAt: Date.now(),
    };

    topupSessions.set(paymentIntentId, session);
    saveData();

    res.json({
      checkoutUrl: checkoutUrl ?? '',
      paymentIntentId,
      amountXlm,
    });
  } catch (error) {
    console.error('Topup creation error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create checkout' });
  }
});

// Get payment intent status
app.get('/api/topup/:id', async (req: Request, res: Response) => {
  if (process.env.ENABLE_DEMO_PAYMENTS !== 'true') { return res.status(404).json({ error: 'Payments are disabled in this demo' }); }
  try {
    if (!velo) return res.status(503).json({ error: 'Velo is not configured' });
    const { id } = req.params;
    const intent = await velo.paymentIntents.retrieve(id);

    const session = topupSessions.get(id);
    if (session) {
      const settled = String(intent.status) === 'succeeded' || intent.status === 'paid';
      if (settled) {
        creditTopupOnce(id, intent.amount);
      } else if (['created', 'pending', 'failed', 'cancelled'].includes(String(intent.status))) {
        session.status = String(intent.status) as TopupSession['status'];
        saveData();
      }
      const status = session.creditedAt ? 'succeeded' : session.status;
      return res.json({ id, status, amount: intent.amount, asset: intent.asset, session });
    }
    res.json({
      id,
      status: intent.status,
      amount: intent.amount,
      asset: intent.asset,
      session: null,
    });
  } catch (error) {
    console.error('Topup status error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get status' });
  }
});

// =========================
// Velo: Signed Webhook (payment.succeeded)
// =========================

app.post('/api/webhooks/velo', async (req: Request, res: Response) => {
  if (process.env.ENABLE_DEMO_PAYMENTS !== 'true') { return res.status(404).send('Payment webhooks are disabled in this demo'); }
  const signature = req.headers['x-velo-signature'];
  const rawBody = req.body; // Raw buffer from express.raw()

  if (!signature || Array.isArray(signature)) {
    console.warn('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â  Missing or invalid x-velo-signature header');
    return res.status(400).send('Missing signature');
  }

  if (!process.env.VELO_WEBHOOK_SECRET) {
    console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ VELO_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  // Verify webhook signature
  let event: any;
  try {
    event = await Velo.webhooks.verify({
      payload: rawBody,
      signature: signature as string,
      secret: process.env.VELO_WEBHOOK_SECRET!,
    });
  } catch (error) {
    if (error instanceof VeloWebhookSignatureVerificationError) {
      console.warn('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â  Invalid Velo webhook signature');
      return res.status(400).send('Invalid signature');
    }
    console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Webhook verification error:', error);
    return res.status(500).send('Verification failed');
  }

  console.log(`ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â¨ Velo webhook: ${event.type} (${event.id})`);

  // Handle payment.succeeded
  if (event.type === 'payment.succeeded') {
    const paymentIntentId = event.data.payment_intent_id;
    const amount = event.data.amount;

    // Deduplicate by event.id
    const credited = creditTopupOnce(paymentIntentId, amount);
    if (!credited) console.log(`ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Top-up ${paymentIntentId} was already credited or its session is unavailable.`);
    return res.json({ received: true, credited });
  }

  res.json({ received: true });
});

// =========================
// Start server and agent loop
// =========================

// Top-up success / cancel pages - static success with client polling
app.get('/topup/success', (req: Request, res: Response) => {
  const returnUrl = req.query.returnUrl as string || 'http://localhost:5173';
  const sessionId = req.query.sessionId as string || '';
  res.send(`
    <!doctype html>
    <html>
      <head><title>Top-up Success</title></head>
      <body style="font-family:system-ui,sans-serif;max-width:600px;margin:80px auto;text-align:center">
        <h1>ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Top-up Successful</h1>
        <p>WeÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢re confirming your paymentÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦</p>
        <div id="status">Checking budgetÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦</div>
        <script>
          let attempts = 0;
          async function check() {
            try {
              const r = await fetch('/api/budget');
              const j = await r.json();
              const bal = j.budget?.escrowBalanceXlm ?? 'unknown';
              const lastTopup = j.budget?.lastTopupAt ? new Date(j.budget.lastTopupAt).toLocaleString() : 'just now';
              document.getElementById('status').innerHTML = '<p>Your campaign budget is now <b>' + bal + ' XLM</b>.</p><p>Last top-up: ' + lastTopup + '</p><p><a href="${returnUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Return to App ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢</a></p>';
              clearInterval(interval);
            } catch(e){
              attempts++;
              if (attempts >= 10) {
                document.getElementById('status').innerHTML = '<p>Could not confirm yet, <a href="${returnUrl}">return to app</a> and refresh.</p>';
                clearInterval(interval);
              }
            }
          }
          check();
          const interval = setInterval(check, 2000);
          // Auto-redirect after 5 seconds
          setTimeout(() => { window.location.href = '${returnUrl}'; }, 5000);
        </script>
      </body>
    </html>
  `);
});

// Keep param route for backward compatibility
app.get('/topup/success/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const returnUrl = req.query.returnUrl as string || 'http://localhost:5173';
  res.send(`
    <!doctype html>
    <html>
      <head><title>Top-up Success</title></head>
      <body style="font-family:system-ui,sans-serif;max-width:600px;margin:80px auto;text-align:center">
        <h1>ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Top-up Successful</h1>
        <p>Your campaign budget has been topped up.</p>
        <p>Session: ${sessionId}</p>
        <p><a href="${returnUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Return to App ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢</a></p>
        <script>
          setTimeout(() => { window.location.href = '${returnUrl}'; }, 3000);
        </script>
      </body>
    </html>
  `);
});

app.get('/topup/cancel', (req: Request, res: Response) => {
  const returnUrl = req.query.returnUrl as string || 'http://localhost:5173';
  res.send(`
    <!doctype html>
    <html>
      <head><title>Top-up Cancelled</title></head>
      <body style="font-family:system-ui,sans-serif;max-width:600px;margin:80px auto;text-align:center">
        <h1>ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Top-up Cancelled</h1>
        <p>The payment was cancelled or could not be completed.</p>
        <p><a href="${returnUrl}" style="display:inline-block;padding:12px 24px;background:#6b7280;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Return to App ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢</a></p>
        <script>
          setTimeout(() => { window.location.href = '${returnUrl}'; }, 3000);
        </script>
      </body>
    </html>
  `);
});

if (process.env.VERCEL !== '1') {
app.listen(PORT, () => {
  console.log(`ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Server running on http://localhost:${PORT}`);
  console.log(`ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â¡ Velo webhook URL: ${PUBLIC_API_URL}/api/webhooks/velo`);
  console.log(`ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢Ãƒâ€šÃ‚Â Dashboard API: http://localhost:${PORT}/api/`);
});

}

// Agent loop: run every 30 seconds
const AGENT_INTERVAL_MS = 30_000;
let agentLoopTimer: NodeJS.Timeout | null = null;

async function runAgentLoop() {
  console.log('\nÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¤ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Agent cycle starting...');
  try {
    const results = await runAndRecordAgentCycle();
    if (results.length > 0) {
      console.log(`ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¤ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Agent cycle complete: ${results.length} decision(s)`);
      for (const r of results) {
        console.log(`   ${r.status.toUpperCase()}: ${r.decision.sponsor} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ ${r.decision.amountXlm} XLM (${r.decision.reason.slice(0, 60)}...)`);
      }
    } else {
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¤ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Agent cycle complete: no flagged candidates');
    }
  } catch (error) {
    console.error('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¤ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Agent cycle error:', error);
  }
}

function startAgentLoop() {
  if (agentLoopTimer) return;
  console.log(`ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â° Starting agent loop (every ${AGENT_INTERVAL_MS / 1000}s)`);
  agentLoopTimer = setInterval(runAgentLoop, AGENT_INTERVAL_MS);
  // Run once immediately
  runAgentLoop();
}

function stopAgentLoop() {
  if (agentLoopTimer) {
    clearInterval(agentLoopTimer);
    agentLoopTimer = null;
    console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â¹ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â  Agent loop stopped');
  }
}

if (process.env.VERCEL !== '1') {
// Graceful shutdown
process.on('SIGINT', () => {
  stopAgentLoop();
  saveData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAgentLoop();
  saveData();
  process.exit(0);
});

}

// Automatic agent loop disabled for safe demo operation.
// Manual Run Agent uses the read-only demo endpoint.

export { app, velo, decisionLog, budgetState, topupSessions };


