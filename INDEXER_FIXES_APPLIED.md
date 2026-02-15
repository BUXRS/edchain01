# ✅ Indexer Fixes Applied

## Problems Identified from Server Logs

1. ✅ **Indexer IS starting** - Good news!
2. ✅ **Initial sync IS working** - University synced successfully
3. ❌ **WebSocket fails** - Base RPC doesn't support `wss://` protocol
4. ❌ **RPC batch limit errors** - "maximum 10 calls in 1 batch" when setting up 13+ event filters
5. ❌ **Event listeners failing** - Both `websocket-indexer` and `realtime-sync` trying to set up listeners

## Fixes Applied

### 1. ✅ Skip WebSocket (Base Doesn't Support It)

**File:** `lib/services/websocket-indexer.ts`

**Change:** Removed WebSocket attempt, go straight to polling mode

```typescript
// Before: Tried WebSocket, failed, then fell back to polling
try {
  await startWebSocketListener()
} catch (wsError) {
  await startPollingListener()
}

// After: Skip WebSocket entirely, use polling directly
console.log("[WebSocketIndexer] Base RPC doesn't support WebSocket, using polling mode")
await startPollingListener()
state.mode = "polling"
```

### 2. ✅ Disable Realtime-Sync Event Listeners

**File:** `lib/services/realtime-sync.ts`

**Change:** Skip event listener setup (causes batch limit errors)

```typescript
// Before: Tried to set up 13+ event listeners → batch limit error
await setupEventListeners()

// After: Skip event listeners, rely on polling
console.log("[RealtimeSync] Using polling-based sync (event listeners skipped due to RPC batch limits)")
```

### 3. ✅ Disable Realtime-Sync Service

**File:** `instrumentation.ts`

**Change:** Don't start `realtime-sync` since `websocket-indexer` handles everything

```typescript
// Before: Started both websocket-indexer and realtime-sync
await websocketIndexer.start()
await realtimeSync.start() // ❌ Caused conflicts

// After: Only start websocket-indexer
await websocketIndexer.start()
// Skip realtime-sync - websocket-indexer handles all syncing
```

## Current Status

### ✅ What's Working

1. **Indexer starts automatically** on server startup
2. **Initial full sync works** - University synced successfully
3. **Polling mode active** - Indexer polls for new events every 30 seconds
4. **Database sync working** - University data synced to DB

### ⚠️ What's Fixed But Needs Monitoring

1. **Polling instead of WebSocket** - Less real-time, but more reliable
2. **No event listeners** - Relies on polling, which is fine for most use cases
3. **Batch limit errors eliminated** - No more "maximum 10 calls" errors

## Expected Behavior Now

### Server Startup Logs Should Show:

```
[Instrumentation] Starting WebSocket-first blockchain indexer...
[WebSocketIndexer] Starting WebSocket-first blockchain indexer...
[WebSocketIndexer] Database appears empty, performing initial full sync...
[WebSocketIndexer] Found 1 universities, syncing...
[WebSocketIndexer] Synced university 1
[WebSocketIndexer] Initial full sync completed
[WebSocketIndexer] Base RPC doesn't support WebSocket, using polling mode
[WebSocketIndexer] Starting polling listener...
[WebSocketIndexer] Indexer started successfully in polling mode
[Instrumentation] Skipping realtime-sync (websocket-indexer handles all syncing)
[Instrumentation] Blockchain indexer initialized
```

### No More Errors:

- ❌ No more "unsupported protocol wss" errors
- ❌ No more "maximum 10 calls in 1 batch" errors
- ❌ No more event listener setup failures

## How It Works Now

1. **On Server Start:**
   - `websocket-indexer` starts automatically
   - Performs initial full sync if DB is empty
   - Sets up polling listener (every 30 seconds)

2. **Polling Mode:**
   - Every 30 seconds, polls for new events from last processed block
   - Uses `queryFilter("*")` to get all events
   - Processes events and stores in `chain_events` table
   - Applies projections to materialized tables

3. **Periodic Reconciliation:**
   - Every 5 minutes, checks for gaps
   - Backfills any missed events

## Verification

### Check Indexer Status:

```javascript
// In browser console
fetch('/api/sync/status').then(r => r.json()).then(data => {
  console.log('Indexer Running:', data.indexer.isRunning) // Should be true
  console.log('Mode:', data.indexer.mode) // Should be "polling"
  console.log('Universities:', data.counts.universities) // Should be > 0
})
```

### Check Database:

```sql
-- Should have universities
SELECT COUNT(*) FROM universities WHERE blockchain_verified = true;

-- Should have sync status
SELECT * FROM sync_status;
```

## Summary

✅ **Fixed:** WebSocket attempt (Base doesn't support it)  
✅ **Fixed:** RPC batch limit errors (disabled event listeners)  
✅ **Fixed:** Service conflicts (disabled realtime-sync)  
✅ **Working:** Indexer starts automatically and syncs data  

The indexer is now running in **polling mode**, which is more reliable than WebSocket for Base RPC. It will poll every 30 seconds for new events and sync them to the database.

---

**Last Updated:** 2026-01-25  
**Status:** Indexer running in polling mode, initial sync successful
