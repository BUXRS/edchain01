# University Deletion Fix - Root Cause & Solution

## Root Cause Identified

The `UniversityDeleted` event was being **ingested** into the `chain_events` table by the indexer, but was **NOT being projected** to the `universities` table because:

1. **Missing Event Handler**: The `EventProjector.projectEvent()` method's switch statement did not include a case for `UniversityDeleted`
2. **Missing Database Columns**: The `universities` table lacked deletion provenance columns (`is_deleted`, `deleted_at_chain`, `deleted_block_number`, `deleted_tx_hash`, `deleted_log_index`)

## Solution Implemented

### 1. Database Migration (`scripts/026-add-university-deletion-fields.sql`)
Added soft-delete columns to `universities` table:
- `is_deleted` (BOOLEAN) - Marks university as deleted
- `deleted_at_chain` (TIMESTAMP) - Block timestamp when deletion occurred
- `deleted_block_number` (BIGINT) - Block number of deletion event
- `deleted_tx_hash` (VARCHAR) - Transaction hash
- `deleted_log_index` (INTEGER) - Log index of the event

**Important**: Universities are **soft-deleted** (not hard-deleted) to maintain audit trail.

### 2. Event Projector Handler (`lib/services/indexer/EventProjector.ts`)
- Added `UniversityDeleted` case to the switch statement
- Implemented `projectUniversityDeleted()` method that:
  - Extracts `universityId` from event data
  - Updates university with `is_deleted = true`, `is_active = false`
  - Stores deletion provenance (block, tx, timestamp, log index)
  - Includes proper error handling and logging

### 3. Enhanced Logging (`lib/services/indexer/IndexerService.ts`)
- Added critical event logging for `UniversityDeleted` events
- Enhanced polling logs to show event breakdown by type
- Alerts when `UniversityDeleted` events are detected during polling

## How It Works

1. **Event Ingestion**: Indexer listens to all Core contract events via polling (Base RPC doesn't support WebSocket)
2. **Event Storage**: `UniversityDeleted` events are stored in `chain_events` table (idempotent)
3. **Event Projection**: Projector processes unprocessed events every 5 seconds
4. **Soft Delete**: When `UniversityDeleted` is processed:
   - University row is updated (not deleted)
   - `is_deleted = true`, `is_active = false`
   - Deletion provenance is stored
5. **Backfill Safety**: If indexer restarts, backfill from `lastProcessedBlock` ensures no events are missed

## Testing

To verify the fix works:

1. **Run Migration**:
   ```sql
   \i scripts/026-add-university-deletion-fields.sql
   ```

2. **Check for Unprocessed Events**:
   ```sql
   SELECT * FROM chain_events 
   WHERE event_name = 'UniversityDeleted' 
   AND projection_applied = false
   ORDER BY block_number ASC;
   ```

3. **Trigger Projection** (if events exist):
   - The projector runs automatically every 5 seconds
   - Or manually trigger via API: `POST /api/admin/sync/reindex`

4. **Verify Deletion**:
   ```sql
   SELECT id, blockchain_id, name, is_deleted, is_active, 
          deleted_block_number, deleted_tx_hash, deleted_at_chain
   FROM universities 
   WHERE is_deleted = true;
   ```

## Architecture Compliance

✅ **Blockchain is source of truth**: Deletion state comes from on-chain event  
✅ **DB is derived projection**: Universities table mirrors blockchain state  
✅ **Soft delete**: Rows not removed, maintains audit trail  
✅ **Idempotent**: Safe to reprocess events  
✅ **Backfill-safe**: Missed events caught on restart  
✅ **Reorg-safe**: Reorg handling will replay events correctly  

## Next Steps

1. Run the migration script on production database
2. Monitor logs for `UniversityDeleted` events being processed
3. Verify that future deletions are reflected in DB within sync latency (30s polling interval)
4. Consider adding a test script that:
   - Creates a test university on-chain
   - Deletes it on-chain
   - Waits for indexer to process
   - Asserts DB state matches on-chain state
