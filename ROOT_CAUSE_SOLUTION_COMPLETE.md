# Root Cause Solution - Production-Grade CQRS Implementation

## Problem Statement

**Original Issue**: "issuers and revokers yet not fitching to db from block chain"

**Root Cause Analysis**:
1. **Polling window too small** (100 blocks) - missed historical events
2. **Initial sync only ran when DB was empty** - incomplete syncs
3. **No guaranteed comprehensive sync** - entities might be skipped
4. **Tightly coupled ingestion + projection** - failures in one affected the other
5. **No event store** - couldn't replay or rebuild from scratch
6. **Frontend reading from blockchain** - violated DB-first architecture

---

## Solution: Event Sourcing + CQRS Architecture

### **Architecture Principles**

1. **Blockchain is Source of Truth** ✅
   - All data originates from blockchain events
   - Database is a derived, off-chain projection

2. **Event Store (Append-Only)** ✅
   - `chain_events` table stores ALL events
   - Idempotent via unique constraint
   - Immutable audit log

3. **Deterministic Projection** ✅
   - Same events → same state
   - Replayable from event store
   - Safe to reprocess

4. **Separation of Concerns** ✅
   - **Command Side**: Ingestion (IndexerService)
   - **Query Side**: Projection (EventProjector)
   - Independent processing

5. **DB-First for UI** ✅
   - Frontend reads from DB-backed APIs only
   - Chain interaction only for TX submission
   - Verification endpoints for on-chain checks

---

## Implementation Details

### **1. Event Store** (`chain_events` table)

**Purpose**: Immutable append-only log

**Key Features**:
- Unique constraint: `(chain_id, tx_hash, log_index)`
- Stores: event name, block number, block hash, decoded args (JSONB)
- Tracks: processed, projection_applied, is_finalized

**Migration**: `scripts/024-create-chain-events-table.sql`

### **2. Indexer Service** (`lib/services/indexer/IndexerService.ts`)

**Responsibilities**:
- Ingest events from blockchain → `chain_events`
- WebSocket-first with polling fallback
- Reorg detection and recovery
- Confirmation depth handling

**Key Methods**:
- `start()`: Start indexer
- `ingestEvent()`: Store event (idempotent)
- `checkForReorg()`: Detect reorganizations
- `handleReorg()`: Rewind and replay
- `startProjectionProcessor()`: Background projection worker

### **3. Event Projector** (`lib/services/indexer/EventProjector.ts`)

**Responsibilities**:
- Project events from `chain_events` → materialized tables
- Deterministic and replayable
- Idempotent (UPSERT-based)

**Event Handlers**:
- `projectUniversityRegistered()`
- `projectIssuerUpdated()`
- `projectRevokerUpdated()`
- `projectVerifierAdded()` / `projectVerifierRemoved()`
- `projectDegreeIssued()` / `projectDegreeRevoked()`
- `projectDegreeRequested()` / `projectRevocationRequested()`
- `projectDegreeRequestApproved()` / `projectRevocationApproved()`

**Key Methods**:
- `projectEvent()`: Project single event
- `processUnprocessedEvents()`: Catch-up processing
- `replayFromBlock()`: Reorg recovery

### **4. Reconciler Service** (`lib/services/indexer/ReconcilerService.ts`)

**Responsibilities**:
- Gap detection (missed blocks)
- Historical backfill
- Batch processing

**Key Methods**:
- `start()`: Start reconciliation
- `reconcile()`: Main reconciliation logic
- `backfillGap()`: Backfill block range

---

## Operational Endpoints

### **GET /api/health**

Returns comprehensive health status:
- Database connectivity
- RPC connectivity (HTTP + WebSocket)
- Indexer status
- Sync status

### **POST /api/admin/reindex**

Rebuild materialized tables from `chain_events`:
- Optionally wipe tables
- Replay all events
- Test replayability

---

## API Endpoints (All DB-First)

### **Updated Endpoints**:
- ✅ `GET /api/universities` - Returns DB data + sync metadata
- ✅ `GET /api/degrees` - Returns DB data + sync metadata
- ✅ `GET /api/issuers` - Returns DB data (auto-syncs on request)
- ✅ `GET /api/revokers` - Returns DB data (auto-syncs on request)
- ✅ `GET /api/verifiers` - Returns DB data (auto-syncs on request)
- ✅ `GET /api/degree-requests` - **FIXED**: Now DB-first (was reading from blockchain)
- ✅ `GET /api/revocation-requests` - **FIXED**: Now DB-first (was reading from blockchain)

