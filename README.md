# Agentic Ad Broker

**One-line pitch:** An AI agent that detects viral social content in seconds and pays creators instantly through on-chain spending limits — no human approval needed.

**Live website:** https://your-app.vercel.app
**Demo video (2 min):** https://your-video-link.com
**Pitch deck:** https://your-deck-link.com
**Team:** John Raven (Discord: @raven), [Teammate 2] (Discord: @handle)

---

## Problem

Viral content has a shelf life of hours, but brand sponsorship deals take days or weeks to negotiate, approve, and pay. Creators miss their monetization window, and brands miss the cultural moment. Existing platforms require human intermediaries at every step — no one can act at the speed of viral.

## Solution

Agentic Ad Broker is an autonomous AI agent that monitors a simulated social feed, computes a Viral Velocity Index (VVI) in real time, and when a post crosses a threshold, the agent:
1. **Decides** — uses an LLM to pick a sponsor, amount, and reason (with rule-based fallback)
2. **Checks** — calls Noir's `checkPayment` to verify the payment fits on-chain policy
3. **Pays** — calls `authorizePayment` with its constrained agent key; the creator claims instantly
4. **Logs** — every decision, transaction hash, and Stellar Expert link is recorded

Brands fund the campaign budget through Velo checkout sessions; signed `payment.succeeded` webhooks credit the escrow automatically. The agent never handles brand funds directly — Velo handles checkout and ledger confirmation; Noir enforces the agent's on-chain spending limits.

## How the agentic payment works

| Step | Who/What | Action |
|------|----------|--------|
| 1 | **Agent** | Polls simulated feed → computes VVI = (Δviews + 5×Δshares + 2×Δcomments) ÷ Δminutes |
| 2 | **Agent** | Flags posts with VVI ≥ 50 → calls LLM for sponsor/amount/reason/brandSafe |
| 3 | **Agent** | Validates LLM response (Zod schema); retries once; falls back to rule-based amount |
| 4 | **Guardrails** | Code enforces: per-deal cap (5 XLM), daily cap (20 XLM), one pay/post, min escrow |
| 5 | **Noir SDK** | `checkPayment(deviceHash, agent, asset, amount)` → `{ ok: true }` or `{ ok: false, reason }` |
| 6 | **Noir SDK** | `authorizePayment(agent: keypairSigner, deviceHash, merchant, asset, amount)` → tx hash |
| 7 | **Creator** | `claim(deviceHash, asset)` collects pending balance (demo: server calls with creator key) |
| 8 | **Dashboard** | Decision logged with LLM reason, amount, status, Stellar Expert link |

**No human click triggers the creator payout.** The agent holds a constrained Noir agent key (set by the card owner via `registerAgent` with max 5 XLM/payment, 7-day expiry). The escrow is funded by the owner (100 XLM demo). Velo handles brand-side top-ups only.

## Architecture

```mermaid
flowchart LR
    subgraph "Agentic Ad Broker"
        A[Simulated Feed\n(SocialSource)] --> B[Agent Brain\npackages/agent]
        B --> C[Guardrails\n(code)]
        C --> D{LLM Decision}
        D -->|ok| E[Noir SDK\n@noirx402/agent-sdk]
        D -->|blocked| F[Log: BLOCKED]
        E --> G[checkPayment]
        G -->|ok| H[authorizePayment]
        G -->|fail| F
        H --> I[Creator claims\nvia Noir SDK]
        I --> J[Decision Log\n+ Stellar Expert]
    end

    subgraph "Brand Side (Velo)"
        K[Brand UI\nTop-up Button] --> L[Velo Checkout\n@carts1024/velo-sdk]
        L --> M[Stellar Ledger\nConfirms]
        M --> N[Signed Webhook\npayment.succeeded]
        N --> O[Server\n/apps/server]
        O --> P[Credit Budget\n+ fundEscrow*]
    end

    P -.->|demo shortcut| Q[Noir Escrow\npayment_escrow]
    E -.->|on-chain| Q
    I -.->|on-chain| Q

    style Q fill:#1e293b,stroke:#22d3ee
    style E fill:#1e293b,stroke:#a855f7
    style L fill:#1e293b,stroke:#f59e0b
```

*Demo shortcut: After Velo confirms top-up, server calls `fundEscrow` with Testnet-only owner key (disclosed in README). No wallet pop-up needed for demo.

## Noir integration

- **SDK version:** `@noirx402/agent-sdk@^1.0.0` (with `@stellar/stellar-sdk@^13.1.0` peer)
- **Contracts called (Testnet, 2026-10-24 redeploy IDs built into SDK):**
  - `device_registry` — `CAC4KOLHDLDYDWBOKXNKRN5KVHO56PLOIFXDLTBUWGVN6GVDEB7FQHU5`
  - `agent_registry` — `CCMZDSPTLX7IIJWCYEUM5DJUHOSOYSTHGK777S2TXZWEMC5ZZGPJ3EBV`
  - `payment_escrow` — `CC7EAW5FNJEDBS7THM5IT6XIOHO4AOYMLXT3KSZ3HWUIKEACTW7E5BFS`
