# ✅ Foreign Key Constraint Fix - Complete

## Problem

All sync functions were using `universityId` (blockchain_id) directly in database queries, but foreign keys reference `universities.id` (database primary key), not `universities.blockchain_id`.

**Error:**
```
insert or update on table "degrees" violates foreign key constraint "degrees_university_id_fkey"
```

## Root Cause

The database schema has:
- `universities.id` (SERIAL PRIMARY KEY) - Database primary key
- `universities.blockchain_id` (BIGINT UNIQUE) - Blockchain identifier

But foreign keys reference `universities.id`:
- `degrees.university_id` → `universities.id`
- `issuers.university_id` → `universities.id`
- `revokers.university_id` → `universities.id`
- `verifiers.university_id` → `universities.id`

## Solution Applied

### 1. Created Helper Function

**File**: `lib/services/blockchain-sync.ts`

Added `getDbUniversityId()` helper that:
- Looks up database `id` from `blockchain_id`
- Syncs university if not found
- Returns database `id` or `null`

```typescript
private async getDbUniversityId(blockchainId: number): Promise<number | null> {
  // Check if university exists in DB
  const dbUniversity = await sql`
    SELECT id FROM universities WHERE blockchain_id = ${blockchainId} LIMIT 1
  `
  
  if (dbUniversity.length > 0) {
    return dbUniversity[0].id
  }
  
  // University doesn't exist - sync it first
  const syncResult = await this.syncUniversity(blockchainId)
  // ... retry lookup after sync
}
```

### 2. Fixed All Sync Functions

**Functions Fixed:**
1. ✅ `syncDegreesForUniversity` - Now uses `dbUniversityId` instead of `universityId`
2. ✅ `syncIssuersForUniversity` - Now uses `dbUniversityId` instead of `universityId`
3. ✅ `syncRevokersForUniversity` - Now uses `dbUniversityId` instead of `universityId`
4. ✅ `syncVerifiersForUniversity` - Now uses `dbUniversityId` instead of `universityId`

**Pattern Applied:**
```typescript
// Before (WRONG):
const dbIssuers = await sql`
  SELECT * FROM issuers WHERE university_id = ${universityId}  // ❌ blockchain_id
`

// After (CORRECT):
const dbUniversityId = await this.getDbUniversityId(universityId)
const dbIssuers = await sql`
  SELECT * FROM issuers WHERE university_id = ${dbUniversityId}  // ✅ database id
`
```

### 3. Fixed All Verify Functions

**Functions Fixed:**
1. ✅ `verifyIssuer` - Now uses `dbUniversityId` in WHERE clauses
2. ✅ `verifyRevoker` - Now uses `dbUniversityId` in WHERE clauses
3. ✅ `verifyVerifier` - Now uses `dbUniversityId` in WHERE clauses

### 4. Fixed All INSERT Statements

**Fixed:**
- ✅ Verifier INSERT - Now uses `dbUniversityId` instead of `universityId`
- ✅ Degree INSERT - Already fixed to use `dbUniversityId`
- ✅ Degree UPDATE - Now also updates `university_id` to ensure consistency

## Expected Behavior After Restart

**Server Logs Should Show:**
```
[BlockchainSync] Fetching degrees for university 1 from blockchain...
[BlockchainSync] Using database university ID: 2 for blockchain_id: 1
[BlockchainSync] Found 1 degrees for university 1
[BlockchainSync] Inserting degree 1 into database...
[BlockchainSync] ✅ Successfully inserted degree 1
[WebSocketIndexer] University 1 degrees: added=1, updated=0
```

**Database Should Have:**
```sql
SELECT d.token_id, d.student_name, u.name_en 
FROM degrees d 
JOIN universities u ON d.university_id = u.id 
WHERE d.blockchain_verified = true;
-- Should return degree with proper university join
```

## Pattern for Future Fixes

**Always check:**
1. Does the table have a foreign key?
2. Does the foreign key reference `universities.id` or `universities.blockchain_id`?
3. If it references `universities.id`, use `getDbUniversityId()` helper
4. Ensure university exists in DB before inserting related records

**This same pattern applies to:**
- All tables with `university_id` foreign keys
- All sync functions that take `universityId` (blockchain_id) as parameter
- All verify functions that query by `university_id`

---

**Status**: ✅ Fixed  
**Date**: 2026-01-25  
**Next Step**: Restart server to sync degrees with correct foreign key references