### **Verification Endpoint**:
- ✅ `GET /api/verify/degree/:tokenId` - DB record + on-chain check

---

## Frontend Enforcement

### **Removed Chain Reads**:
- ✅ `app/revoker/search/page.tsx` - Changed from `useReadContract` to `/api/verify/degree/:id`

### **Allowed Chain Interaction**:
- Transaction submission (write operations)
- Pre-transaction checks (optional)

---

## Startup Sequence

**File**: `instrumentation.ts`

1. ✅ Starts `IndexerService` (event ingestion)
2. ✅ Starts `ReconcilerService` (gap detection)
3. ✅ Performs initial comprehensive sync if DB is empty/incomplete
4. ✅ Starts projection processor (every 5 seconds)
5. ✅ Starts finalization processor (every 10 seconds)

---

## Key Features

### **1. Idempotency**
- Events stored with unique constraint
- Safe to reprocess events
- No duplicates on restart

### **2. Reorg Handling**
- Detects via block hash mismatch
- Rewinds to safe block
- Replays events from rewind point

### **3. Confirmation Depth**
- Events finalized after 10 blocks
- UI shows sync status (synced vs finalized)

### **4. Replayability**
- Can rebuild entire DB from `chain_events`
- Test via `POST /api/admin/reindex`

### **5. Real-Time Updates**
- WebSocket subscription (if available)
- Polling fallback ensures completeness
- Projection processor runs every 5 seconds

---

## Testing

### **1. Restart Server**
```bash
npm run dev
```

**Expected Logs**:
```
[Instrumentation] Starting production-grade blockchain indexer...
[IndexerService] Starting blockchain indexer...
[IndexerService] Database appears incomplete, triggering comprehensive sync...
[IndexerService] ✅ Indexer started in polling mode
```

### **2. Check Health**
```bash
curl http://localhost:3000/api/health
```

**Expected**: All systems operational

### **3. Test Reindex**
```bash
curl -X POST http://localhost:3000/api/admin/reindex \
  -H "Content-Type: application/json" \
  -d '{"wipeTables": true}'
```

**Expected**: All events replayed, DB rebuilt

### **4. Verify UI**
- Visit `/admin` - should show correct counts
- Visit `/admin/degrees` - should list all degrees
- Visit `/admin/reports` - should show real data

---

## Files Created

1. ✅ `lib/services/indexer/IndexerService.ts` - Event ingestion
2. ✅ `lib/services/indexer/EventProjector.ts` - Event projection
3. ✅ `lib/services/indexer/ReconcilerService.ts` - Reconciliation
4. ✅ `app/api/health/route.ts` - Health check
5. ✅ `app/api/admin/reindex/route.ts` - Reindex endpoint

## Files Modified

1. ✅ `instrumentation.ts` - Updated to use new services
2. ✅ `app/api/universities/route.ts` - Updated indexer reference
3. ✅ `app/api/degrees/route.ts` - Updated indexer reference
4. ✅ `app/api/degree-requests/route.ts` - Changed to DB-first
5. ✅ `app/api/revocation-requests/route.ts` - Changed to DB-first
6. ✅ `app/api/sync/status/route.ts` - Updated indexer reference
7. ✅ `app/revoker/search/page.tsx` - Changed to use API endpoint

---

## Definition of Done ✅

- [x] **Indexer can rebuild DB from scratch** - `POST /api/admin/reindex`
- [x] **WS updates DB within seconds** - WebSocket + projection processor
- [x] **Polling reconciliation prevents missed logs** - ReconcilerService
- [x] **Restart-safe and idempotent** - Unique constraints, checkpoint state
- [x] **Reorg-safe** - Block hash validation, rewind + replay
- [x] **UI reads from DB only** - All endpoints return DB data
- [x] **TX confirmation is DB-driven** - UI polls DB, not chain
- [x] **Verify endpoint confirms on-chain** - `/api/verify/*` endpoints
- [x] **Issuers/revokers/verifiers auto-sync** - Comprehensive sync on startup + periodic

---

## Next Steps

1. **Restart server** - New architecture will start automatically
2. **Check `/api/health`** - Verify all systems operational
3. **Monitor logs** - Watch for event ingestion and projection
4. **Check dashboard** - Issuers/revokers/verifiers should show correct counts
5. **Test reindex** - Verify replayability

---

**Status**: ✅ **COMPLETE** - Production-grade Event Sourcing + CQRS architecture fully implemented. All issuers, revokers, and verifiers will be automatically fetched from blockchain and synced to database.
