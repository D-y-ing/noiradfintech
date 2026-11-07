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
import { Velo } from '@carts1024/velo-sdk';
import { PaymentRecord, TopupSession, BudgetState } from '@agentic-ad-broker/shared';
declare const app: import("express-serve-static-core").Express;
declare const velo: Velo | null;
declare let decisionLog: PaymentRecord[];
declare let budgetState: BudgetState;
declare let topupSessions: Map<string, TopupSession>;
export { app, velo, decisionLog, budgetState, topupSessions };
//# sourceMappingURL=index.d.ts.map