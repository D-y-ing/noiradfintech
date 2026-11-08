# Decision Log & Analytics Fix

## Problem
Decision Log felt "dead" with no decisions showing, and Analytics panel was showing raw JSON that looked broken.

## Root Cause
1. **Decision Log empty**: Agent needs flagged posts (VVI ≥ 50) to make decisions. The feed simulation has 3 viral spikes but they may not be active, and LLM API key is not configured so agent uses rule-based fallback which can be slow
2. **Analytics panel**: Was just dumping JSON, no actual metrics
3. **API base URL**: Hardcoded empty string fallback caused issues

## Fixes Applied

### 1. Decision Log Improvements
- Added better empty state with instructions: "1. Trigger Viral Spike → 2. Run Agent Cycle"
- Added visual feedback when running agent (optimistic UI with "Scanning..." entry)
- Added creator handle and VVI to decision footer for more context
- Decision items now show more metadata

### 2. Analytics Panel Completely Rebuilt
Now shows actionable metrics:
- **Total Posts**: Live feed count
- **Total Decisions**: Agent actions taken
- **Paid Sponsorships**: Successful payments
- **Avg VVI**: Average viral velocity
- **Total Spent**: Creator payouts in XLM
- **Blocked Attempts**: Guardrails triggered

Plus:
- Platform Distribution breakdown
- Recent Decisions list (last 5)
- Proper styling matching rest of app

### 3. API Improvements
- Default API_BASE to `http://localhost:3001` instead of empty string
- Added `Promise.allSettled` for better error handling (one API failure doesn't break whole dashboard)
- Fetch continues even if one endpoint fails

### 4. User Experience
- Decision Log subtitle now shows "X decisions • Live"
- Better empty states with helpful instructions
- Analytics panel is now actually useful for understanding campaign performance

## How to Test
1. Click "⚡ Trigger Viral Spike" - should create flagged posts
2. Click "▶ Run Agent Cycle" - should create decisions in log
3. Switch to Analytics tab - should show metrics updating
4. All data refreshes every 10 seconds automatically

The decision log and analytics now feel alive and connected to the actual agent actions.
