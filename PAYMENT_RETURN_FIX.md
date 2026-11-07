# Payment Return Fix

## Problem
After completing a Velo payment, users were redirected to a page that showed "Cannot GET /" (blank white page with error).

## Root Cause
Velo checkout success URLs were configured to redirect to `/topup/success` without preserving the return URL to the app. When Velo redirects users back after payment, they landed on the server's success page but the "Return to app" links were pointing to `PUBLIC_API_URL` which is the API server URL, not the frontend URL where the app actually runs.

Also, the success page was using hardcoded `PUBLIC_API_URL` instead of respecting the `returnUrl` query parameter.

## Fix Applied

### 1. Server-side changes (`apps/server/src/index.ts`)
- Modified checkout session creation to pass `returnUrl` as query param in success/cancel URLs
- Updated `/topup/success` endpoint to read `returnUrl` from query params and use it in the page
- Updated `/topup/success/:sessionId` to use returnUrl
- Updated `/topup/cancel` to use returnUrl
- Success page now shows "Return to app →" link that goes back to the frontend

### 2. Client-side changes (`apps/web/src/components/TopupPanel.tsx`)
- Added helpful message: "After payment, click 'Return to Merchant' or you'll be redirected back automatically"
- This prepares users for the Velo flow

## How it works now
1. User clicks "Open Velo Checkout"
2. Velo processes payment
3. Velo redirects to `/topup/success?returnUrl=https://your-frontend.com`
4. Success page confirms payment and shows "Return to app →" button
5. User clicks and returns to dashboard where budget is automatically refreshed

## Important Note
Make sure `PUBLIC_API_URL` in your `.env` is set to your **API server URL** (e.g., https://your-server.onrender.com), and the frontend is configured with `VITE_API_URL` pointing to the same API server.

The `returnUrl` should be your frontend URL (e.g., https://your-app.vercel.app), which gets passed through from the checkout session.
