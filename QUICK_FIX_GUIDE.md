# 🚨 QUICK FIX GUIDE - Immediate Actions

## Problem Summary
1. ❌ App using old contract address → **FIXED** ✅
2. ❌ Database empty → **NEEDS SYNC** ⚠️
3. ❌ No real-time sync → **IMPLEMENTED** ✅

---

## ✅ STEP 1: Run Database Migrations

**In pgAdmin, run these SQL scripts (in order):**

### 1. Add blockchain_id column (if missing)
```sql
-- Copy from scripts/005-add-blockchain-id.sql
ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_id BIGINT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_universities_blockchain_id ON universities(blockchain_id) WHERE blockchain_id IS NOT NULL;
```

### 2. Add sync_status table
```sql
-- Copy from scripts/004-add-sync-status.sql
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

## ✅ STEP 2: Restart the App

```bash
# Stop current app (Ctrl+C)
# Then restart
npm run dev
```

**Watch the console for:**
```
[RealtimeSync] Starting real-time blockchain sync...
[RealtimeSync] Performing full sync...
[RealtimeSync] Synced X universities
```

---

## ✅ STEP 3: Trigger Manual Sync (If Needed)

**Open in browser or use curl:**
```
POST http://localhost:3000/api/sync/start
Body: {"action": "full_sync"}
```

**Or use this URL directly:**
```
http://localhost:3000/api/sync/start
```
(Then use browser dev tools or Postman to send POST request)

---

## ✅ STEP 4: Verify It Works

### Check Database:
```sql
-- Should show universities from NEW contract
SELECT blockchain_id, name, wallet_address, blockchain_verified 
FROM universities 
WHERE blockchain_verified = true;

-- Should show degrees from NEW contract
SELECT token_id, student_name, university_id, blockchain_verified 
FROM degrees 
WHERE blockchain_verified = true
LIMIT 10;
```

### Check UI:
- Admin dashboard should show universities
- Data should match BaseScan for contract: `0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`

---

## 🎯 What's Fixed

✅ **Contract Address**: Now uses `0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`  
✅ **Real-Time Sync**: WebSocket + 30-second polling  
✅ **Auto-Start**: Sync starts when server starts  
✅ **Database Sync**: Universities and degrees sync automatically  

---

## ⚠️ Troubleshooting

### If database still empty:
1. Check server logs for errors
2. Verify `.env.local` has new contract address
3. Manually trigger: `POST /api/sync/start` with `{"action": "full_sync"}`

### If UI shows old data:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check server is using new contract (check logs)

---

**Follow these 4 steps and your database will be populated from the new contract!** 🚀
