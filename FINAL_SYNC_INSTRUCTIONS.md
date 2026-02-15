# 🚀 FINAL SYNC INSTRUCTIONS - Complete Fix

## ✅ ALL FIXES APPLIED

### 1. Contract Address ✅
- **NEW**: `0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`
- All code updated to use new contract
- V2 ABI loaded automatically

### 2. Real-Time Sync ✅
- WebSocket event listeners
- 30-second polling fallback
- Auto-starts on server startup

### 3. Database Sync ✅
- Universities sync from blockchain
- Degrees sync from blockchain
- Automatic updates

---

## 🔴 REQUIRED: Run These SQL Scripts

**In pgAdmin, run in this order:**

### Script 1: Add blockchain_id column
```sql
-- Copy from scripts/005-add-blockchain-id.sql
ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_id BIGINT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_universities_blockchain_id ON universities(blockchain_id) WHERE blockchain_id IS NOT NULL;
```

### Script 2: Add sync_status table
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

## 🚀 START SYNC

### Method 1: Automatic (Recommended)
1. **Restart your app:**
   ```bash
   # Stop current (Ctrl+C)
   npm run dev
   ```
2. **Watch console** for:
   ```
   [RealtimeSync] Starting real-time blockchain sync...
   [RealtimeSync] Performing full sync...
   [RealtimeSync] Synced X universities
   ```

### Method 2: Manual API Call
**Open browser console or use curl:**
```javascript
// In browser console (on your app page)
fetch('/api/sync/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'full_sync' })
}).then(r => r.json()).then(console.log)
```

**Or use Postman/Thunder Client:**
- URL: `http://localhost:3000/api/sync/start`
- Method: POST
- Body: `{"action": "full_sync"}`

---

## ✅ VERIFY IT WORKED

### 1. Check Database
```sql
-- Universities from NEW contract
SELECT blockchain_id, name, wallet_address, blockchain_verified 
FROM universities 
WHERE blockchain_verified = true;

-- Degrees from NEW contract  
SELECT token_id, student_name, university_id, is_revoked, blockchain_verified
FROM degrees 
WHERE blockchain_verified = true
ORDER BY token_id DESC
LIMIT 10;
```

### 2. Check Server Logs
Look for:
- `[RealtimeSync] Starting real-time blockchain sync...`
- `[RealtimeSync] Synced X universities`
- `[RealtimeSync] Full sync completed`

### 3. Check UI
- Admin dashboard should show universities
- Data should match BaseScan: `https://basescan.org/address/0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`

---

## 🎯 What Happens

1. **On Startup**: Real-time sync starts automatically
2. **Initial Sync**: Fetches all universities and degrees from NEW contract
3. **Ongoing**: 
   - WebSocket listens for new events
   - Polls every 30 seconds for changes
   - Updates database automatically

---

## ⚠️ If Issues

### Database Still Empty?
1. Check server logs for errors
2. Verify `.env.local` has: `NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2=0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`
3. Manually trigger: `POST /api/sync/start` with `{"action": "full_sync"}`

### UI Shows Old Data?
1. Hard refresh: `Ctrl+Shift+R`
2. Clear browser cache
3. Check server is running with new code

### Sync Not Starting?
1. Check `next.config.mjs` has `experimental.instrumentationHook: true`
2. Check `instrumentation.ts` exists in root
3. Restart server completely

---

## 📋 Summary

✅ **Contract**: Now using `0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`  
✅ **Sync**: Real-time WebSocket + polling  
✅ **Database**: Auto-populates from blockchain  
✅ **Startup**: Sync starts automatically  

**Run the SQL scripts and restart the app - that's it!** 🚀
