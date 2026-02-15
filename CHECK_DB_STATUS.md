# 🔍 Check Database Status

## Quick Database Check

Run this in your terminal (PowerShell):

```powershell
cd "c:\Users\USER\Desktop\Blockchain\vercel23126update"
$env:DATABASE_URL="postgresql://postgres:BU%40Blck2025@localhost:5432/bubd"
node -e "const postgres=require('postgres');const sql=postgres(process.env.DATABASE_URL);sql`SELECT COUNT(*) as count FROM universities WHERE blockchain_verified = true`.then(r=>console.log('Verified universities:',Number(r[0]?.count||0))).then(()=>sql`SELECT COUNT(*) as count FROM universities`.then(r=>console.log('Total universities:',Number(r[0]?.count||0)))).then(()=>sql.end()).catch(e=>console.error('Error:',e.message));"
```

Or check directly in pgAdmin:
```sql
-- Check all universities
SELECT id, blockchain_id, name, name_en, blockchain_verified, created_at 
FROM universities 
ORDER BY created_at DESC;

-- Check verified universities only
SELECT COUNT(*) FROM universities WHERE blockchain_verified = true;

-- Check sync status
SELECT * FROM sync_status;
```

## What to Look For

1. **If `blockchain_verified = true` universities exist:**
   - ✅ Sync is working, but API might be querying wrong
   - Check API query: `SELECT COUNT(*) FROM universities WHERE blockchain_verified = true`

2. **If universities exist but `blockchain_verified = false`:**
   - ⚠️ Sync ran but didn't set the flag
   - Check if `blockchain_id` is set

3. **If no universities at all:**
   - ❌ INSERT is failing
   - Check server logs for database errors
   - Check for constraint violations

## Enhanced Logging

After restart, server logs will show:
- `[BlockchainSync] Inserting university 1 into database...`
- `[BlockchainSync] ✅ Successfully inserted university 1`
- `[WebSocketIndexer] Verification: 1 universities with blockchain_id=1 in DB`

If you see "WARNING: Sync reported added=1 but university not found in DB", then the INSERT is failing silently.
