# 🔧 Fix: Degrees Table Missing Columns

## Problem
The `degrees` table is missing the `blockchain_verified` column, causing errors when trying to query or sync degrees.

**Error seen:**
```
ERROR: column "blockchain_verified" does not exist
LINE 2: SELECT * FROM degrees WHERE blockchain_verified = true LIMIT...
```

## ✅ Solution

### Run This SQL in pgAdmin

**Copy and paste this entire script into pgAdmin Query Tool:**

```sql
-- Add blockchain verification columns to degrees table
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_degrees_blockchain_verified ON degrees(blockchain_verified);

-- Update existing degrees (if any) to mark them as needing verification
UPDATE degrees SET blockchain_verified = false WHERE blockchain_verified IS NULL;
```

**Or use the migration file:**
- File: `scripts/006-add-degrees-blockchain-columns.sql`
- Copy its contents and run in pgAdmin

---

## ✅ After Running Migration

### 1. Verify Columns Added
```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'degrees' 
  AND column_name IN ('blockchain_verified', 'last_verified_at');
```

**Expected output:**
- `blockchain_verified` | `boolean`
- `last_verified_at` | `timestamp with time zone`

### 2. Test Query
```sql
-- This should now work without errors
SELECT * FROM degrees WHERE blockchain_verified = true LIMIT 10;
```

### 3. Trigger Sync
After migration, trigger a full sync to populate the database:

**Via API:**
```bash
curl -X POST http://localhost:3000/api/sync/start \
  -H "Content-Type: application/json" \
  -d '{"action": "full_sync"}'
```

**Or restart the app** - sync will start automatically.

---

## 📋 Complete Migration Checklist

Make sure you've run ALL these migrations:

- ✅ `scripts/003-add-verifier-stage.sql` (if using V2 contract)
- ✅ `scripts/004-add-sync-status.sql` (sync tracking)
- ✅ `scripts/005-add-blockchain-id.sql` (universities blockchain_id)
- ✅ `scripts/006-add-degrees-blockchain-columns.sql` (degrees verification) ← **YOU ARE HERE**

---

## 🎯 What This Fixes

- ✅ Allows querying degrees by `blockchain_verified` status
- ✅ Enables sync service to mark degrees as verified
- ✅ Tracks when degrees were last verified from blockchain
- ✅ Fixes the error you're seeing in pgAdmin

**Run the migration and then trigger sync!** 🚀
