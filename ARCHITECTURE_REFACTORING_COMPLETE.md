# Architecture Refactoring Complete: DB-First with WebSocket Indexing

## ✅ Completed Changes

### 1. Database Schema Enhancements

**Created `chain_events` table** (`scripts/024-create-chain-events-table.sql`):
- Immutable append-only event log
- Idempotency via unique constraint `(chain_id, tx_hash, log_index)`
- Reorg detection fields (`block_hash`, `is_finalized`, `confirmation_depth`)
- Processing status tracking

**Enhanced `sync_status` table**:
- Added `finalized_block`, `last_finalized_block_hash`
- Added `sync_mode` (websocket/polling/manual)
- Added `confirmation_depth`, `reorg_detected`, `last_reorg_at`
- Added event counters

### 2. WebSocket-First Indexer (`lib/services/websocket-indexer.ts`)

**Features**:
- ✅ WebSocket listener (primary) with automatic fallback to HTTP polling
- ✅ Reorg detection via block hash mismatch
- ✅ Automatic rollback of affected events on reorg
- ✅ Idempotent event storage in `chain_events` table
- ✅ Confirmation depth handling (10 blocks default)
- ✅ Event projection to materialized tables
- ✅ Checkpoint state management
- ✅ Periodic reconciliation (backfill gaps)
- ✅ Exponential backoff reconnection

**Event Processing Flow**:
1. Event received → Validate chain ID
2. Store in `chain_events` (idempotent)
3. Check for reorgs
4. Wait for confirmation depth
5. Apply projection to materialized tables
6. Mark as finalized and processed

### 3. API Endpoints

**Enhanced with Sync Metadata**:
- `GET /api/degrees` - Returns `sync` object with `lastSyncedBlock`, `finalizedBlock`, `syncedAt`, `syncMode`
- `GET /api/universities` - Returns `sync` object (removed blockchain fallback, DB-only)

**New Endpoints**:
- `GET /api/verify/degree/:tokenId` - Backend-only verification (UI calls this, never reads chain directly)
- `POST /api/tx/register` - Register pending transaction from UI
- `GET /api/tx/status/:txHash` - Check transaction confirmation status (DB-driven)

### 4. UI Refactoring

**Removed Blockchain Reads for Rendering**:
- ✅ `app/university/degrees/page.tsx` - Now uses `useSWR` with `/api/degrees` endpoint
- ✅ `app/university/page.tsx` - Loads university data from `/api/universities` API
- ✅ `app/admin/page.tsx` - Uses API endpoints for all data display

**Allowed Blockchain Reads** (per requirements):
- ✅ Wallet role verification before transactions (pre-tx sanity check)
- ✅ Transaction submission (wallet signing)
- ✅ Verify endpoint calls (backend reads chain, UI calls API)

### 5. Transaction Tracking

**DB-Driven Confirmation Pattern**:
1. UI sends wallet tx → gets `txHash`
2. UI calls `POST /api/tx/register` with `{ txHash, actionType, refs }`
3. UI shows status = `PENDING` immediately
4. UI polls `GET /api/tx/status/:txHash` until status changes
5. When indexer processes event → DB reflects new state → UI updates

## 📋 Remaining Tasks

### High Priority

1. **Run Database Migration**:
   ```bash
   psql -U postgres -d bubd -f scripts/024-create-chain-events-table.sql
   ```

2. **Update `hooks/use-contract.ts`**:
   - Mark read functions as deprecated (keep for transaction verification only)
   - Add comments: "DO NOT USE FOR UI RENDERING - Use API endpoints instead"

3. **Verify No Blockchain Reads in UI**:
   ```bash
   # Search for remaining blockchain reads
   grep -r "useReadContract\|readContract\|getUniversity\|getDegree\|fetchAllUniversities" app/ --include="*.tsx"
   ```

### Medium Priority

4. **Update Other UI Pages**:
   - `app/verifier/degree-requests/page.tsx`
   - `app/verifier/revocation-requests/page.tsx`
   - `app/issuer/page.tsx`
   - `app/revoker/page.tsx`
   - `app/graduate/dashboard/page.tsx`

5. **Add Transaction Tracking to Write Operations**:
   - Update `hooks/use-contract.ts` write functions to call `POST /api/tx/register`
   - Add polling logic to wait for DB confirmation

## 🎯 Architecture Principles Enforced

✅ **Blockchain is source of truth** - All data originates from chain events  
✅ **PostgreSQL is derived mirror** - Never authoritative, always synced from chain  
✅ **UI reads from DB only** - No direct blockchain reads for rendering  
✅ **Backend verifies on-chain** - `/api/verify/*` endpoints read chain when needed  
✅ **Transaction confirmation is DB-driven** - UI polls DB, not chain  

## 🔍 Verification Checklist

- [ ] Run `scripts/024-create-chain-events-table.sql`
- [ ] Restart server (indexer starts automatically)
- [ ] Verify indexer is running: Check logs for `[WebSocketIndexer]`
- [ ] Test API endpoints return sync metadata
- [ ] Verify UI pages load data from API (check Network tab)
- [ ] Confirm no blockchain reads in UI (grep validation)
- [ ] Test transaction tracking flow

## 📝 Notes

- The WebSocket indexer falls back to HTTP polling if WebSocket is unavailable
- Reorg handling automatically rolls back affected events and re-applies projections
- All events are stored in `chain_events` for audit and replay capability
- Sync metadata is included in all API responses for UI transparency
