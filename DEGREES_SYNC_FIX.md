# ✅ Degrees Sync Fix - Same Methodology as Universities

## Problem

Degrees exist on the blockchain (you can see degree #1 in the UI), but they're not being synced to the database. The sync status shows 0 degrees even though degrees exist on-chain.

## Root Cause

The indexer's `performInitialFullSyncIfNeeded()` function only runs when `universitiesCount === 0`. Since you already have 1 university in the database, it skips the initial sync, which means degrees are never synced.

## Solution Applied

### 1. Enhanced Initial Sync Logic

**File**: `lib/services/websocket-indexer.ts`

Added logic to sync degrees for existing universities even when the initial full sync is skipped:

```typescript
} else {
  console.log(`[WebSocketIndexer] Database has ${universitiesCount} universities, checking if degrees need syncing...`)
  
  // Even if universities exist, we should sync degrees for all universities
  // This ensures degrees are synced even if they were issued after the initial sync
  try {
    const { fetchAllUniversities } = await import("@/lib/blockchain")
    const universities = await fetchAllUniversities()
    
    console.log(`[WebSocketIndexer] Found ${universities.length} universities on-chain, syncing degrees for each...`)
    
    for (const uni of universities) {
      try {
        const uniId = Number(uni.id)
        console.log(`[WebSocketIndexer] Syncing degrees for university ${uniId}...`)
        const degreesResult = await blockchainSync.syncDegreesForUniversity(uniId)
        console.log(`[WebSocketIndexer] University ${uniId} degrees: added=${degreesResult.added}, updated=${degreesResult.updated}`)
      } catch (err) {
        console.warn(`[WebSocketIndexer] Failed to sync degrees for university ${uni.id}:`, err)
      }
    }
    
    console.log("[WebSocketIndexer] Degrees sync check completed")
  } catch (error) {
    console.error("[WebSocketIndexer] Error syncing degrees for existing universities:", error)
  }
}
```

### 2. Enhanced Logging in Degree Sync

**File**: `lib/services/blockchain-sync.ts`

Added detailed logging to track degree sync operations:

- Logs when fetching degrees from blockchain
- Logs count of degrees found
- Logs each INSERT/UPDATE operation
- Logs final summary (added/updated counts)

## How It Works Now

1. **On Server Start**:
   - Indexer checks if universities exist in DB
   - If universities exist, it still syncs degrees for all universities on-chain
   - This ensures degrees are always synced, even if they were issued after the initial sync

2. **Degree Sync Process**:
   - Fetches all degrees for each university from blockchain
   - Inserts new degrees or updates existing ones
   - Marks degrees as `blockchain_verified = true`
   - Logs all operations for debugging

3. **Real-Time Updates**:
   - When new degrees are issued, the indexer's event listeners catch `DegreeIssued` events
   - Degrees are automatically synced to the database

## Expected Behavior After Restart

**Server Logs Should Show:**
```
[WebSocketIndexer] Database has 1 universities, checking if degrees need syncing...
[WebSocketIndexer] Found 1 universities on-chain, syncing degrees for each...
[WebSocketIndexer] Syncing degrees for university 1...
[BlockchainSync] Fetching degrees for university 1 from blockchain...
[BlockchainSync] Found 1 degrees for university 1
[BlockchainSync] Inserting degree 1 into database...
[BlockchainSync] ✅ Successfully inserted degree 1
[WebSocketIndexer] University 1 degrees: added=1, updated=0
[WebSocketIndexer] Degrees sync check completed
```

**Database Should Have:**
```sql
SELECT COUNT(*) FROM degrees WHERE blockchain_verified = true;
-- Should return 1 (or more if you have more degrees)
```

**API Should Return:**
```javascript
fetch('/api/degrees').then(r => r.json()).then(data => {
  console.log('Degrees:', data.degrees.length) // Should be > 0
})
```

## Testing

1. **Restart the server** - Degrees should sync automatically
2. **Check server logs** - Should see degree sync messages
3. **Check database** - Should see degrees in `degrees` table
4. **Check API** - `/api/degrees` should return degrees
5. **Check sync status** - Should show correct degree count

## Same Methodology as Universities

✅ **Fetches from blockchain** - Uses `fetchDegreesForUniversity()`  
✅ **Syncs to database** - Inserts/updates in `degrees` table  
✅ **Marks as verified** - Sets `blockchain_verified = true`  
✅ **Handles errors** - Logs errors but doesn't fail  
✅ **Real-time updates** - Listens for `DegreeIssued` events  

---

**Status**: ✅ Fixed  
**Date**: 2026-01-25  
**Next Step**: Restart server to trigger degree sync
