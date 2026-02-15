# 🔧 Fix Sync Issues - Debugging Guide

## Problem: Sync Returns "Added: 0, Updated: 0"

If your sync is completing but returning 0 results, follow these steps:

### Step 1: Run Debug Endpoint

**In browser console:**
```javascript
fetch('/api/sync/debug')
  .then(r => r.json())
  .then(data => {
    console.log('Debug Results:', data)
    console.log('Issues:', data.summary.issues)
  })
```

**Or via curl:**
```bash
curl http://localhost:3000/api/sync/debug | jq
```

This will show you:
- ✅ RPC connection status
- ✅ Contract address
- ✅ Universities found on blockchain
- ✅ Database connection
- ✅ Sync status table
- ✅ Chain events table

### Step 2: Check Common Issues

#### Issue 1: No Universities on Blockchain

**Symptom:** `blockchainUniversities.count: 0`

**Possible Causes:**
1. Contract address is wrong
2. No universities registered yet
3. Wrong network (not Base mainnet)

**Solution:**
```javascript
// Check contract address
console.log('Contract:', process.env.NEXT_PUBLIC_CORE_CONTRACT_ADDRESS)
// Should be: 0xBb51Dc84f0b35d3344f777543CA6549F9427B313
```

#### Issue 2: RPC Connection Failed

**Symptom:** `rpcConnection.success: false`

**Solution:**
- Check internet connection
- Verify RPC endpoint: `https://mainnet.base.org`
- Try alternative RPC if needed

#### Issue 3: Database Not Connected

**Symptom:** `databaseConnection.success: false`

**Solution:**
```bash
# Test database connection
psql -U postgres -d bubd -c "SELECT NOW();"
```

#### Issue 4: Missing Tables

**Symptom:** `syncStatus.success: false` or `chainEventsTable.success: false`

**Solution:**
```bash
# Run migration
psql -U postgres -d bubd -f scripts/024-create-chain-events-table.sql
```

### Step 3: Check Server Logs

Look for these messages in your server console:

```
[FullSync] Starting full blockchain sync...
[FullSync] Found X universities on blockchain
[FullSync] Syncing data for university Y...
[FullSync] Complete! Added: X, Updated: Y
```

**If you see errors:**
- Copy the full error message
- Check the stack trace
- Verify the contract address matches deployed contract

### Step 4: Manual Test

**Test fetching a single university:**
```javascript
// In browser console
const { fetchUniversityFromBlockchain } = await import('/lib/blockchain')
const uni = await fetchUniversityFromBlockchain(1)
console.log('University 1:', uni)
```

**If this fails:**
- Contract address is wrong
- RPC endpoint is down
- Network mismatch

### Step 5: Verify Contract on BaseScan

1. Go to: https://basescan.org/address/0xBb51Dc84f0b35d3344f777543CA6549F9427B313
2. Check "Contract" tab
3. Verify it's verified and matches your ABI
4. Check "Events" tab for recent activity

## Fixed Issues

### ✅ Fixed: 400 Bad Request Errors

**Problem:** `/api/sync`, `/api/issuers`, `/api/revokers` returning 400

**Solution Applied:**
- `/api/sync` now returns general status if no action specified
- `/api/issuers` and `/api/revokers` return empty arrays instead of 400 if no universityId

### ✅ Fixed: Better Error Messages

The sync endpoint now logs warnings when no universities are found, helping identify the root cause.

## Next Steps

1. **Run debug endpoint** to identify the issue
2. **Check server logs** for detailed error messages
3. **Verify contract address** in `.env`
4. **Test RPC connection** manually
5. **Check BaseScan** to confirm contract has data

## Still Not Working?

If sync still returns 0 after following this guide:

1. **Share debug output:**
   ```javascript
   fetch('/api/sync/debug').then(r => r.json()).then(console.log)
   ```

2. **Check server logs** for `[FullSync]` messages

3. **Verify contract has data:**
   - Visit BaseScan
   - Check for `UniversityRegistered` events
   - Verify universities exist on-chain

---

**The debug endpoint (`/api/sync/debug`) is your best friend for diagnosing sync issues!**
