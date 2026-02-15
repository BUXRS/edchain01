# ✅ Issuers, Revokers, and Verifiers Sync Fix

## Problem

Issuers, revokers, and verifiers were NOT being fetched from blockchain and inserted into the database:
- ❌ `syncIssuersForUniversity()` - Only verified existing DB records, didn't fetch new ones
- ❌ `syncRevokersForUniversity()` - Only verified existing DB records, didn't fetch new ones  
- ❌ `syncVerifiersForUniversity()` - Only verified existing DB records, didn't fetch new ones

**Result**: New issuers/revokers/verifiers added to smart contract were never appearing in the database.

## Solution Applied

### 1. Fixed `syncIssuersForUniversity()` - Now Fetches from Blockchain

**File**: `lib/services/blockchain-sync.ts`

**Before**: Only verified existing DB records
**After**: 
1. **Fetches ALL issuers from blockchain events** using `fetchIssuersFromBlockchainEvents()`
2. **Compares with database**
3. **Inserts new issuers** that don't exist in DB
4. **Updates existing issuers** (reactivates if needed)
5. **Deactivates issuers** that are no longer on blockchain

```typescript
// STEP 1: Fetch ALL issuers from blockchain events (source of truth)
const { fetchIssuersFromBlockchainEvents } = await import("@/lib/blockchain-fetch-issuers-revokers")
const blockchainIssuers = await fetchIssuersFromBlockchainEvents(universityId)

// STEP 2: Get existing issuers from database
const dbIssuers = await sql`SELECT * FROM issuers WHERE university_id = ${dbUniversityId}`

// STEP 3: Insert new issuers that don't exist in DB
for (const issuerAddress of blockchainIssuers) {
  if (!existing) {
    await sql`INSERT INTO issuers (...) VALUES (...)`
    result.added++
  }
}

// STEP 4: Deactivate issuers that are no longer on blockchain
for (const dbIssuer of dbIssuers) {
  if (!blockchainIssuers.includes(normalizedAddress) && dbIssuer.is_active) {
    await sql`UPDATE issuers SET is_active = false WHERE id = ${dbIssuer.id}`
    result.removed++
  }
}
```

### 2. Fixed `syncRevokersForUniversity()` - Now Fetches from Blockchain

**Same pattern as issuers:**
1. Fetches from `fetchRevokersFromBlockchainEvents()`
2. Inserts new revokers
3. Updates existing revokers
4. Deactivates removed revokers

### 3. Fixed `syncVerifiersForUniversity()` - Now Fetches from Blockchain

**Same pattern:**
1. Fetches from `getUniversityVerifiers()` (contract function)
2. Inserts new verifiers
3. Updates existing verifiers
4. Deactivates removed verifiers

### 4. Event Listeners Already Working

**File**: `lib/services/websocket-indexer.ts`

Event listeners are already set up:
- ✅ `IssuerUpdated` event → Calls `syncIssuersForUniversity()`
- ✅ `RevokerUpdated` event → Calls `syncRevokersForUniversity()`
- ✅ `VerifierAdded/Removed` event → Calls `syncVerifiersForUniversity()`

**Polling Listener**: Queries all events including `IssuerUpdated`, `RevokerUpdated`, `VerifierAdded`, `VerifierRemoved`

## How It Works Now

### On Startup (Comprehensive Sync)
1. For each university:
   - Sync university
   - **Fetch and insert ALL issuers from blockchain events**
   - **Fetch and insert ALL revokers from blockchain events**
   - **Fetch and insert ALL verifiers from blockchain**
   - Sync degrees

### Real-Time (Event Listeners)
1. `IssuerUpdated` event fires → `syncIssuersForUniversity()` → Fetches all issuers from events → Inserts/updates in DB
2. `RevokerUpdated` event fires → `syncRevokersForUniversity()` → Fetches all revokers from events → Inserts/updates in DB
3. `VerifierAdded/Removed` event fires → `syncVerifiersForUniversity()` → Fetches all verifiers from contract → Inserts/updates in DB

### Periodic Sync (Every 1 Hour)
- Comprehensive full sync runs automatically
- Ensures all issuers/revokers/verifiers are in sync

## Expected Behavior After Restart

**Server Logs Should Show:**
```
[BlockchainSync] Fetching issuers for university 1 from blockchain events...
[BlockchainSync] Found X issuers on blockchain for university 1
[BlockchainSync] Inserting new issuer 0x... for university 1...
[BlockchainSync] ✅ Successfully inserted issuer 0x...
[BlockchainSync] ✅ Completed syncing issuers for university 1: added=X, updated=Y, removed=Z
```

**Database Should Have:**
```sql
SELECT COUNT(*) FROM issuers WHERE blockchain_verified = true; -- Should match blockchain count
SELECT COUNT(*) FROM revokers WHERE blockchain_verified = true; -- Should match blockchain count
SELECT COUNT(*) FROM verifiers WHERE blockchain_verified = true; -- Should match blockchain count
```

## Verification

1. **Check Database**:
   ```sql
   SELECT * FROM issuers WHERE blockchain_verified = true;
   SELECT * FROM revokers WHERE blockchain_verified = true;
   SELECT * FROM verifiers WHERE blockchain_verified = true;
   ```

2. **Check Logs**: Should see "Fetching issuers/revokers/verifiers from blockchain" messages

3. **Test Real-Time**: Add a new issuer/revoker/verifier on blockchain → Should appear in DB within 30 seconds (polling interval)

---

**Status**: ✅ Fixed  
**Date**: 2026-01-25  
**Files Changed**: 
- `lib/services/blockchain-sync.ts` (all three sync functions)
