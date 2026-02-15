# 🔍 Why University Appears in Dashboard (But Not in DB)

## The Answer

**The university appears in the dashboard because the UI is still reading directly from the blockchain**, which violates the new architecture requirements.

## How It Currently Works (WRONG - Violates Architecture)

### Admin Degrees Page (`app/admin/degrees/page.tsx`)

When you search for a degree:

1. **Line 59**: `fetchDegreeFromBlockchain(tokenId)` - **Direct blockchain read** ❌
2. **Line 69**: `fetchUniversityFromBlockchain(Number(degree.universityId))` - **Direct blockchain read** ❌
3. **Line 72**: `fetchDegreeOwner(tokenId)` - **Direct blockchain read** ❌

**Result**: University name appears because it's being fetched directly from blockchain, even though:
- The `getUniversity(1)` call fails with `CALL_EXCEPTION`
- The database is empty
- The sync isn't working

## Why `getUniversity(1)` Fails

From the debug output:
- `nextUniversityId = 2` (meaning 1 university should exist)
- But `getUniversity(1)` returns `CALL_EXCEPTION: missing revert data`

**Possible reasons:**
1. **University was never properly registered** - The `nextUniversityId` counter was incremented, but the university struct wasn't properly initialized
2. **University was deleted/deactivated** - The struct exists but `exists = false`
3. **Contract state inconsistency** - The counter and the actual data don't match
4. **Wrong contract address** - You're calling a different contract than where the university was registered

## The Correct Flow (After Fix)

### ✅ Fixed Architecture

1. **UI calls**: `GET /api/verify/degree/:tokenId`
2. **Backend reads chain**: Verifies degree on-chain
3. **Backend returns**: Degree data + university info (from DB if synced, or from chain as fallback)
4. **UI displays**: Data from API response (no direct blockchain reads)

### How University Name Should Appear

**Option 1: From Database (Preferred)**
- Degree is synced to DB with `university_id`
- University is synced to DB with `blockchain_id`
- API joins them: `SELECT d.*, u.name_en FROM degrees d JOIN universities u ON d.university_id = u.id`

**Option 2: From Degree Event (If University Not Registered)**
- `DegreeIssued` event contains `universityId`
- Indexer extracts `universityId` from event
- If university doesn't exist in `universities` table, create a placeholder entry
- Or: Store university name in degree record itself (denormalized)

## The Real Issue

**The university might not exist as a separate on-chain entity.**

Looking at the contract structure:
- Degrees contain `universityId` (a number)
- But `getUniversity(universityId)` is failing
- This suggests the university was never properly registered via `registerUniversity()`

**Possible scenarios:**
1. **Degrees were issued before university registration** - The `universityId` in degrees points to a non-existent university
2. **University registration failed** - The transaction reverted but `nextUniversityId` was incremented
3. **Different contract versions** - Old degrees reference universities that don't exist in the new contract

## Solution

### Immediate Fix (Applied)

✅ **Refactored admin degrees page** to use `/api/verify/degree/:tokenId` endpoint instead of direct blockchain reads

### Long-term Fix

1. **Check BaseScan Events**:
   - Look for `UniversityRegistered` events
   - If none exist, universities were never registered
   - If events exist, check if `getUniversity()` works for those IDs

2. **Sync Strategy**:
   - When syncing a degree, check if its `universityId` exists in DB
   - If not, try to fetch it from blockchain
   - If `getUniversity()` fails, create a placeholder entry with just the ID
   - Or: Store university name directly in degree record (denormalized)

3. **Handle Missing Universities**:
   ```typescript
   // In blockchain-sync.ts
   async syncDegree(tokenId: number) {
     const degree = await fetchDegreeFromBlockchain(tokenId)
     const universityId = Number(degree.universityId)
     
     // Try to sync university
     const uni = await fetchUniversityFromBlockchain(universityId)
     if (!uni || !uni.exists) {
       // University doesn't exist on-chain, create placeholder
       await sql`
         INSERT INTO universities (blockchain_id, name, is_active, blockchain_verified)
         VALUES (${universityId}, ${`University ${universityId}`}, false, false)
         ON CONFLICT (blockchain_id) DO NOTHING
       `
     } else {
       await this.syncUniversity(universityId)
     }
     
     // Then sync the degree
     // ...
   }
   ```

## Summary

**Why university appears**: UI is reading directly from blockchain (violates architecture)  
**Why DB is empty**: University doesn't exist as separate entity, or sync isn't working  
**Why `getUniversity(1)` fails**: University was never properly registered, or contract state is inconsistent  

**Fix applied**: Admin degrees page now uses `/api/verify/degree/:tokenId` (backend reads chain, UI calls API)

---

**The university name you see is coming from a direct blockchain read that's failing silently. After the fix, it will come from the database (synced by the indexer) or the verify endpoint (backend reads chain).**
