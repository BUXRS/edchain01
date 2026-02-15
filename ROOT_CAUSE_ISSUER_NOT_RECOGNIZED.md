# Root Cause Analysis: Issuer Not Recognized

## Problem
Wallet `0x70fc...8017` is showing as "not an authorized issuer" even though it should be an issuer on the blockchain.

## Root Causes Identified

### 1. **Database Not Synced** (Most Common)
- The indexer/WebSocket may not have synced the issuer data to the database
- The `issuers` table may be missing the wallet address
- Solution: Force sync the issuer data

### 2. **Blockchain Check Failing**
- RPC provider issues
- Network timeout
- Contract call errors
- Solution: Check RPC health and retry

### 3. **Mismatch Between Database and Blockchain**
- Database has old/stale data
- Blockchain was updated but database wasn't synced
- Solution: Re-sync from blockchain

### 4. **Wrong University ID**
- Checking wrong blockchain_id
- Database ID vs Blockchain ID confusion
- Solution: Use correct blockchain_id

## Solutions Implemented

### 1. Database-First Approach
- ✅ Updated `/api/issuers/universities` to query database first
- ✅ Falls back to blockchain if database is empty
- ✅ Much faster than checking blockchain for each university

### 2. Diagnostic Endpoint
- ✅ Created `/api/issuers/verify?walletAddress=0x...`
- ✅ Shows both database and blockchain status
- ✅ Detects mismatches automatically

### 3. Enhanced Error Messages
- ✅ Issue page now shows diagnostic URL in error message
- ✅ Console logs detailed information
- ✅ Helps identify the exact problem

## How to Fix

### Step 1: Check Current Status
Visit: `/api/issuers/verify?walletAddress=0x70fc8cd8069ac823e30099ea9b661e6620e08017`

This will show:
- Is the wallet in the database?
- Is the wallet on the blockchain?
- Are there any mismatches?

### Step 2: Force Sync (if needed)
If database is missing data:
1. Go to Admin panel
2. Navigate to the university
3. Click "Sync Issuers" button
4. Or use API: `POST /api/admin/universities/[id]/sync`

### Step 3: Verify Indexer is Running
Check terminal logs for:
- `[IndexerService] Starting blockchain indexer...`
- `[EventProjector] Processing IssuerUpdated event...`
- `[BlockchainSync] Syncing issuers for university...`

### Step 4: Check Database Directly
```sql
SELECT * FROM issuers 
WHERE wallet_address = '0x70fc8cd8069ac823e30099ea9b661e6620e08017'
AND is_active = true;
```

## Prevention

1. **Ensure Indexer is Running**: The WebSocket indexer should always be running
2. **Monitor Sync Status**: Check `/api/sync/status` regularly
3. **Use Database API**: Always use database-first approach (already implemented)
4. **Fallback to Blockchain**: If database fails, fallback to blockchain (already implemented)

## Technical Details

### Database Query (Fast)
```sql
SELECT DISTINCT u.*
FROM issuers i
INNER JOIN universities u ON i.university_id = u.id
WHERE i.wallet_address = '0x...'
  AND i.is_active = true
  AND u.is_active = true
```

### Blockchain Check (Slow, but source of truth)
```typescript
const isIssuer = await checkIsIssuerOnChain(universityId, walletAddress)
```

### Hybrid Approach (Current Implementation)
1. Try database first (fast)
2. If empty, try blockchain (slow but accurate)
3. If blockchain confirms, update database
4. Show diagnostic info if mismatch detected
