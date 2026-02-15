# 🚀 Full Blockchain Migration Guide

## ✅ Setup Complete

I've set up a comprehensive migration system that:
1. ✅ Uses Infura API for reliable blockchain access
2. ✅ Fetches ALL data from the smart contract
3. ✅ Populates the database completely
4. ✅ Sets up real-time sync with Infura WebSocket

---

## 🔧 Step 1: Update Environment Variables

**Add to `.env.local`:**

```env
# Infura API Configuration
NEXT_PUBLIC_INFURA_API_KEY=551512fe33974a55845e6eb37502269c

# Existing contract addresses (already set)
NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2=0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A
NEXT_PUBLIC_DEGREE_NFT_MAINNET=0xf60FfAA7b0c51219af0A347B704211402FF8e90f
```

---

## 🗄️ Step 2: Run Database Migrations

**In pgAdmin, run these SQL scripts (in order):**

### 1. Add blockchain_id to universities
```sql
-- scripts/005-add-blockchain-id.sql
ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_id BIGINT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
```

### 2. Add blockchain_verified to degrees
```sql
-- scripts/006-add-degrees-blockchain-columns.sql
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;
```

### 3. Add sync_status table
```sql
-- scripts/004-add-sync-status.sql
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

## 🚀 Step 3: Run Full Migration

### Option A: Via API (Recommended)

**In browser console or Postman:**

```javascript
// POST request to trigger full migration
fetch('/api/migrate/full', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
  console.log('Migration Results:', data);
  console.log('Universities:', data.results.universities);
  console.log('Degrees:', data.results.degrees);
})
.catch(console.error);
```

**Or use curl:**
```bash
curl -X POST http://localhost:3000/api/migrate/full \
  -H "Content-Type: application/json"
```

### Option B: Restart App (Auto-Sync)

The real-time sync will automatically start when you run:
```bash
npm run dev
```

But for a **complete one-time migration**, use Option A above.

---

## ✅ Step 4: Verify Migration

### Check Database

```sql
-- Check universities
SELECT 
  blockchain_id, 
  name, 
  wallet_address, 
  blockchain_verified,
  last_synced_at
FROM universities 
WHERE blockchain_verified = true
ORDER BY blockchain_id;

-- Check degrees
SELECT 
  token_id,
  student_name,
  university_id,
  is_revoked,
  blockchain_verified,
  last_verified_at
FROM degrees 
WHERE blockchain_verified = true
ORDER BY token_id
LIMIT 20;

-- Check issuers
SELECT 
  wallet_address,
  university_id,
  is_active,
  blockchain_verified
FROM issuers
WHERE blockchain_verified = true;

-- Check revokers
SELECT 
  wallet_address,
  university_id,
  is_active,
  blockchain_verified
FROM revokers
WHERE blockchain_verified = true;

-- Check sync status
SELECT * FROM sync_status;
```

---

## 🔄 Real-Time Sync

### Automatic Sync
- ✅ Starts automatically when server starts
- ✅ Uses Infura WebSocket for real-time events
- ✅ Falls back to 30-second polling if WebSocket unavailable
- ✅ Monitors all blockchain events

### Events Monitored
- `UniversityRegistered` → Syncs new university
- `DegreeIssued` → Syncs new degree
- `DegreeRevoked` → Updates degree status
- `DegreeRequested` (V2) → Syncs request
- `RevocationRequested` (V2) → Syncs revocation

### Manual Sync Triggers

**Start real-time sync:**
```javascript
fetch('/api/sync/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'start' })
})
```

**Trigger full sync:**
```javascript
fetch('/api/sync/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'full_sync' })
})
```

---

## 📊 What Gets Migrated

### Universities
- ✅ All university data from blockchain
- ✅ Admin wallet addresses
- ✅ Names (English & Arabic)
- ✅ Active/inactive status
- ✅ Blockchain ID mapping

### Degrees
- ✅ All degree NFTs
- ✅ Student information
- ✅ University association
- ✅ Major, faculty, graduation year
- ✅ Revocation status
- ✅ Owner addresses

### Issuers & Revokers
- ✅ All issuer addresses per university
- ✅ All revoker addresses per university
- ✅ Active status
- ✅ Blockchain verification

### Verifiers (V2 Contract)
- ✅ All verifier addresses per university
- ✅ Required approvals count

---

## 🎯 Expected Results

After migration, you should see:

```
Migration Results:
{
  success: true,
  results: {
    universities: { added: X, updated: 0 },
    degrees: { added: Y, updated: 0 },
    issuers: { added: Z, updated: 0 },
    revokers: { added: W, updated: 0 },
    totalTime: "XX.XX"
  }
}
```

---

## ⚠️ Troubleshooting

### Migration Fails
1. Check server logs for errors
2. Verify `.env.local` has Infura API key
3. Verify contract address is correct
4. Check database connection

### No Data Migrated
1. Verify contract has data on blockchain
2. Check BaseScan: `https://basescan.org/address/0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`
3. Verify RPC connection (check server logs)

### Real-Time Sync Not Working
1. Check WebSocket connection in server logs
2. Verify Infura API key is correct
3. Check if polling fallback is working (30-second intervals)

---

## 🎉 Success Indicators

✅ Database tables populated with data  
✅ `blockchain_verified = true` on all synced records  
✅ Real-time sync running (check server logs)  
✅ UI shows data from new contract  
✅ No errors in server console  

---

**Run the migration and your database will be fully populated from the blockchain!** 🚀
