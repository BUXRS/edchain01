# 🚀 Automated Real-Time Blockchain Data Sync Guide

## Overview

Your application uses a **fully automated, real-time blockchain data sync system** based on **Event Sourcing + CQRS** architecture. The indexer automatically fetches and fills all blockchain data to the database.

## How It Works

### 1. **Indexer Service** (Primary Ingestion)
- **Location**: `lib/services/indexer/IndexerService.ts`
- **Starts automatically** when the Next.js server starts (via `instrumentation.ts`)
- **Mode**: WebSocket-first, falls back to HTTP polling (Base RPC doesn't support WebSocket)
- **Polling interval**: 30 seconds
- **What it does**:
  - Polls blockchain for new events every 30 seconds
  - Stores all events in `chain_events` table (immutable event log)
  - Looks back up to 100k blocks on first run to catch all historical events
  - Processes events and applies projections to materialized tables

### 2. **Comprehensive Full Sync** (Data Population)
- **Runs automatically**:
  - ✅ **On startup** - Always runs when indexer starts
  - ✅ **Every 1 hour** - Periodic sync to ensure data stays in sync
  - ✅ **5 minutes after startup** - First periodic sync
- **What it syncs**:
  - All universities
  - All issuers (for each university)
  - All revokers (for each university)
  - All verifiers (for each university)
  - All degrees (for each university)
  - All requests (degree requests and revocation requests)

### 3. **Event Projector** (CQRS Pattern)
- **Location**: `lib/services/indexer/EventProjector.ts`
- **Runs every 5 seconds** to process unprocessed events
- **What it does**:
  - Reads events from `chain_events` table
  - Applies projections to materialized tables (universities, degrees, etc.)
  - Ensures data consistency

### 4. **Finalization Processor**
- **Runs every 10 seconds**
- **What it does**:
  - Marks events as finalized after confirmation depth (10 blocks)
  - Updates sync status

## Database Tables

### Event Store (Immutable)
- **`chain_events`** - Stores all blockchain events (append-only log)

### Materialized Views (Queryable)
- **`universities`** - Synced from blockchain
- **`issuers`** - Synced from blockchain
- **`revokers`** - Synced from blockchain
- **`verifiers`** - Synced from blockchain
- **`degrees`** - Synced from blockchain
- **`degree_requests`** - Synced from events
- **`revocation_requests`** - Synced from events

### Status Tracking
- **`sync_status`** - Tracks last synced block, finalized block, sync mode

## Verification

### Check if Indexer is Running

```bash
# Check indexer status
node scripts/check-indexer-status.js
```

Or call the API:
```bash
curl http://localhost:3000/api/sync/status
```

### Check Database Data

```sql
-- Check sync status
SELECT * FROM sync_status WHERE id = 1;

-- Check events
SELECT COUNT(*) FROM chain_events;
SELECT * FROM chain_events ORDER BY block_number DESC LIMIT 10;

-- Check materialized data
SELECT COUNT(*) FROM universities WHERE blockchain_verified = true;
SELECT COUNT(*) FROM issuers WHERE blockchain_verified = true;
SELECT COUNT(*) FROM degrees;
```

## Manual Triggers

### Trigger Full Sync Manually

**Option 1: Via API**
```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"action": "comprehensive_full_sync"}'
```

**Option 2: Via Script**
```bash
node scripts/trigger-full-sync.js
```

**Option 3: Via Admin Dashboard**
- Go to `/admin/sync`
- Click "Trigger Full Sync"

## Troubleshooting

### Indexer Not Running

1. **Check if server is running**:
   ```bash
   npm run dev
   ```

2. **Check logs** for indexer startup messages:
   ```
   [IndexerService] Starting blockchain indexer...
   [IndexerService] ✅ Indexer started in polling mode
   ```

3. **Restart indexer manually**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/indexer/start \
     -H "Content-Type: application/json" \
     -d '{"action": "restart"}'
   ```

### No Data in Database

1. **Check if comprehensive sync ran**:
   - Look for logs: `[IndexerService] 🔄 Starting comprehensive blockchain data sync...`
   - Check `sync_status.last_full_sync_at`

2. **Trigger manual sync**:
   ```bash
   node scripts/trigger-full-sync.js
   ```

3. **Check contract address**:
   - Verify `NEXT_PUBLIC_CORE_CONTRACT_ADDRESS` in `.env.local`
   - Should match your deployed contract

### No Events Being Stored

1. **Check if contract has emitted events**:
   - Verify on BaseScan: `https://basescan.org/address/YOUR_CONTRACT_ADDRESS#events`

2. **Check polling logs**:
   - Look for: `[IndexerService] Polling: Found X events...`

3. **Check block range**:
   - Indexer looks back up to 100k blocks on first run
   - If events are older, they may not be caught

## Configuration

### Environment Variables

```env
# Contract address
NEXT_PUBLIC_CORE_CONTRACT_ADDRESS=0xBb51Dc84f0b35d3344f777543CA6549F9427B313

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# RPC (optional - defaults to Base mainnet)
BASE_RPC_HTTP_URL=https://mainnet.base.org
BASE_RPC_WS_URL=wss://mainnet.base.org  # Not used (Base doesn't support WS)
```

### Polling Configuration

- **Polling interval**: 30 seconds (defined in `IndexerService.ts`)
- **Lookback window**: 
  - First run: 100,000 blocks
  - Subsequent runs: 10,000 blocks
- **Confirmation depth**: 10 blocks

## Architecture Benefits

✅ **Event Sourcing**: All events stored immutably in `chain_events`  
✅ **CQRS**: Events separated from materialized views  
✅ **Real-time**: Polls every 30 seconds for new events  
✅ **Automatic**: Runs on startup, no manual intervention needed  
✅ **Resilient**: Periodic comprehensive sync ensures data consistency  
✅ **Idempotent**: Can safely re-run syncs without duplicates  

## Next Steps

1. ✅ **Indexer starts automatically** when server starts
2. ✅ **Comprehensive sync runs on startup** to populate all data
3. ✅ **Real-time polling** catches new events every 30 seconds
4. ✅ **Periodic sync** runs every hour to ensure consistency

**No manual action required!** The system is fully automated. 🎉
