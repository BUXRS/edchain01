# Production RPC & Infura Credit Management

For the **online (Vercel) deployment**, blockchain RPC (Infura) is used in an **on-demand** way so credits are not consumed by background processes.

## What runs automatically on Vercel

- **Nothing** that continuously calls Infura. The app does **not** start:
  - Indexer (no `getBlockNumber` / `getLogs` polling)
  - Reconciler
  - RPC health monitoring
  - Auto realtime sync (no `setInterval` sync)

So RPC is **not** used on every cold start or on a timer.

## When RPC is used (on-demand only)

1. **Scheduled sync (cron)**  
   Once per day, Vercel Cron calls `/api/cron/sync`, which runs a full blockchain sync. That is the only **automatic** RPC usage.

2. **User / admin actions**  
   RPC is used only when someone triggers an action that needs chain data, for example:
   - Verify a degree (public or admin)
   - View degree NFT / image
   - Admin: “Sync now”, “Restart indexer”, sync status (block number check)
   - Issue degree, add issuer/revoker/verifier, etc.

So usage is tied to **links and user requests**, not to background polling or health checks.

## How it’s implemented

- **`instrumentation.ts`**  
  If `VERCEL=1` or `RPC_ON_DEMAND_ONLY=true`, it does **not** start the indexer, reconciler, or RPC health monitoring.

- **`lib/startup/auto-sync-init.ts`**  
  If `VERCEL=1` or `RPC_ON_DEMAND_ONLY=true`, it does **not** start realtime sync (no periodic `performIncrementalSync`).

- **`/api/health`**  
  On Vercel, the health route skips RPC/WebSocket checks by default (no `getNetwork` / `getBlockNumber` on every health request).

Result: **blockchain RPC integration is based on cron and user/admin requests**, not on background loops or health checks.

## Optional: same behavior outside Vercel

To get the same “on-demand only” behavior on another host (e.g. another serverless or a long-running server), set:

```bash
RPC_ON_DEMAND_ONLY=true
```

Then only cron and explicit user/admin actions will call Infura; no indexer, no reconciler, no auto sync, no RPC health monitoring.

## Commercial / production checklist

1. **Vercel**  
   No extra env needed; `VERCEL=1` is set by Vercel and already enables on-demand-only behavior.

2. **Infura plan**  
   Use a plan (or credit pack) that matches your expected daily requests (cron once/day + user-driven verify/issue/sync).

3. **Cron**  
   Keep one daily cron job for `/api/cron/sync`. Do not add more frequent cron that hits RPC unless you have the quota.

4. **Uptime / health**  
   Prefer `/api/ping` or a health check that does **not** call RPC. If you use `/api/health`, keep the default (RPC skipped on production).

5. **If you need real-time indexing later**  
   Run the indexer on a **single long-running process** (e.g. a dedicated worker with a paid Infura plan), not on every serverless instance. The current app is designed so that on Vercel you don’t need that for normal operation.
