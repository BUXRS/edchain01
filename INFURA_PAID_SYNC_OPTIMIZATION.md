# Infura Paid Plan - Sync & Fetch Optimization

## Overview

The project uses **tier-aware sync configuration** to optimize performance when using Infura's paid plan (Growth/Scale). With higher rate limits (100k+ req/day, higher throughput), delays are reduced so status updates propagate faster.

## Sync Config (`lib/config/sync-config.ts`)

Centralized tier detection and configurable delays. **Paid tier values are tuned for Infura paid capacity.** Optional `INFURA_PLAN=scale` uses even faster values for Scale tier.

| Setting | Free | Paid (Growth) | Scale | Env Override |
|---------|------|----------------|-------|--------------|
| RPC request delay | 1000ms | 100ms | 50ms | `RPC_REQUEST_DELAY` |
| Polling interval | 60s | 15s | 10s | `POLLING_INTERVAL` |
| University sync delay | 2000ms | 250ms | 150ms | `SYNC_DELAY_UNIVERSITY_MS` |
| Entity sync delay | 1000ms | 150ms | 100ms | `SYNC_DELAY_ENTITY_MS` |
| Fetch throttle (min–max) | 30–60s | 2–5s | 1–3s | `FETCH_THROTTLE_MIN_MS`, `FETCH_THROTTLE_MAX_MS` |
| Realtime sync interval | 30s | 10s | 5s | `REALTIME_SYNC_INTERVAL` |
| Indexer batch delay (per 10 events) | 500ms | 200ms | 100ms | `INDEXER_BATCH_DELAY_MS` |
| Page load RPC defer | 2000ms | 0ms | 0ms | `PAGE_LOAD_RPC_DEFER_MS` |

### 2. Enable Paid Tier

Add to `.env`:

```env
RPC_PAID_TIER=true
NEXT_PUBLIC_RPC_PAID_TIER=true
```

Optional (faster values for Infura Scale tier):

```env
INFURA_PLAN=scale
```

### 3. Files Updated

- **IndexerService** – Uses `getPollingInterval()` and `getRpcRequestDelay()`
- **blockchain-sync** – Uses `getSyncDelayUniversity()` and `getSyncDelayEntity()`
- **blockchain.ts** – `fetchUniversityFromBlockchain` throttle uses `getFetchThrottleMinMs()` / `getFetchThrottleMaxMs()`
- **realtime-sync** – Uses `getRealtimeSyncInterval()`
- **Verifiers page** – Uses `getPageLoadRpcDeferMs()` (no 2s defer on paid tier)

## Expected Impact

| Metric | Free | Paid (Growth) | Scale |
|--------|------|----------------|-------|
| Indexer polling | Every 60s | Every 15s | Every 10s |
| RPC call spacing | 1s | 100ms | 50ms |
| University sync loop | 2s between | 250ms | 150ms |
| Entity sync loop | 1s between | 150ms | 100ms |
| `fetchUniversityFromBlockchain` throttle | 30–60s | 2–5s | 1–3s |
| Realtime sync | Every 30s | Every 10s | Every 5s |
| Indexer batch delay | 500ms/10 events | 200ms | 100ms |
| Verifiers page load | 2s defer | Immediate | Immediate |

## Manual Overrides

You can override any value via environment variables:

```env
# Explicit values (override tier defaults)
RPC_REQUEST_DELAY=100
POLLING_INTERVAL=15000
SYNC_DELAY_UNIVERSITY_MS=250
SYNC_DELAY_ENTITY_MS=150
FETCH_THROTTLE_MIN_MS=2000
FETCH_THROTTLE_MAX_MS=5000
REALTIME_SYNC_INTERVAL=10000
INDEXER_BATCH_DELAY_MS=200
PAGE_LOAD_RPC_DEFER_MS=0
```

## Reverting to Free Tier

Remove or set to false:

```env
RPC_PAID_TIER=false
NEXT_PUBLIC_RPC_PAID_TIER=false
```

The app will use the conservative free-tier delays again.
