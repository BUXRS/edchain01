# 🔧 Rate Limit Fix for Blockchain Data Sync

## Problem

The Base RPC endpoint (`https://mainnet.base.org`) is **rate limiting** requests, causing:
- `fetchUniversityFromBlockchain` to fail with `CALL_EXCEPTION` (code: -32016)
- Universities not being synced to database
- Comprehensive sync returning 0 results

## Solution Applied

### 1. ✅ Enhanced Rate Limit Handling
- Added detection for rate limit errors (code: -32016)
- Increased retry attempts from 3 to 5
- Added exponential backoff with longer delays for rate limits (up to 30 seconds)

### 2. ✅ Added Delays Between Requests
- 2 second delay between university syncs
- 1 second delay between entity syncs (issuers, revokers, verifiers, degrees)
- Prevents hitting rate limits too quickly

### 3. ✅ Configurable RPC Endpoint
- Can now use custom RPC via environment variables
- Supports premium RPC providers (Alchemy, Infura, QuickNode)

## Recommended: Use Premium RPC Provider

For production, use a premium RPC provider with higher rate limits:

### Option 1: Alchemy (Recommended)
```env
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### Option 2: Infura
```env
BASE_RPC_URL=https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID
```

### Option 3: QuickNode
```env
BASE_RPC_URL=https://YOUR_ENDPOINT.base-mainnet.quiknode.pro/YOUR_API_KEY
```

### Option 4: Public Base RPC (Current - Rate Limited)
```env
BASE_RPC_URL=https://mainnet.base.org
```

## How to Set Up

1. **Get an RPC API key** from Alchemy, Infura, or QuickNode
2. **Add to `.env.local`**:
   ```env
   BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   # OR
   NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   ```
3. **Restart the dev server** - the new RPC will be used automatically

## Testing

After setting up a premium RPC, test with:
```bash
node scripts/test-fetch-university.js
```

You should see universities being fetched successfully without rate limit errors.

## Current Status

- ✅ Rate limit detection added
- ✅ Retry logic with backoff implemented
- ✅ Delays between requests added
- ✅ Configurable RPC endpoint
- ⚠️ Still using public Base RPC (rate limited)
- 💡 **Action Required**: Set up premium RPC provider for production
