# Button Purpose & Functionality

## The 3 Buttons in the Header

### ▶ Run Agent Cycle
**Purpose:** Manually trigger the AI agent to scan the live feed, evaluate posts for viral potential, and make payment decisions.

**What it does:**
- Calls `POST /api/agent/run`
- Agent computes VVI (Viral Velocity Index) for all posts
- Checks for posts with VVI ≥ 50
- Uses LLM to decide: which sponsor, how much to pay, and why
- Calls Noir SDK `checkPayment` → `authorizePayment` if guardrails pass
- Updates Decision Log with results
- Refreshes budget and feed data

**When to use:** When you want to see the agent actively evaluate current posts instead of waiting for the 30-second auto-loop.

### ⚡ Trigger Viral Spike
**Purpose:** Inject simulated viral content into the feed for testing/demo purposes.

**What it does:**
- Calls `POST /api/feed/spike`
- Simulates a viral spike on a random post or the one you specify
- Metrics (views, shares, comments, likes) increase rapidly
- VVI jumps dramatically
- Makes posts eligible for agent payment

**When to use:** When the feed is quiet and you want to create test scenarios. This is how you get more decisions to appear.

### 💥 Force Overspend
**Purpose:** Demo the Noir on-chain guardrails by attempting a payment that exceeds limits.

**What it does:**
- Calls `POST /api/agent/overspend`
- Attempts to pay an amount that violates daily cap or per-deal cap
- Noir SDK should BLOCK this with `over_limit` error
- Decision Log shows "BLOCKED" status with reason
- Demonstrates that code guardrails + on-chain enforcement work

**When to use:** To prove the system can't overspend even when trying. This is the key demo moment.

## Budget Panel Explained

The Budget & Guardrails panel shows how funds are managed:

**Escrow Balance:** XLM available in the payment escrow for the agent to disburse. Starts at 100 XLM.

**Per-Deal Cap:** Maximum payment per sponsorship (5 XLM). Enforced by Noir policy.

**Daily Spent / Cap:** How much has been spent today vs daily limit (20 XLM). Color changes: yellow at 80%, red at 100%.

**Min Escrow Left:** Reserve amount (1.0 XLM) that must remain to keep escrow active. If balance drops below this, agent stops paying.

**Guardrails Section:**
- **Daily Spent (Guardrails):** In-memory tracking of spending
- **Posts Paid Today:** Number of unique posts paid (prevents double-paying)
- **Daily Resets At:** When counters reset (24h window)
- **Policy Expires:** When agent key expires (7 days from setup)

**What are Guardrails?** Hard limits enforced both in code AND on-chain by Noir. Even if the agent tries to cheat, Noir blocks it.
