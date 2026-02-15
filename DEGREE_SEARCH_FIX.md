# ✅ Degree Search Fix - Token ID Type Mismatch

## Problem

**Error:** "Invalid token ID" when searching for degree with token ID "1", even though:
- Degree was successfully synced: `[BlockchainSync] ✅ Successfully updated degree 1`
- Degree exists in database

## Root Cause

**Type Mismatch in Database Query:**

The `degrees` table has `token_id VARCHAR(78)`, but the API was querying with a number:

```typescript
// ❌ WRONG: tokenId is a number, but token_id column is VARCHAR
const dbDegree = await sql`
  SELECT * FROM degrees WHERE token_id = ${tokenId} LIMIT 1
`
```

When inserting degrees, `blockchain-sync.ts` correctly converts to string:
```typescript
// ✅ CORRECT: Converting to string
await sql`
  INSERT INTO degrees (token_id, ...) VALUES (${String(degree.tokenId)}, ...)
`
```

But the verify endpoint was querying with a number, causing a type mismatch.

## Solution Applied

### 1. Fixed `app/api/verify/degree/[tokenId]/route.ts`

**Changed:**
```typescript
// Before:
const dbDegree = await sql`
  SELECT * FROM degrees WHERE token_id = ${tokenId} LIMIT 1
`

// After:
const dbDegree = await sql`
  SELECT * FROM degrees WHERE token_id = ${String(tokenId)} LIMIT 1
`
```

### 2. Enhanced `app/admin/degrees/page.tsx` - Better Error Handling

**Improved logic:**
- If blockchain fetch fails but DB has the degree, still show it (DB-first architecture)
- Better fallback to database data when blockchain is unavailable
- Fixed `ownerAddress` mapping to use `student_address` from DB

**Changes:**
```typescript
// Before: Strict requirement for blockchain data
if (!data.blockchain || !data.blockchain.exists) {
  setError(`No degree found...`)
  return
}

// After: DB-first fallback
if (!data.blockchain || !data.blockchain.exists) {
  if (data.database && data.database.exists) {
    // Show DB data even if blockchain fetch failed
    console.log("[v0] Degree found in DB but blockchain fetch failed, showing DB data")
  } else {
    setError(`No degree found...`)
    return
  }
}
```

**Fixed owner address mapping:**
```typescript
// Before:
ownerAddress: data.blockchain.data?.owner || data.database.data?.recipient_wallet || null

// After:
ownerAddress: data.blockchain?.data?.owner || data.database?.data?.student_address || null
```

## Expected Behavior After Fix

**Search for Token ID "1" Should:**
1. ✅ Query database with `token_id = "1"` (string match)
2. ✅ Find degree in database
3. ✅ Attempt blockchain fetch (may fail, but that's OK)
4. ✅ Display degree data from database
5. ✅ Show "Valid" badge if not revoked

**Server Logs Should Show:**
```
GET /api/verify/degree/1 200 OK
[v0] Found degree: { database: { exists: true, ... }, blockchain: { ... } }
```

## Pattern for Future Fixes

**Always check:**
1. What is the column type in the database schema?
2. What type is being used in INSERT statements?
3. What type is being used in SELECT/WHERE queries?
4. Ensure type consistency: `VARCHAR` columns require string comparisons

**This same pattern applies to:**
- All queries on `token_id` columns (VARCHAR)
- All queries on `wallet_address` columns (VARCHAR)
- Any column that stores stringified numbers

---

**Status**: ✅ Fixed  
**Date**: 2026-01-25  
**Files Changed**: 
- `app/api/verify/degree/[tokenId]/route.ts`
- `app/admin/degrees/page.tsx`