- **SDK methods used (with file/line links):**
  - `noir.registerDevice()` — [`scripts/setup-card.ts:68`](scripts/setup-card.ts#L68)
  - `noir.registerAgent()` — [`scripts/setup-card.ts:94`](scripts/setup-card.ts#L94)
  - `noir.fundEscrow()` — [`scripts/setup-card.ts:118`](scripts/setup-card.ts#L118)
  - `noir.checkPayment()` — [`packages/agent/src/noir.ts:62`](packages/agent/src/noir.ts#L62)
  - `noir.authorizePayment()` — [`packages/agent/src/noir.ts:82`](packages/agent/src/noir.ts#L82)
  - `noir.claim()` — [`packages/agent/src/noir.ts:98`](packages/agent/src/noir.ts#L98)
  - `noir.watch()` — [`packages/agent/src/noir.ts:165`](packages/agent/src/noir.ts#L165)
- **Asset:** Native XLM via `Asset.native().contractId(Networks.TESTNET)` (Testnet only)
- **Amounts:** All in stroops (bigint) via `toStroops()` / `fromStroops()`
- **Signers:** `keypairSigner(AGENT_SECRET)` for server-side agent; `keypairSigner(CREATOR_SECRET)` for claim

## Velo integration

- **SDK version:** `@carts1024/velo-sdk@alpha`
- **What Velo does in this app:**
  - Creates checkout sessions for brand top-ups (`velo.checkout.sessions.create`)
  - Retrieves payment intent status (`velo.paymentIntents.retrieve`)
  - Sends signed `payment.succeeded` webhooks to `/api/webhooks/velo`
  - Server verifies with `Velo.webhooks.verify()` (HMAC-SHA256, `x-velo-signature` header)
  - On success, credits budget and optionally calls `fundEscrow` (demo shortcut)
- **Files that call Velo:**
  - [`apps/server/src/index.ts:196`](apps/server/src/index.ts#L196) — `POST /api/topup` creates checkout
  - [`apps/server/src/index.ts:226`](apps/server/src/index.ts#L226) — `GET /api/topup/:id` retrieves status
  - [`apps/server/src/index.ts:244`](apps/server/src/index.ts#L244) — `POST /api/webhooks/velo` verifies & handles `payment.succeeded`

## Testnet proof

- **FundEscrow transaction (escrow funding):**
  - Hash: `REPLACE_WITH_YOUR_FUND_ESCROW_TX_HASH`
  - Stellar Expert: https://stellar.expert/explorer/testnet/tx/REPLACE_WITH_YOUR_FUND_ESCROW_TX_HASH
- **First authorizePayment (agent pays creator):**
  - Hash: `REPLACE_WITH_YOUR_AUTHORIZE_TX_HASH`
  - Stellar Expert: https://stellar.expert/explorer/testnet/tx/REPLACE_WITH_YOUR_AUTHORIZE_TX_HASH
- **Claim transaction (creator collects):**
  - Hash: `REPLACE_WITH_YOUR_CLAIM_TX_HASH`
  - Stellar Expert: https://stellar.expert/explorer/testnet/tx/REPLACE_WITH_YOUR_CLAIM_TX_HASH
- **Overspend attempt (blocked by Noir `over_limit`):**
  - Hash: `REPLACE_WITH_YOUR_OVERSPEND_TX_HASH` (if any; checkPayment returns `over_limit` before tx)
  - This is the key demo moment — Noir refuses on-chain

> **After running `npm run setup:card` and the first agent cycle, copy the transaction hashes from the console output and Stellar Expert into the lines above.**

## Repo structure

```
agentic-ad-broker/
├── apps/
│   ├── web/              # React + Vite dashboard (live feed, decisions, budget, top-up)
│   └── server/           # Express API (Velo webhooks, agent loop, REST endpoints)
├── packages/
│   ├── agent/            # Noir SDK calls + agent brain (decide, guardrails, LLM)
│   └── shared/           # Types, feed simulation, VVI computation, constants
├── scripts/
│   ├── setup-testnet.ts  # Creates 3 Testnet accounts, funds via Friendbot
│   └── setup-card.ts     # registerDevice, registerAgent, fundEscrow
├── docs/
│   └── proof.md          # Testnet transaction hashes and links
├── .env.example          # All required environment variables (empty)
├── package.json          # Workspace root (npm workspaces)
├── tsconfig.json         # TypeScript config
└── README.md             # This file (judging README)
```

## Run it locally

### Prerequisites

- **Node.js** v22.23.4, v24.22.1, or ≥26.12.1 (required by Noir SDK)
- **Noir Chrome Extension** installed, wallet created, funded with Friendbot
- **Velo API Key** from https://velo-build.dev (Testnet)
- **LLM API Key** (OpenAI or Anthropic) for agent decisions
- **Testnet XLM** from Friendbot (https://friendbot.stellar.org)

### Install

```bash
# Clone the repo
git clone https://github.com/your-username/agentic-ad-broker.git
cd agentic-ad-broker

# Install all workspaces (single command)
npm install
```

### Configure

```bash
# Copy environment template
cp .env.example .env

# Fill in .env with your keys:
# AGENT_SECRET, OWNER_SECRET, CREATOR_SECRET (from setup-testnet)
# DEVICE_HASH (from setup-card)
# VELO_API_KEY, VELO_WEBHOOK_SECRET (from velo-build.dev)
# LLM_API_KEY (OpenAI or Anthropic)
# PUBLIC_API_URL (your deployed server URL, e.g. https://your-server.onrender.com)
# VITE_API_URL (same as PUBLIC_API_URL)
```

### Setup Testnet (run once)

```bash
# 1. Create and fund 3 Testnet accounts (owner, agent, creator)
npm run setup:testnet

# 2. Register campaign card, set policy, fund escrow (100 XLM)
npm run setup:card

# Copy the fundEscrow transaction hash to docs/proof.md and README Testnet proof section
```

### Start development

```bash
# Terminal 1: Start server (API + agent loop + Velo webhook)
npm run dev --workspace=apps/server

# Terminal 2: Start web dashboard
npm run dev --workspace=apps/web

# Or both together:
npm run dev
```

Open http://localhost:3000 (web) and http://localhost:3001 (API).

### Deploy

1. **Server** → Render or Railway
   - Set `PUBLIC_API_URL` to your deployed server URL
   - Add Velo webhook URL in Velo dashboard: `https://your-server.onrender.com/api/webhooks/velo`
   - Make one real Testnet top-up to verify webhook works

2. **Web** → Vercel or Netlify
   - Set `VITE_API_URL` to your deployed server URL
   - Open the deployed URL from your phone on mobile data to confirm public access

## Environment variables

| Name | What it is | Where to get it |
|------|------------|-----------------|
| `AGENT_SECRET` | Agent keypair secret (server-only, pays fees ~2.3 XLM first tap) | `npm run setup:testnet` generates |
| `OWNER_SECRET` | Card owner secret (registers device, sets policy, funds escrow) | `npm run setup:testnet` generates |
| `CREATOR_SECRET` | Creator/merchant secret (claims payments) | `npm run setup:testnet` generates |
| `CARD_UID` | Campaign card identifier (any string, SHA-256 → deviceHash) | Choose any, e.g. `velo-noir-campaign-2026` |
| `DEVICE_HASH` | SHA-256 of CARD_UID (computed by setup scripts) | `npm run setup:testnet` computes |
| `VELO_API_KEY` | Velo Testnet API key | https://velo-build.dev → Project → API Keys |
| `VELO_WEBHOOK_SECRET` | Velo webhook signing secret | https://velo-build.dev → Project → Webhooks |
| `PUBLIC_API_URL` | Public server URL (for webhooks + redirects) | Your Render/Railway URL |
| `VITE_API_URL` | Same as PUBLIC_API_URL (for frontend) | Same as above |
| `LLM_API_KEY` | OpenAI or Anthropic API key | platform.openai.com or console.anthropic.com |
| `LLM_MODEL` | Optional model override (default: gpt-4o-mini) | — |
| `PER_DEAL_CAP_XLM` | Max per payment (default: 5.0) | Matches Noir policy |
| `DAILY_CAP_XLM` | Max per day (default: 20.0) | Enforced in agent code |
| `ESCROW_FUNDING_XLM` | Initial escrow funding (default: 100.0) | `npm run setup:card` |
| `POLICY_EXPIRES_DAYS` | Agent policy expiry (default: 7) | `npm run setup:card` |

## Screenshots

| Dashboard — Live Feed with VVI | Dashboard — Decision Log |
|--------------------------------|--------------------------|
| ![Feed](docs/screenshots/feed.png) | ![Decisions](docs/screenshots/decisions.png) |

| Dashboard — Budget & Guardrails | Dashboard — Velo Top-Up |
|----------------------------------|-------------------------|
| ![Budget](docs/screenshots/budget.png) | ![Topup](docs/screenshots/topup.png) |

> **Add screenshots to `docs/screenshots/` after running the dashboard. Judges expect visual evidence.**

## What's next

- **Real social APIs:** Replace `SimulatedFeed` with X/TikTok/Instagram APIs (needs approval, rate limits)
- **Creator wallet integration:** Let creators claim via Noir Chrome extension or Stellar Wallets Kit
- **Multi-campaign support:** Multiple cards, agents, and budgets per brand
- **Analytics:** Historical VVI trends, creator performance, ROI per brand
- **Mainnet:** Swap Testnet contracts for Mainnet when ready (audit first)

## Credits

- **Noir SDK** — `@noirx402/agent-sdk` (contactless payments on Stellar via x402)
- **Velo SDK** — `@carts1024/velo-sdk` (checkout, confirmed payments, signed webhooks)
- **Stellar SDK** — `@stellar/stellar-sdk` (Testnet accounts, Horizon, Soroban)
- **Viral Velocity Index** — Inspired by social media velocity metrics
- **Simulated feed** — Scripted viral spikes for repeatable demos (20 creators, 3 spikes)
- **Design** — Custom dark theme with Inter + JetBrains Mono

---

**Built for Velo x Noir Agentic Payment Hackathon 2026**  
**Testnet only • No real funds • Simulated social feed disclosed**