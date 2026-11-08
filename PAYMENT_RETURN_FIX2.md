# Payment Return & Agent Flow Fix

## Issues Fixed

### 1. Payment still returns to "Cannot GET /"
**Root Cause:** Velo success URLs need proper session ID substitution. The `{CHECKOUT_SESSION_ID}` placeholder needs to be replaced by Velo, but the returnUrl parameter wasn't being passed correctly.

**Fix:** 
- Updated success URL to include placeholder for Velo to substitute
- Added proper FRONTEND_URL environment variable handling
- Now returns to actual frontend app instead of API server

**What to check:**
- Make sure `.env` has `FRONTEND_URL=http://localhost:5173` (your Vite dev server port)
- `PUBLIC_API_URL` should be `http://localhost:3001` (API server)
- After payment, you should be redirected back to the dashboard

### 2. Agent Cycle buttons "remove pending" instead of showing results
**Root Cause:** The optimistic UI was adding a "Scanning..." entry, then replacing it with real results. But when results were empty (no flagged posts), it just removed the pending entry with no feedback.

**Fix:**
- If agent finds no results, update the pending entry to say "No flagged posts found with VVI ≥ 50. Try Trigger Viral Spike first."
- This gives clear feedback instead of making it look like it "disappeared"
- Added reasoning to pending state: "Agent is evaluating flagged posts (this may take 10-30 seconds)"

### 3. Trigger Viral Spike seems to do nothing
**Fix:**
- Now adds a system decision entry explaining what happened
- Shows which post was spiked
- Instructs user to run Agent Cycle next
- Makes the action feel connected to the decision log

### 4. What is Top-Up for if there's already balance?
The demo has 100 XLM pre-loaded in escrow for testing. Top-Up is for:
- **Production scenario**: Brands fund campaigns via Velo checkout
- **Demo scenario**: Simulating brand funding flow
- **Testing**: Running out of funds to test guardrails

The 100 XLM initial balance is a demo shortcut. In real use, campaigns start empty and brands top up via Velo.

## Flow After Scanning Video
1. **Trigger Viral Spike** → Injects viral content, increases VVI scores
2. **Run Agent Cycle** → Agent scans feed for posts with VVI ≥ 50
3. **Agent decides** → LLM evaluates posts, picks sponsor/amount/reason
4. **Guardrails check** → Verifies per-deal cap, daily cap, min escrow
5. **Noir payment** → `checkPayment` then `authorizePayment` on Stellar
6. **Decision logged** → Appears in Decision Log with status (paid/blocked/skipped)
7. **Budget updates** → Escrow balance decreases, daily spent increases

The "Cannot GET /" error persists because the success page is trying to redirect to the API server. Make sure your `FRONTEND_URL` is set correctly in `.env` and matches where your Vite dev server is running (usually port 5173).
