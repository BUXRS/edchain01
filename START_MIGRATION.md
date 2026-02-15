# 🚀 START FULL MIGRATION NOW

## ✅ Everything is Ready!

I've set up:
1. ✅ Infura API integration (primary RPC)
2. ✅ Full migration endpoint
3. ✅ Real-time sync with Infura WebSocket
4. ✅ Comprehensive data fetching

---

## 🔴 STEP 1: Add Infura API Key

**Your `.env.local` should have:**
```env
NEXT_PUBLIC_INFURA_API_KEY=551512fe33974a55845e6eb37502269c
```

✅ Already added!

---

## 🔴 STEP 2: Run Database Migrations

**In pgAdmin, run these SQL (if not already done):**

```sql
-- 1. Add blockchain_id to universities
ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_id BIGINT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- 2. Add blockchain_verified to degrees
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- 3. Add sync_status table
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

## 🚀 STEP 3: Run Full Migration

### Option A: Browser Console (Easiest)

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Open browser console** (F12) on your app page

3. **Run this command:**
   ```javascript
   fetch('/api/migrate/full', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' }
   })
   .then(r => r.json())
   .then(data => {
     console.log('✅ Migration Complete!');
     console.log('Results:', data.results);
     console.log('Universities:', data.results.universities);
     console.log('Degrees:', data.results.degrees);
   })
   .catch(err => console.error('❌ Error:', err));
   ```

### Option B: Postman/Thunder Client

- **URL**: `POST http://localhost:3000/api/migrate/full`
- **Headers**: `Content-Type: application/json`
- **Body**: (empty)

### Option C: curl

```bash
curl -X POST http://localhost:3000/api/migrate/full \
  -H "Content-Type: application/json"
```

---

## ⏱️ What Happens

The migration will:
1. ✅ Fetch ALL universities from contract `0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`
2. ✅ Fetch ALL degrees from the contract
3. ✅ Populate database with all data
4. ✅ Mark everything as `blockchain_verified = true`
5. ✅ Update sync status

**This may take 1-5 minutes depending on data volume.**

---

## ✅ STEP 4: Verify Migration

**Check database:**
```sql
-- Universities
SELECT COUNT(*) as total, 
       SUM(CASE WHEN blockchain_verified = true THEN 1 ELSE 0 END) as verified
FROM universities;

-- Degrees
SELECT COUNT(*) as total,
       SUM(CASE WHEN blockchain_verified = true THEN 1 ELSE 0 END) as verified
FROM degrees;

-- Sync status
SELECT * FROM sync_status;
```

---

## 🔄 Real-Time Sync

After migration, real-time sync will:
- ✅ Start automatically on server restart
- ✅ Use Infura WebSocket for instant updates
- ✅ Poll every 30 seconds as fallback
- ✅ Keep database in sync with blockchain

---

## 🎯 Expected Output

You should see in console:
```
[FullMigration] Starting full blockchain migration...
[FullMigration] Fetching all data from blockchain...
[FetchAllData] Found X universities
[FetchAllData] Found Y degrees
[FullMigration] Migrating universities...
[FullMigration] Migrating degrees...
[FullMigration] Migration completed in XX.XXs
```

And in response:
```json
{
  "success": true,
  "message": "Full migration completed",
  "results": {
    "universities": { "added": X, "updated": 0 },
    "degrees": { "added": Y, "updated": 0 },
    "issuers": { "added": Z, "updated": 0 },
    "revokers": { "added": W, "updated": 0 },
    "totalTime": "XX.XX"
  }
}
```

---

**Run the migration now and your database will be fully populated!** 🚀
