# Testnet Proof — Agentic Ad Broker

> Copy transaction hashes here after running setup scripts and agent cycles.
> Judges check this section against the README Testnet proof links.

---

## Setup Transactions (run `npm run setup:testnet` then `npm run setup:card`)

### 1. Account Creation & Friendbot Funding
| Account | Public Key | Friendbot Tx | Horizon Balance |
|---------|------------|--------------|-----------------|
| Owner   | `G...`     | [View](https://stellar.expert/explorer/testnet/tx/) | `XXXX XLM` |
| Agent   | `G...`     | [View](https://stellar.expert/explorer/testnet/tx/) | `XXXX XLM` |
| Creator | `G...`     | [View](https://stellar.expert/explorer/testnet/tx/) | `XXXX XLM` |

### 2. Campaign Card Registration
| Step | Contract | Transaction Hash | Stellar Expert |
|------|----------|------------------|----------------|
| `registerDevice` | device_registry | `REPLACE_ME` | [View](https://stellar.expert/explorer/testnet/tx/REPLACE_ME) |
| `registerAgent`  | agent_registry  | `REPLACE_ME` | [View](https://stellar.expert/explorer/testnet/tx/REPLACE_ME) |
| `fundEscrow`     | payment_escrow  | `REPLACE_ME` | [View](https://stellar.expert/explorer/testnet/tx/REPLACE_ME) |

**Device Hash:** `REPLACE_WITH_DEVICE_HASH_FROM_SETUP_TESTNET`
**Card UID:** `velo-noir-campaign-2026`
**Policy:** Native XLM, 5 XLM max/payment, 7-day expiry, 100 XLM escrow

---

## Agent Payment Cycles (run `npm run dev` → POST `/api/agent/run` or wait for timer)

### Cycle 1 — First Viral Detection & Payment
| Action | Transaction Hash | Stellar Expert | Status |
|--------|------------------|----------------|--------|
| `checkPayment` (1 XLM test) | — | — | ✅ OK |
| `authorizePayment` | `REPLACE_ME` | [View](https://stellar.expert/explorer/testnet/tx/REPLACE_ME) | ✅ Authorized |
| `claim` (creator) | `REPLACE_ME` | [View](https://stellar.expert/explorer/testnet/tx/REPLACE_ME) | ✅ Claimed |

**Decision Log Entry:**
- Post: `@taylor_toks` — "This trend is taking over my FYP! 💃 #viral #dance"
- VVI: 1847.2
- Sponsor: Nike
- Amount: 3.5 XLM
- Reason: "Viral dance trend aligns with Nike's movement campaigns; 200K views in 5 min shows strong youth engagement"
- Brand Safe: true

---

### Cycle 2 — Overspend Attempt (Demo Moment)
| Action | Transaction Hash | Stellar Expert | Status |
|--------|------------------|----------------|--------|
| `checkPayment` (6.0 XLM) | — | — | ❌ `over_limit` |
| `authorizePayment` | (not called) | — | Blocked by Noir policy |

**This is the key demo moment:** Noir refuses on-chain because amount > 5 XLM per-deal cap.

---

### Cycle 3 — Second Viral Payment
| Action | Transaction Hash | Stellar Expert | Status |
|--------|------------------|----------------|--------|
| `authorizePayment` | `REPLACE_ME` | [View](https://stellar.expert/explorer/testnet/tx/REPLACE_ME) | ✅ Authorized |
| `claim` | `REPLACE_ME` | [View](https://stellar.expert/explorer/testnet/tx/REPLACE_ME) | ✅ Claimed |

---

## Velo Top-Up Webhook Proof

| Event | Payment Intent ID | Amount | Webhook Verified | Budget Credited |
|-------|-------------------|--------|------------------|-----------------|
| `payment.succeeded` | `REPLACE_ME` | 10.0 XLM | ✅ HMAC-SHA256 | ✅ +10 XLM |

**Webhook URL:** `https://your-server.onrender.com/api/webhooks/velo`
**Verification:** `Velo.webhooks.verify({ payload, signature, secret })` — returns 400 on invalid signature

---

## Verification Checklist (Stranger Test)

- [ ] Fresh clone → `npm install` → works
- [ ] `cp .env.example .env` → fill keys → `npm run setup:testnet` → 3 funded accounts
- [ ] `npm run setup:card` → card registered, policy set, escrow funded (100 XLM)
- [ ] `npm run dev` → server starts on :3001, web on :3000
- [ ] Dashboard shows feed with VVI, decision log, budget panel, top-up button
- [ ] Click "Run Agent Cycle" → decision appears with LLM reason + Stellar Expert link
- [ ] Click "Force Overspend" → blocked by Noir `over_limit` (no tx sent)
- [ ] Click "Trigger Viral Spike" → new flagged post appears
- [ ] Create Velo checkout → pay with Testnet XLM → webhook fires → budget updates
- [ ] Deployed URL loads on phone via mobile data
- [ ] All secrets in `.env` only, never in code or git history
- [ ] Agent/owner keys only on server, never in browser bundle
- [ ] README links point to real files and real transactions

---

## Links for Judges

| Section | Link |
|---------|------|
| Noir Integration (code) | `packages/agent/src/noir.ts` |
| Velo Integration (code) | `apps/server/src/index.ts` |
| Testnet Proof (this file) | `docs/proof.md` |
| FundEscrow Tx | https://stellar.expert/explorer/testnet/tx/REPLACE_ME |
| First Authorize Tx | https://stellar.expert/explorer/testnet/tx/REPLACE_ME |
| Overspend Blocked | (checkPayment returns `over_limit` — no tx) |
| Velo Webhook Handler | `apps/server/src/index.ts#L244` |