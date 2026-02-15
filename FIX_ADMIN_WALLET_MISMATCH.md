# 🔧 Fix Admin Wallet Mismatch - Complete Guide

## 🔍 Root Cause

**The Problem:**
- Database has `wallet_address = 0x70fc...8017` for USA University
- Blockchain shows this wallet as an **"issuer"**, NOT as an **"admin"**
- This means the database `wallet_address` doesn't match the blockchain `admin` wallet

**Why It Happened:**
1. University was registered on blockchain with a different admin wallet
2. Database `wallet_address` was set to a different wallet (possibly an issuer wallet)
3. The `admin_wallet` field wasn't being synced from blockchain
4. System checks blockchain as source of truth → wallet is issuer, not admin → access denied

---

## ✅ Solution Implemented

### 1. **Fixed Sync Operations**
All sync operations now properly set `admin_wallet` from blockchain:
- ✅ `lib/services/blockchain-sync.ts` - Sets `admin_wallet` when syncing
- ✅ `app/api/admin/universities/[id]/sync/route.ts` - Syncs `admin_wallet` from blockchain
- ✅ `app/api/admin/universities/[id]/activate/route.ts` - Sets `admin_wallet` on activation

### 2. **Fixed Verification Logic**
- ✅ `app/api/auth/university/verify-wallet/route.ts` - Uses `admin_wallet` as source of truth
- ✅ `app/api/auth/university/login/route.ts` - Uses blockchain admin wallet in session

### 3. **New Fix Endpoint**
- ✅ `app/api/admin/universities/[id]/fix-admin-wallet/route.ts` - Manually sync admin wallet from blockchain

---

## 🚀 How to Fix Your Current Data

### Step 1: Find the Blockchain Admin Wallet

Check what the actual admin wallet is on blockchain for USA University:

**Option A: Via API**
```bash
# In browser console or API call
POST /api/admin/universities/1/sync
# This will sync and show the blockchain admin wallet
```

**Option B: Via Database Query**
```sql
-- Check current state
SELECT 
  id, 
  blockchain_id, 
  name, 
  wallet_address, 
  admin_wallet,
  blockchain_verified
FROM universities 
WHERE id = 1; -- USA University
```

**Option C: Check Blockchain Directly**
```javascript
// In browser console
const { fetchUniversityFromBlockchain } = await import('@/lib/blockchain')
const uni = await fetchUniversityFromBlockchain(1) // University blockchain_id
console.log('Blockchain Admin:', uni.admin)
console.log('Your Wallet:', '0x70fc8cd8069ac823e30099ea9b661e6620e08017')
console.log('Match?', uni.admin.toLowerCase() === '0x70fc8cd8069ac823e30099ea9b661e6620e08017'.toLowerCase())
```

### Step 2: Sync from Blockchain

**Option A: Use Sync Endpoint (Recommended)**
```bash
POST /api/admin/universities/1/sync
# This will automatically update admin_wallet from blockchain
```

**Option B: Use Fix Endpoint**
```bash
POST /api/admin/universities/1/fix-admin-wallet
# This specifically fixes the admin_wallet mismatch
```

**Option C: Manual SQL Update (If you know the blockchain admin)**
```sql
-- Replace '0x<blockchain_admin>' with actual blockchain admin wallet
UPDATE universities
SET 
  admin_wallet = '0x<blockchain_admin>',
  wallet_address = '0x<blockchain_admin>', -- Also update for consistency
  blockchain_verified = true,
  last_synced_at = NOW(),
  updated_at = NOW()
WHERE id = 1;
```

### Step 3: Verify the Fix

```sql
-- Check that admin_wallet matches blockchain
SELECT 
  id,
  blockchain_id,
  name,
  wallet_address,
  admin_wallet,
  blockchain_verified
FROM universities 
WHERE id = 1;

-- admin_wallet should now match the blockchain admin
```

### Step 4: Test Login

1. **Clear browser cache and refresh**
2. **Log in** with email/password to USA University
3. **Connect wallet** - Use the blockchain admin wallet (not the issuer wallet)
4. **Should now work** - System will recognize you as admin

---

## 🎯 Key Points

1. **Blockchain is Source of Truth**: The `admin_wallet` field must match `university.admin` on blockchain
2. **Two Wallet Fields**:
   - `admin_wallet` = Blockchain admin wallet (source of truth)
   - `wallet_address` = Should match `admin_wallet` (for backward compatibility)
3. **If Wallet is Issuer, Not Admin**: The wallet `0x70fc...8017` is an issuer, not the admin. You need to:
   - Find the actual blockchain admin wallet
   - Use that wallet to login
   - OR update the blockchain to make `0x70fc...8017` the admin (requires blockchain transaction)

---

## 🔄 Prevention

The sync operations are now fixed, so future syncs will:
- ✅ Automatically set `admin_wallet` from blockchain
- ✅ Keep database in sync with blockchain
- ✅ Prevent this mismatch from happening again

---

## 📋 Summary

**Root Cause**: Database `wallet_address` didn't match blockchain `admin` wallet

**Fix**: 
1. Sync operations now set `admin_wallet` from blockchain
2. Verification uses `admin_wallet` as source of truth
3. New endpoint to manually fix mismatches

**Action Required**:
1. Sync USA University from blockchain to update `admin_wallet`
2. Use the blockchain admin wallet (not the issuer wallet) to login
3. Or update blockchain to make your wallet the admin

---

**Status**: ✅ Root cause fixed - Database now properly syncs `admin_wallet` from blockchain
