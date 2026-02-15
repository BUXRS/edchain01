# 🔍 Diagnosing Empty Database Issue

## Problem

**Logs show:**
- ✅ Indexer started successfully
- ✅ "Synced university 1" message appears
- ✅ No errors in logs

**But API status shows:**
- ❌ `isRunning: false`
- ❌ `counts.universities: 0`
- ❌ `counts.degrees: 0`

## Possible Causes

### 1. Database Transaction Not Committing

The sync might be running but the INSERT/UPDATE isn't being committed to the database.

**Check:**
```sql
-- Check if there are any universities (even without blockchain_verified flag)
SELECT * FROM universities;

-- Check if there are any recent inserts
SELECT * FROM universities ORDER BY created_at DESC LIMIT 5;
```

### 2. Silent Database Errors

The sync might be catching errors but not logging them properly.

**Check server logs for:**
- `[BlockchainSync] ❌ Error syncing university`
- Database connection errors
- SQL constraint violations

### 3. State Reset (Hot Module Reload)

Next.js hot module reload might be resetting the `state.isRunning` flag.

**Solution:** The state is module-scoped, so hot reloads will reset it. This is expected in dev mode.

### 4. Database Connection Issue

The database connection might be failing silently.

**Check:**
```sql
-- Test connection
SELECT NOW();

-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'universities';
```

## Enhanced Logging Added

I've added detailed logging to help diagnose:

1. **Before INSERT/UPDATE:**
   ```
   [BlockchainSync] Inserting university 1 into database...
   ```

2. **After successful INSERT/UPDATE:**
   ```
   [BlockchainSync] ✅ Successfully inserted university 1
   ```

3. **On errors:**
   ```
   [BlockchainSync] ❌ Error syncing university 1: [error details]
   [BlockchainSync] Error stack: [stack trace]
   ```

4. **Sync result summary:**
   ```
   [WebSocketIndexer] University 1 sync result: {success: true, added: 1, updated: 0, errors: []}
   ```

## Next Steps

### Step 1: Restart Server and Check Logs

After restart, look for:
- `[BlockchainSync] Inserting university 1 into database...`
- `[BlockchainSync] ✅ Successfully inserted university 1`
- OR `[BlockchainSync] ❌ Error syncing university 1`

### Step 2: Check Database Directly

```sql
-- Check all universities (not just blockchain_verified)
SELECT id, blockchain_id, name, name_en, blockchain_verified, created_at 
FROM universities 
ORDER BY created_at DESC;

-- Check if sync_status table has data
SELECT * FROM sync_status;
```

### Step 3: Check for Database Errors

Look in server logs for:
- PostgreSQL connection errors
- SQL syntax errors
- Constraint violations
- Transaction rollback messages

### Step 4: Verify Database Connection

```javascript
// In browser console
fetch('/api/sync/debug').then(r => r.json()).then(data => {
  console.log('Database Connection:', data.checks.databaseConnection)
  console.log('Universities in DB:', data.checks.databaseUniversities)
})
```

## Expected Behavior After Fix

**Server logs should show:**
```
[BlockchainSync] Fetching university 1 from blockchain...
[BlockchainSync] University 1 found: USA University
[BlockchainSync] Inserting university 1 into database...
[BlockchainSync] ✅ Successfully inserted university 1
[WebSocketIndexer] University 1 sync result: {success: true, added: 1, updated: 0, errors: []}
[WebSocketIndexer] ✅ Successfully synced university 1
```

**API status should show:**
```json
{
  "indexer": {
    "isRunning": true,
    "mode": "polling"
  },
  "counts": {
    "universities": 1,
    "degrees": 0
  }
}
```

## Common Issues and Solutions

### Issue: Database Connection Fails

**Solution:** Check `DATABASE_URL` in `.env` file

### Issue: Table Doesn't Exist

**Solution:** Run database migrations:
```bash
psql -U postgres -d bubd -f scripts/000-recreate-complete-database.sql
```

### Issue: Constraint Violation

**Solution:** Check for duplicate `blockchain_id` or missing required fields

### Issue: Transaction Not Committing

**Solution:** Check if `sql` helper is properly committing transactions

---

**Last Updated:** 2026-01-25
**Status:** Enhanced logging added, waiting for restart to see detailed logs
