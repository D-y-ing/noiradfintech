# Public demo deployment

The Render Blueprint in `render.yaml` deploys the dashboard and API separately. The API uses a persistent disk for decision history and budget state.

1. Push this project to a GitHub repository (keep `.env` out of the repository; it is ignored).
2. In Render, create a new Blueprint and select that repository. The API uses a paid Starter service and a 1 GB persistent disk so payment and decision state survive restarts.
3. Fill the prompted secret values: `DEVICE_HASH`, `AGENT_SECRET`, `CREATOR_SECRET`, `VELO_API_KEY`, `VELO_WEBHOOK_SECRET`, and optionally `LLM_API_KEY`.
4. After Render creates the services, confirm the generated frontend and API URLs match the `FRONTEND_URL`, `PUBLIC_API_URL`, and `VITE_API_URL` values in the Blueprint.
5. In Velo, register `https://agentic-ad-broker-api.onrender.com/api/webhooks/velo` as the signed webhook URL for `payment.succeeded`.

The current server uses Velo Testnet and Stellar Testnet. It is configured as a public demo, not production/mainnet payments. Never commit `.env` or paste private signing keys into chat.
