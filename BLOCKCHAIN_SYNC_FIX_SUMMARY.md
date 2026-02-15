# 🔧 Blockchain Data Sync Fix - Complete Solution

## Problem Identified

1. **Rate Limiting**: Base RPC endpoint (`https://mainnet.base.org`) is rate limiting requests
   - Error: `code: -32016, message: 'over rate limit'`
   - Causes `fetchUniversityFromBlockchain` to fail silently

2. **Inefficient Data Fetching**: Comprehensive sync was calling `fetchUniversityFromBlockchain` for each university individually, even though `fetchAllUniversities` already fetched all the data

3. **Missing Error Handling**: Rate limit errors were being caught and returning `null` without proper logging

## Solutions Applied

### ✅ 1. Enhanced Rate Limit Handling
- **File**: `lib/blockchain.ts`
- **Changes**:
  - Added rate limit detection (code: -32016)
  - Increased retry attempts from 3 to 5
  - Added exponential backoff with longer delays (up to 30 seconds) for rate limits
  - Better error logging with full error details

### ✅ 2. Optimized Comprehensive Sync
- **File**: `lib/services/blockchain-sync.ts`
- **Changes**:
  - Created `syncUniversityFromData()` method that uses already-fetched data
  - Comprehensive sync now uses data from `fetchAllUniversities()` instead of making individual calls
  - Added delays between requests (2 seconds between universities, 1 second between entities)
  - This **dramatically reduces** the number of RPC calls

### ✅ 3. Configurable RPC Endpoint
- **File**: `lib/blockchain.ts`
- **Changes**:
  - RPC URL can now be configured via environment variables
  - Supports `BASE_RPC_URL` or `NEXT_PUBLIC_BASE_RPC_URL`
  - Allows using premium RPC providers (Alchemy, Infura, QuickNode)

### ✅ 4. Better Error Logging
- **File**: `lib/blockchain.ts` - `fetchUniversityFromBlockchain()`
- **Changes**:
  - Added detailed error logging
  - Checks for `isDeleted` field
  - Better error messages for debugging

## How It Works Now

### Comprehensive Sync Flow:
1. **Fetch all universities** in one call (`fetchAllUniversities`)
2. **Use the fetched data directly** to sync to DB (no additional RPC calls)
3. **Add delays** between syncs to avoid rate limits
4. **For each university**, sync issuers, revokers, verifiers, and degrees

### Rate Limit Handling:
- Detects rate limit errors automatically
- Waits with exponential backoff (2s, 4s, 8s, 16s, 30s max)
- Retries up to 5 times
- Logs warnings if rate limits persist

## Immediate Action Required

### Option 1: Use Premium RPC (Recommended for Production)

**Get an API key from:**
- **Alchemy**: https://www.alchemy.com/ (Free tier: 300M compute units/month)
- **Infura**: https://www.infura.io/ (Free tier: 100k requests/day)
- **QuickNode**: https://www.quicknode.com/ (Free tier available)

**Add to `.env.local`**:
```env
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
# OR
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### Option 2: Use Current Setup (With Delays)

The current setup will work but slower due to:
- 2 second delays between universities
- 1 second delays between entities
- Rate limit retries

**For 4 universities**, sync will take approximately:
- Universities: 4 × 2s = 8 seconds
- Entities per university: 4 × 1s = 4 seconds
- Total: ~12-15 seconds (plus any rate limit retries)

## Testing

After restarting the server, you should see:
```
[BlockchainSync] Found 4 universities to sync
[BlockchainSync] Syncing university 1 (1/4): USA University
[BlockchainSync] ✅ Successfully inserted university 1: USA University
[BlockchainSync] Syncing all entities for university 1...
...
```

## Expected Results

After the fix:
- ✅ All 4 universities should be synced to DB
- ✅ All issuers, revokers, verifiers for each university
- ✅ All degrees for each university
- ✅ All requests (degree requests, revocation requests)

## Verification

Check the database:
```sql
SELECT COUNT(*) FROM universities WHERE blockchain_verified = true;
SELECT COUNT(*) FROM issuers WHERE blockchain_verified = true;
SELECT COUNT(*) FROM revokers WHERE blockchain_verified = true;
SELECT COUNT(*) FROM verifiers WHERE blockchain_verified = true;
SELECT COUNT(*) FROM degrees;
```

Or use the script:
```bash
node scripts/check-indexer-status.js
```

## Next Steps

1. **Restart the dev server** - The comprehensive sync will run automatically
2. **Monitor the logs** - Watch for successful syncs
3. **If still rate limited**: Set up a premium RPC provider (see Option 1 above)
4. **Verify data**: Check that universities, issuers, revokers, verifiers, and degrees are in the database
