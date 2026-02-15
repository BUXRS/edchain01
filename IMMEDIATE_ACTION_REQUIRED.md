# 🚨 IMMEDIATE ACTION REQUIRED

## Critical Issues Fixed - Now You Need To:

### 1. ✅ Contract Address - FIXED
- App now uses new contract: `0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`
- All blockchain reads use V2 contract

### 2. ✅ Real-Time Sync - IMPLEMENTED
- Real-time sync service created
- Auto-starts on server startup
- WebSocket + polling for reliability

---

## 🔴 REQUIRED: Run Database Migration

**You MUST run this SQL in pgAdmin:**

```sql
-- Run this in pgAdmin Query Tool (connected to bubd database)
-- Copy and paste the entire content of scripts/004-add-sync-status.sql
```

Or manually create the table:
```sql
CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_synced_block BIGINT DEFAULT 0,
  last_full_sync_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO sync_status (id, last_synced_block, last_full_sync_at)
VALUES (1, 0, NOW())
ON CONFLICT (id) DO NOTHING;
```

---

## 🔴 REQUIRED: Trigger Initial Sync

**After running migration, trigger sync:**

### Option 1: Via Browser/API
Open: `http://localhost:3000/api/sync/start`

Or use curl:
```bash
curl -X POST http://localhost:3000/api/sync/start \
  -H "Content-Type: application/json" \
  -d '{"action": "full_sync"}'
```

### Option 2: Restart App
- Stop the app (Ctrl+C)
- Run `npm run dev` again
- Real-time sync will start automatically
- Check server console for sync logs

---

## ✅ Verification Steps

1. **Check Server Logs:**
   ```
   [RealtimeSync] Starting real-time blockchain sync...
   [RealtimeSync] Performing full sync...
   [RealtimeSync] Synced X universities
   ```

2. **Check Database:**
   ```sql
   -- Should show universities from new contract
   SELECT * FROM universities WHERE blockchain_verified = true;
   
   -- Should show degrees from new contract
   SELECT * FROM degrees WHERE blockchain_verified = true;
   ```

3. **Check UI:**
   - Admin dashboard should show universities from new contract
   - Data should match what's on BaseScan for new contract

---

## 🎯 What's Fixed

✅ **Contract Address**: All reads use new V2 contract  
✅ **Real-Time Sync**: WebSocket + polling implemented  
✅ **Auto-Sync**: Starts on server startup  
✅ **Database Sync**: Universities and degrees sync to DB  
✅ **Event Listeners**: Real-time updates on blockchain events  

---

## ⚠️ If Sync Doesn't Work

1. **Check Database Connection:**
   ```sql
   SELECT NOW(); -- Should return current timestamp
   ```

2. **Check Contract Address:**
   - Verify `.env.local` has: `NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2=0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`

3. **Check Server Logs:**
   - Look for errors in console
   - Check for RPC connection issues

4. **Manual Sync:**
   - Use API endpoint: `POST /api/sync/start` with `{"action": "full_sync"}`

---

**Run the migration and trigger sync NOW to populate your database!** 🚀
