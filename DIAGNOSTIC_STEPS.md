# Diagnostic Steps - Why Data Not Showing in UI

## Problem
Data exists on blockchain (confirmed by reports), but dashboard shows 0 for issuers/revokers/verifiers.

## Root Cause Analysis

### Possible Issues:
1. **RPC Errors**: The fetch functions are failing due to RPC errors ("no backend is currently healthy")
2. **Sync Failing Silently**: Even though sync is called, it fails and data never reaches DB
3. **Data in DB but APIs not returning**: Data exists but APIs filter it out incorrectly
4. **UI not refreshing**: Data is in DB but UI cache is stale

## Diagnostic Steps

### Step 1: Check Database Contents
Visit: `http://localhost:3000/api/debug/db-check`

This will show:
- What's actually in the database
- Counts of active vs total entities
- Whether `blockchain_verified` flags are set

### Step 2: Check API Responses
Open browser console and run:
```javascript
// Check what APIs are returning
Promise.all([
  fetch('/api/issuers').then(r => r.json()),
  fetch('/api/revokers').then(r => r.json()),
  fetch('/api/verifiers').then(r => r.json()),
]).then(([issuers, revokers, verifiers]) => {
  console.log('Issuers:', issuers.issuers?.length || 0)
  console.log('Revokers:', revokers.revokers?.length || 0)
  console.log('Verifiers:', verifiers.verifiers?.length || 0)
})
```

### Step 3: Check Server Logs
Look for:
- `[IssuersAPI] Returning X active issuers from database`
- `[BlockchainSync] Found X issuers on blockchain`
- `[BlockchainSync] 📊 Final DB count for university X: Y active issuers`

### Step 4: Manual Sync Trigger
Visit: `http://localhost:3000/admin/sync` and click "Full Sync"

Watch the logs for:
- Sync progress
- Errors during sync
- Final counts

## Fixes Applied

1. ✅ **Removed `blockchain_verified = true` requirement** from API endpoints
2. ✅ **Added chunking and retry logic** to fetch functions
3. ✅ **Added logging** to track sync progress
4. ✅ **Added diagnostic endpoint** (`/api/debug/db-check`)
5. ✅ **Improved error handling** in sync functions

## Next Steps

1. **Check `/api/debug/db-check`** - See what's actually in DB
2. **Check server logs** - See if sync is completing
3. **Trigger manual sync** - Force a full sync from admin page
4. **Check API responses** - Verify APIs are returning data

If data is in DB but not showing:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check browser console for errors

If data is NOT in DB:
- Check RPC connection
- Check server logs for sync errors
- Try manual sync from admin page
