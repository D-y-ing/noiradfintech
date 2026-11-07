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
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Velo, VeloWebhookSignatureVerificationError } from '@carts1024/velo-sdk';
import { runAgentCycle, forceOverspend, getGuardrailsState, } from '@agentic-ad-broker/agent';
import { PER_DEAL_CAP_XLM, DAILY_CAP_XLM, simulatedFeed, } from '@agentic-ad-broker/shared';
// =========================
// Setup
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DECISIONS_FILE = path.join(DATA_DIR, 'decisions.json');
const BUDGET_FILE = path.join(DATA_DIR, 'budget.json');
const TOPUP_FILE = path.join(DATA_DIR, 'topups.json');
// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
// Velo client
if (!process.env.VELO_API_KEY) {
    console.error('❌ VELO_API_KEY is not set in .env!');
}
const velo = process.env.VELO_API_KEY ? new Velo({
    apiKey: process.env.VELO_API_KEY,
    environment: 'testnet',
}) : null;
// Public API URL for webhooks and redirect URLs
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:5173`;
// In-memory state (backed by JSON files)
let decisionLog = [];
let budgetState = {
    escrowBalanceXlm: '100.0',
    perDealCapXlm: PER_DEAL_CAP_XLM,
    dailySpentXlm: '0',
    dailyCapXlm: DAILY_CAP_XLM,
    expiresAt: Math.floor(Date.now() / 1000) + 7 * 86400,
};
let topupSessions = new Map();
// =========================
// Persistence
// =========================
function loadData() {
    try {
        if (fs.existsSync(DECISIONS_FILE)) {
            const content = fs.readFileSync(DECISIONS_FILE, 'utf-8');
            if (content.trim())
                decisionLog = JSON.parse(content);
        }
        if (fs.existsSync(BUDGET_FILE)) {
            const content = fs.readFileSync(BUDGET_FILE, 'utf-8');
            if (content.trim())
                budgetState = JSON.parse(content);
        }
        if (fs.existsSync(TOPUP_FILE)) {
            const content = fs.readFileSync(TOPUP_FILE, 'utf-8');
            if (content.trim()) {
                const data = JSON.parse(content);
                topupSessions = new Map(Object.entries(data));
            }
        }
    }
    catch (error) {
        console.warn('⚠️  Failed to load data files (will use defaults):', error);
    }
}
function saveData() {
    try {
        fs.writeFileSync(DECISIONS_FILE, JSON.stringify(decisionLog, null, 2));
        fs.writeFileSync(BUDGET_FILE, JSON.stringify(budgetState, null, 2));
        fs.writeFileSync(TOPUP_FILE, JSON.stringify(Object.fromEntries(topupSessions), null, 2));
    }
    catch (error) {
        console.error('❌ Failed to save data:', error);
    }
}
// Load on startup
loadData();
// =========================
// Middleware
// =========================
app.use(cors());
app.use(express.json());
// Raw body parser for Velo webhook verification
app.use('/api/webhooks/velo', express.raw({ type: 'application/json' }));
// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});
// =========================
// Health check
// =========================
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
// =========================
// Dashboard API
// =========================
// Get live feed with VVI
app.get('/api/feed', async (_req, res) => {
    try {
        const posts = simulatedFeed.getAllPosts();
        const candidates = simulatedFeed.getCandidates();
        // Add VVI to each post
        const postsWithVVI = posts.map(post => {
            const candidate = candidates.find(c => c.post.id === post.id);
            return {
                ...post,
                vvi: candidate?.vvi || 0,
                flagged: !!candidate,
            };
        });
        res.json({ posts: postsWithVVI, candidates: candidates.length });
    }
    catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: 'Failed to get feed' });
    }
});
// Get decision log
app.get('/api/decisions', (_req, res) => {
    // Most recent first
    const sorted = [...decisionLog].sort((a, b) => b.timestamp - a.timestamp);
    res.json({ decisions: sorted });
});
// Get budget state
app.get('/api/budget', (_req, res) => {
    const guardrails = getGuardrailsState();
    res.json({
        budget: budgetState,
        guardrails: {
            dailySpentXlm: guardrails.dailySpentXlm,
            paidPostsCount: guardrails.paidPostIds.size,
            dailyResetAt: new Date(guardrails.lastReset + 24 * 60 * 60 * 1000).toISOString(),
        },
    });
});
// Trigger agent cycle manually (for demo)
app.post('/api/agent/run', async (_req, res) => {
    try {
        const results = await runAgentCycle();
        decisionLog.push(...results);
        saveData();
        res.json({ results, count: results.length });
    }
    catch (error) {
        console.error('Agent cycle error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Agent cycle failed' });
    }
});
// Force overspend (demo moment)
app.post('/api/agent/overspend', async (_req, res) => {
    try {
        const result = await forceOverspend();
        decisionLog.push(result);
        saveData();
        res.json({ result });
    }
    catch (error) {
        console.error('Overspend error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Overspend failed' });
    }
});
// Trigger viral spike (demo)
app.post('/api/feed/spike', async (req, res) => {
    try {
        const { postIndex } = req.body;
        if (typeof postIndex === 'number') {
            simulatedFeed.triggerViralSpike(postIndex);
            res.json({ success: true, message: `Triggered spike on post ${postIndex}` });
        }
        else {
            // Trigger a random spike
            const candidates = simulatedFeed.getCandidates();
            if (candidates.length > 0) {
                const randomIdx = Math.floor(Math.random() * candidates.length);
                simulatedFeed.triggerViralSpike(randomIdx);
                res.json({ success: true, message: `Triggered random spike on post ${randomIdx}` });
            }
            else {
                res.json({ success: false, message: 'No candidates to spike' });
            }
        }
    }
    catch (error) {
        console.error('Spike error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Spike failed' });
    }
});
// =========================
// Velo: Create Checkout Session (Brand tops up campaign budget)
// =========================
app.post('/api/topup', async (req, res) => {
    try {
        if (!velo) {
            return res.status(500).json({ error: 'Velo is not configured. Please add VELO_API_KEY to .env' });
        }
        const { amountXlm = '10.0', description = 'Campaign budget top-up' } = req.body;
        // Return directly to the dashboard. The API server does not serve the frontend
        // at '/', which previously sent users to an Express "Cannot GET /" page.
        const successUrl = `${FRONTEND_URL}/?topup=success`;
        const cancelUrl = `${FRONTEND_URL}/?topup=cancelled`;
        const { checkoutUrl, paymentIntentId } = await velo.checkout.sessions.create({
            amount: amountXlm,
            asset: 'native',
            description,
            successUrl,
            cancelUrl,
        });
        const session = {
            checkoutUrl,
            paymentIntentId,
            amountXlm,
            status: 'created',
            createdAt: Date.now(),
        };
        topupSessions.set(paymentIntentId, session);
        saveData();
        res.json({
            checkoutUrl,
            paymentIntentId,
            amountXlm,
        });
    }
    catch (error) {
        console.error('Topup creation error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create checkout' });
    }
});
// Get payment intent status
app.get('/api/topup/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const intent = await velo.paymentIntents.retrieve(id);
        const session = topupSessions.get(id);
        if (session) {
            session.status = intent.status;
            saveData();
        }
        res.json({
            id,
            status: intent.status,
            amount: intent.amount,
            asset: intent.asset,
            session: session || null,
        });
    }
    catch (error) {
        console.error('Topup status error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get status' });
    }
});
// =========================
// Velo: Signed Webhook (payment.succeeded)
// =========================
app.post('/api/webhooks/velo', async (req, res) => {
    const signature = req.headers['x-velo-signature'];
    const rawBody = req.body; // Raw buffer from express.raw()
    if (!signature || Array.isArray(signature)) {
        console.warn('⚠️  Missing or invalid x-velo-signature header');
        return res.status(400).send('Missing signature');
    }
    if (!process.env.VELO_WEBHOOK_SECRET) {
        console.error('❌ VELO_WEBHOOK_SECRET not configured');
        return res.status(500).send('Webhook secret not configured');
    }
    // Verify webhook signature
    let event;
    try {
        event = await Velo.webhooks.verify({
            payload: rawBody,
            signature: signature,
            secret: process.env.VELO_WEBHOOK_SECRET,
        });
    }
    catch (error) {
        if (error instanceof VeloWebhookSignatureVerificationError) {
            console.warn('⚠️  Invalid Velo webhook signature');
            return res.status(400).send('Invalid signature');
        }
        console.error('❌ Webhook verification error:', error);
        return res.status(500).send('Verification failed');
    }
    console.log(`📨 Velo webhook: ${event.type} (${event.id})`);
    // Handle payment.succeeded
    if (event.type === 'payment.succeeded') {
        const paymentIntentId = event.data.payment_intent_id;
        const amount = event.data.amount;
        // Deduplicate by event.id
        const session = topupSessions.get(paymentIntentId);
        if (session) {
            if (session.status === 'succeeded') {
                console.log(`ℹ️  Duplicate payment.succeeded for ${paymentIntentId}, ignoring`);
                return res.json({ received: true, deduplicated: true });
            }
            session.status = 'succeeded';
            session.paymentReceivedAt = Date.now();
            // Credit the budget
            const creditedAmount = parseFloat(amount);
            budgetState.escrowBalanceXlm = (parseFloat(budgetState.escrowBalanceXlm) + creditedAmount).toFixed(7);
            budgetState.lastTopupAt = Date.now();
            // Optionally call fundEscrow here (demo shortcut: server calls with owner key)
            // See README for disclosure
            saveData();
            console.log(`✅ Budget credited: +${amount} XLM, new balance: ${budgetState.escrowBalanceXlm} XLM`);
        }
    }
    res.json({ received: true });
});
// =========================
// Start server and agent loop
// =========================
// Top-up success / cancel pages - static success with client polling
app.get('/topup/success', (req, res) => {
    const returnUrl = req.query.returnUrl || 'http://localhost:5173';
    const sessionId = req.query.sessionId || '';
    res.send(`
    <!doctype html>
    <html>
      <head><title>Top-up Success</title></head>
      <body style="font-family:system-ui,sans-serif;max-width:600px;margin:80px auto;text-align:center">
        <h1>✅ Top-up Successful</h1>
        <p>We’re confirming your payment…</p>
        <div id="status">Checking budget…</div>
        <script>
          let attempts = 0;
          async function check() {
            try {
              const r = await fetch('/api/budget');
              const j = await r.json();
              const bal = j.budget?.escrowBalanceXlm ?? 'unknown';
              const lastTopup = j.budget?.lastTopupAt ? new Date(j.budget.lastTopupAt).toLocaleString() : 'just now';
              document.getElementById('status').innerHTML = '<p>Your campaign budget is now <b>' + bal + ' XLM</b>.</p><p>Last top-up: ' + lastTopup + '</p><p><a href="${returnUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Return to App →</a></p>';
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
app.get('/topup/success/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const returnUrl = req.query.returnUrl || 'http://localhost:5173';
    res.send(`
    <!doctype html>
    <html>
      <head><title>Top-up Success</title></head>
      <body style="font-family:system-ui,sans-serif;max-width:600px;margin:80px auto;text-align:center">
        <h1>✅ Top-up Successful</h1>
        <p>Your campaign budget has been topped up.</p>
        <p>Session: ${sessionId}</p>
        <p><a href="${returnUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Return to App →</a></p>
        <script>
          setTimeout(() => { window.location.href = '${returnUrl}'; }, 3000);
        </script>
      </body>
    </html>
  `);
});
app.get('/topup/cancel', (req, res) => {
    const returnUrl = req.query.returnUrl || 'http://localhost:5173';
    res.send(`
    <!doctype html>
    <html>
      <head><title>Top-up Cancelled</title></head>
      <body style="font-family:system-ui,sans-serif;max-width:600px;margin:80px auto;text-align:center">
        <h1>❌ Top-up Cancelled</h1>
        <p>The payment was cancelled or could not be completed.</p>
        <p><a href="${returnUrl}" style="display:inline-block;padding:12px 24px;background:#6b7280;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Return to App →</a></p>
        <script>
          setTimeout(() => { window.location.href = '${returnUrl}'; }, 3000);
        </script>
      </body>
    </html>
  `);
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Velo webhook URL: ${PUBLIC_API_URL}/api/webhooks/velo`);
    console.log(`🌐 Dashboard API: http://localhost:${PORT}/api/`);
});
// Agent loop: run every 30 seconds
const AGENT_INTERVAL_MS = 30_000;
let agentLoopTimer = null;
async function runAgentLoop() {
    console.log('\n🤖 Agent cycle starting...');
    try {
        const results = await runAgentCycle();
        if (results.length > 0) {
            decisionLog.push(...results);
            saveData();
            console.log(`🤖 Agent cycle complete: ${results.length} decision(s)`);
            for (const r of results) {
                console.log(`   ${r.status.toUpperCase()}: ${r.decision.sponsor} → ${r.decision.amountXlm} XLM (${r.decision.reason.slice(0, 60)}...)`);
            }
        }
        else {
            console.log('🤖 Agent cycle complete: no flagged candidates');
        }
    }
    catch (error) {
        console.error('🤖 Agent cycle error:', error);
    }
}
function startAgentLoop() {
    if (agentLoopTimer)
        return;
    console.log(`⏰ Starting agent loop (every ${AGENT_INTERVAL_MS / 1000}s)`);
    agentLoopTimer = setInterval(runAgentLoop, AGENT_INTERVAL_MS);
    // Run once immediately
    runAgentLoop();
}
function stopAgentLoop() {
    if (agentLoopTimer) {
        clearInterval(agentLoopTimer);
        agentLoopTimer = null;
        console.log('⏹️  Agent loop stopped');
    }
}
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
// Start loop if not in test mode
if (process.env.NODE_ENV !== 'test') {
    startAgentLoop();
}
export { app, velo, decisionLog, budgetState, topupSessions };
//# sourceMappingURL=index.js.map