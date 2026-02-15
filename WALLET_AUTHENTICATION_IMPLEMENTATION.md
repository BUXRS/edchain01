# Wallet Authentication Implementation

## Overview
This document describes the complete wallet authentication flow for university admins, ensuring that:
1. After activation, the wallet address is stored in the database
2. University admins can login with email/password OR wallet
3. After password login, wallet connection is required
4. Connected wallet must match the activated wallet
5. Dashboard enforces wallet verification before allowing transactions

## Database Schema

### Migration: `scripts/024-add-tx-hash-to-universities.sql`
- Adds `tx_hash` column to `universities` table
- Stores transaction hash from blockchain registration
- Creates index for efficient lookups

## Authentication Flow

### 1. Password Login Flow

**Endpoint:** `POST /api/auth/university/login`

**Process:**
1. User enters email/password
2. System validates credentials against database
3. System checks if wallet address exists in database
4. **If wallet exists:**
   - Returns `requiresWalletConnection: true`
   - Returns `activatedWalletAddress` (the wallet that was activated)
   - Frontend prompts user to connect wallet
5. **If no wallet:**
   - Returns `requiresWalletConnection: false`
   - User can access dashboard (but cannot perform transactions)

**Response (with wallet):**
```json
{
  "success": true,
  "university": { ... },
  "requiresWalletConnection": true,
  "activatedWalletAddress": "0x...",
  "message": "Please connect your MetaMask wallet..."
}
```

### 2. Wallet Verification Flow

**Endpoint:** `POST /api/auth/university/verify-wallet`

**Process:**
1. User connects MetaMask wallet after password login
2. Frontend calls verify-wallet endpoint with:
   - `email`: University admin email
   - `connectedWalletAddress`: Currently connected wallet
3. Backend:
   - Gets university from database
   - Compares connected wallet with activated wallet
   - Verifies wallet is registered as admin on blockchain
   - Verifies blockchain university ID matches database ID
4. **If all checks pass:**
   - Creates final session
   - Redirects to dashboard
5. **If wallet doesn't match:**
   - Returns error with both wallet addresses
   - User must connect correct wallet

**Response (success):**
```json
{
  "success": true,
  "message": "Wallet verified successfully",
  "university": { ... }
}
```

**Response (error):**
```json
{
  "error": "The connected wallet does not match your registered admin wallet",
  "activatedWalletAddress": "0x...",
  "connectedWalletAddress": "0x..."
}
```

### 3. Wallet-Only Login Flow

**Endpoint:** `POST /api/auth/university/login-wallet`

**Process:**
1. User clicks "Login with Wallet"
2. MetaMask prompts for connection
3. Frontend sends wallet address to API
4. Backend:
   - Checks blockchain for university admin registration
   - Gets additional data from database (if available)
   - Creates session
5. User is redirected to dashboard

## Dashboard Enforcement

### Wallet Verification Logic

**File:** `app/university/page.tsx`

**Checks:**
1. `walletConnected`: Wallet is connected and on correct chain
2. `isAdmin`: Wallet is admin on blockchain
3. `connectedWalletMatches`: Connected wallet matches activated wallet from session
4. `university?.isActive`: University is active

**Access Levels:**
- **View Only**: User logged in via password (no wallet or wrong wallet)
- **Full Access**: Wallet connected, verified, and matches activated wallet

### UI Indicators

1. **Wallet Connection Required** (Amber Card):
   - Shows when user is logged in but wallet not connected
   - Displays activated wallet address (if available)
   - "Connect MetaMask" button

2. **Wrong Wallet Warning** (Red Alert):
   - Shows when connected wallet doesn't match activated wallet
   - Displays both wallet addresses
   - "Refresh Page" button

3. **Transaction Restrictions**:
   - Actions requiring blockchain transactions are disabled if wallet not verified
   - Clear error messages guide user to connect correct wallet

## Activation Process

**File:** `app/api/admin/universities/[id]/activate/route.ts`

**Process:**
1. Super Admin activates university
2. Frontend calls `registerUniversity` on blockchain
3. Gets `universityId` and `txHash` from transaction
4. Calls activation API with:
   - `walletAddress`: The wallet submitted by university admin
   - `blockchainId`: University ID from blockchain
   - `txHash`: Transaction hash
5. Backend:
   - Updates `wallet_address` in database
   - Updates `blockchain_id`
   - Updates `tx_hash`
   - Sets `status = 'active'`
   - Sets `is_active = true`
   - Verifies update was successful

**Database Update:**
```sql
UPDATE universities
SET 
  wallet_address = ${finalWalletAddress.toLowerCase()},
  is_active = true,
  status = 'active',
  blockchain_id = ${blockchainId},
  blockchain_verified = true,
  tx_hash = ${txHash},
  last_synced_at = NOW(),
  sync_status = 'synced',
  updated_at = NOW()
WHERE id = ${id}
```

## Security Considerations

1. **Blockchain as Source of Truth**:
   - All wallet verifications check blockchain first
   - Database is used for additional metadata only

2. **Wallet Matching**:
   - Strict comparison of wallet addresses (case-insensitive)
   - No fallback if wallet doesn't match

3. **Session Management**:
   - Sessions include wallet address
   - Wallet verification required for sensitive operations

4. **Error Messages**:
   - Clear, actionable error messages
   - Shows both expected and actual wallet addresses

## Testing Checklist

- [ ] Password login without wallet → Shows wallet connection prompt
- [ ] Password login with wallet → Wallet verification required
- [ ] Wallet login → Direct access if wallet is admin
- [ ] Wrong wallet connected → Shows error, blocks transactions
- [ ] Correct wallet connected → Full access granted
- [ ] Activation stores wallet address correctly
- [ ] Dashboard enforces wallet verification
- [ ] Transaction buttons disabled without verified wallet

## Files Modified

1. `scripts/024-add-tx-hash-to-universities.sql` - Database migration
2. `app/api/auth/university/login/route.ts` - Password login with wallet requirement
3. `app/api/auth/university/verify-wallet/route.ts` - Wallet verification endpoint
4. `app/(auth)/university/login/page.tsx` - Login UI with wallet verification
5. `app/university/page.tsx` - Dashboard wallet enforcement
6. `app/api/admin/universities/[id]/activate/route.ts` - Activation with wallet storage

---

**Status**: ✅ **COMPLETE**  
**Date**: 2024-01-23
