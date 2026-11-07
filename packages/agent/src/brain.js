import { z } from "zod";
import {
  PER_DEAL_CAP_XLM,
  DAILY_CAP_XLM,
  MIN_ESCROW_LEFT_XLM,
  simulatedFeed
} from "@agentic-ad-broker/shared";
import { payCreator } from "./noir.js";
const LLMSchema = z.object({
  sponsor: z.string().min(1).max(100),
  amountXlm: z.string().regex(/^\d+(\.\d{1,7})?$/),
  // XLM with up to 7 decimals
  reason: z.string().min(10).max(500),
  brandSafe: z.boolean()
});
const guardrailsState = {
  dailySpentXlm: 0,
  paidPostIds: /* @__PURE__ */ new Set(),
  dailyPaidPostIds: /* @__PURE__ */ new Set(),
  lastReset: Date.now()
};
function stablePostId(postId) {
  return postId.replace(/^(post_[^_]+_\d+)_\d+$/, "$1");
}
function maybeResetDaily() {
  const now = Date.now();
  if (now - guardrailsState.lastReset >= 24 * 60 * 60 * 1e3) {
    guardrailsState.dailySpentXlm = 0;
    guardrailsState.dailyPaidPostIds.clear();
    guardrailsState.lastReset = now;
  }
}
function restoreGuardrailsState(records) {
  guardrailsState.dailySpentXlm = 0;
  guardrailsState.paidPostIds.clear();
  guardrailsState.dailyPaidPostIds.clear();
  guardrailsState.lastReset = Date.now();
  const dailyWindowStart = Date.now() - 24 * 60 * 60 * 1e3;
  for (const record of records) {
    if (record.status !== "paid") continue;
    guardrailsState.paidPostIds.add(stablePostId(record.decision.candidate.post.id));
    if (record.timestamp >= dailyWindowStart) {
      guardrailsState.dailySpentXlm += parseFloat(record.decision.amountXlm) || 0;
      guardrailsState.dailyPaidPostIds.add(stablePostId(record.decision.candidate.post.id));
    }
  }
}
function checkGuardrails(candidate, amountXlm) {
  maybeResetDaily();
  const amount = parseFloat(amountXlm);
  const perDealCap = parseFloat(PER_DEAL_CAP_XLM);
  const dailyCap = parseFloat(DAILY_CAP_XLM);
  const minEscrowLeft = parseFloat(MIN_ESCROW_LEFT_XLM);
  if (amount > perDealCap) {
    return { ok: false, reason: `Amount ${amountXlm} XLM exceeds per-deal cap of ${PER_DEAL_CAP_XLM} XLM` };
  }
  if (guardrailsState.dailySpentXlm + amount > dailyCap) {
    return { ok: false, reason: `Daily cap of ${DAILY_CAP_XLM} XLM would be exceeded (spent: ${guardrailsState.dailySpentXlm} XLM)` };
  }
  if (guardrailsState.paidPostIds.has(stablePostId(candidate.post.id))) {
    return { ok: false, reason: `Post ${candidate.post.id} already paid` };
  }
  return { ok: true };
}
function recordPayment(postId, amountXlm) {
  guardrailsState.dailySpentXlm += parseFloat(amountXlm);
  guardrailsState.paidPostIds.add(stablePostId(postId));
  guardrailsState.dailyPaidPostIds.add(stablePostId(postId));
}
function getGuardrailsState() {
  maybeResetDaily();
  return {
    dailySpentXlm: guardrailsState.dailySpentXlm,
    paidPostIds: new Set(guardrailsState.paidPostIds),
    dailyPaidPostIds: new Set(guardrailsState.dailyPaidPostIds),
    lastReset: guardrailsState.lastReset
  };
}
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";
const SYSTEM_PROMPT = `You are an AI agent that decides on viral content sponsorship deals.

Given a social media post that's going viral, decide:
1. Which brand would sponsor it (plausible brand name)
2. How much to pay in XLM (max ${PER_DEAL_CAP_XLM} XLM per deal)
3. A brief reason (1-2 sentences)
4. Whether it's brand safe (true/false)

Rules:
- Payment must be <= ${PER_DEAL_CAP_XLM} XLM
- Only sponsor brand-safe content (no controversy, adult, political, etc.)
- Reason should explain the viral mechanics and brand fit
- Return ONLY valid JSON matching the schema

Example:
{
  "sponsor": "Nike",
  "amountXlm": "3.5",
  "reason": "Viral dance trend aligns with Nike's movement campaigns; 200K views in 5 min shows strong youth engagement",
  "brandSafe": true
}`;
async function callLLM(candidate) {
  if (!LLM_API_KEY) {
    throw new Error("LLM_API_KEY not configured");
  }
  const prompt = `Post: "${candidate.post.content}"
Creator: ${candidate.post.creatorHandle} (${candidate.post.platform})
VVI: ${candidate.vvi.toFixed(1)}
Delta (5 min): +${candidate.delta.views} views, +${candidate.delta.shares} shares, +${candidate.delta.comments} comments
Creator wallet: ${candidate.post.creatorWallet}

Decide sponsorship.`;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 300
      })
    });
    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return LLMSchema.parse(parsed);
  } catch (error) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": LLM_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      const data = await response.json();
      const content = data.content[0]?.text || "{}";
      const parsed = JSON.parse(content);
      return LLMSchema.parse(parsed);
    } catch {
      throw error;
    }
  }
}
function ruleBasedDecision(candidate) {
  const vviRatio = Math.min(candidate.vvi / 200, 1);
  const amount = Math.max(1, Math.round(vviRatio * parseFloat(PER_DEAL_CAP_XLM) * 10) / 10);
  const brands = {
    x: ["TechCorp", "NewsNetwork", "DevTools"],
    tiktok: ["FashionBrand", "BeautyCo", "MusicLabel"],
    instagram: ["LifestyleBrand", "TravelCo", "FoodChain"],
    simulated: ["DemoBrand", "TestSponsor", "HackathonCo"]
  };
  const platformBrands = brands[candidate.post.platform] || brands.simulated;
  const sponsor = platformBrands[Math.floor(Math.random() * platformBrands.length)];
  return {
    sponsor,
    amountXlm: amount.toFixed(1),
    reason: `Rule-based: VVI ${candidate.vvi.toFixed(1)} suggests ${vviRatio * 100}% viral velocity. ${sponsor} targets ${candidate.post.platform} creators.`,
    brandSafe: true
  };
}
async function decide(candidate) {
  const maxAmount = PER_DEAL_CAP_XLM;
  const guardrailCheck = checkGuardrails(candidate, maxAmount);
  if (!guardrailCheck.ok) {
    console.log(`[Guardrails] Blocked: ${guardrailCheck.reason}`);
    return null;
  }
  let llmResponse;
  try {
    llmResponse = await callLLM(candidate);
  } catch (error) {
    console.warn("[LLM] Failed, using rule-based fallback:", error instanceof Error ? error.message : error);
    llmResponse = ruleBasedDecision(candidate);
  }
  const finalAmount = Math.min(parseFloat(llmResponse.amountXlm), parseFloat(PER_DEAL_CAP_XLM)).toFixed(1);
  const finalGuardrailCheck = checkGuardrails(candidate, finalAmount);
  if (!finalGuardrailCheck.ok) {
    console.log(`[Guardrails] LLM amount blocked: ${finalGuardrailCheck.reason}`);
    return null;
  }
  const decision = {
    candidate,
    sponsor: llmResponse.sponsor,
    amountXlm: finalAmount,
    reason: llmResponse.reason,
    brandSafe: llmResponse.brandSafe,
    timestamp: Date.now()
  };
  return decision;
}
async function executeDecision(decision) {
  const guardrailCheck = checkGuardrails(decision.candidate, decision.amountXlm);
  if (!guardrailCheck.ok) {
    return {
      decision,
      status: "blocked",
      error: guardrailCheck.reason,
      timestamp: Date.now()
    };
  }
  const record = await payCreator(decision);
  if (record.status === "paid") {
    recordPayment(decision.candidate.post.id, decision.amountXlm);
  }
  return record;
}
async function runAgentCycle() {
  const candidates = simulatedFeed.getCandidates();
  const results = [];
  for (const candidate of candidates) {
    if (guardrailsState.paidPostIds.has(stablePostId(candidate.post.id))) {
      continue;
    }
    const decision = await decide(candidate);
    if (!decision) {
      results.push({
        decision: {
          candidate,
          sponsor: "BLOCKED",
          amountXlm: "0",
          reason: "Guardrails failed",
          brandSafe: true,
          timestamp: Date.now()
        },
        status: "blocked",
        error: "Guardrails check failed",
        timestamp: Date.now()
      });
      continue;
    }
    const record = await executeDecision(decision);
    results.push(record);
  }
  return results;
}
export {
  checkGuardrails,
  decide,
  executeDecision,
  getGuardrailsState,
  recordPayment,
  restoreGuardrailsState,
  runAgentCycle
};
