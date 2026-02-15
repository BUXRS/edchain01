# 🔐 Enterprise Authentication & Authorization Refactor - Implementation Plan

## ✅ Completed

1. **Fixed Password Hashing**
   - ✅ Replaced SHA-256 with bcrypt (enterprise standard)
   - ✅ Added legacy SHA-256 support for migration
   - ✅ Updated `lib/auth.ts` with proper bcrypt implementation

2. **Removed Demo Data from University Login**
   - ✅ Removed `DEMO_UNIVERSITY` hardcoded login
   - ✅ Fixed to use `admin_email` and `admin_password_hash`
   - ✅ Added two-step security (authenticated ≠ authorized)
   - ✅ Returns `requiresWalletConnection` flag

3. **Created Authorization Resolver**
   - ✅ `lib/auth/authorization-resolver.ts` - Single source of truth
   - ✅ DB-first lookup + blockchain verification
   - ✅ Returns only confirmed authorized universities + roles
   - ✅ 30-second caching for performance

4. **Created Auth Middleware**
   - ✅ `lib/middleware/auth-guard.ts` - API route protection
   - ✅ Enforces two-step security model
   - ✅ Returns proper error codes (401, 403 WALLET_REQUIRED, 403 NOT_AUTHORIZED)

## 🚧 In Progress / Next Steps

### 1. Remove All Demo/Mock Data (Critical)
**Files to fix:**
- `app/api/auth/login/route.ts` - Remove DEMO_ADMIN
- `app/api/auth/issuer/login/route.ts` - Remove "issuer123" fallback
- `app/api/auth/verifier/login/route.ts` - Remove "verifier123" fallback
- `app/api/auth/revoker/login/route.ts` - Check for demo data
- `app/api/auth/setup/route.ts` - Remove auto-setup demo admin

**Action:** Remove all hardcoded credentials, demo logins, and fallback passwords.

### 2. Implement SIWE (Sign-In with Ethereum)
**New endpoints needed:**
- `GET /api/auth/siwe/nonce` - Generate nonce for signing
- `POST /api/auth/siwe/verify` - Verify signature and create session

**Action:** Implement standard SIWE flow for all stakeholders.

### 3. Fix Password Verification in All Login Endpoints
**Issue:** Some endpoints use wrong password comparison
- ✅ University login - Fixed
- ⚠️ Issuer login - Uses bcrypt but has demo fallback
- ⚠️ Verifier login - Uses bcrypt but has demo fallback
- ⚠️ Revoker login - Needs check

**Action:** Ensure all use `verifyPassword` from `lib/auth.ts` (no demo fallbacks).

### 4. Update All Login Endpoints to Use Authorization Resolver
**Files:**
- `app/api/auth/university/login-wallet/route.ts`
- `app/api/auth/issuer/login/route.ts`
- `app/api/auth/revoker/login/route.ts`
- `app/api/auth/verifier/login/route.ts`

**Action:** Replace direct blockchain calls with `resolveAuthorization()`.

### 5. Add Middleware to Protected API Routes
**Files to protect:**
- All `/api/issuers/*` routes
- All `/api/revokers/*` routes
- All `/api/verifiers/*` routes
- All `/api/universities/*` routes (except public)
- All `/api/degrees/*` routes (except public verify)

**Action:** Add `requireAuthorization()` middleware to all protected routes.

### 6. Implement Dashboard Gating
**Files:**
- `app/university/page.tsx`
- `app/issuer/page.tsx`
- `app/revoker/page.tsx`
- `app/verifier/page.tsx`

**Gating States:**
1. Not logged in → redirect `/auth/login`
2. Logged in, wallet not linked → Show "Connect Wallet" gate
3. Wallet linked, not authorized → Show "Not Authorized" gate
4. Wallet linked and authorized → Allow access (filtered by universities)

**Action:** Implement gating logic in all dashboard pages.

### 7. Remove Chain Reads from UI
**Search for:**
- `useReadContract`
- `readContract`
- `publicClient.readContract`
- `multicall` for reading
- Direct Reader/Core contract reads in components

**Action:** Replace with DB-backed API calls. Only allow chain reads for:
- Pre-tx sanity checks (right before sending transaction)
- Verify endpoint (backend only)

### 8. Create Wallet Accounts Table
**Schema needed:**
```sql
CREATE TABLE wallet_accounts (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  user_type VARCHAR(50) NOT NULL, -- 'university', 'issuer', 'revoker', 'verifier'
  user_id INTEGER NOT NULL,
  university_id INTEGER,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  blockchain_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Action:** Create migration and update wallet linking to use this table.

### 9. University Selector for Multi-University Users
**Implementation:**
- If user has 1 university → auto-select
- If user has multiple → show selector
- Store selected university in session
- Filter all data by selected university

**Action:** Add university selector component and update all data fetching.

### 10. DB-Driven Transaction Confirmation
**Current:** UI polls blockchain for confirmation
**Required:** UI polls DB endpoints, indexer updates DB from events

**Action:** 
- Update transaction registration endpoint
- Update UI to poll DB endpoints instead of chain
- Ensure indexer updates materialized state

## 📋 Testing Checklist

- [ ] Admin can login with email/password
- [ ] University admin can login with email/password
- [ ] University admin can login with wallet (SIWE)
- [ ] Issuer can login with email/password
- [ ] Issuer can login with wallet (SIWE)
- [ ] Revoker can login with email/password
- [ ] Revoker can login with wallet (SIWE)
- [ ] Verifier can login with email/password
- [ ] Verifier can login with wallet (SIWE)
- [ ] Dashboard gates properly (not logged in → redirect)
- [ ] Dashboard gates properly (no wallet → show connect)
- [ ] Dashboard gates properly (not authorized → show error)
- [ ] Dashboard shows only authorized universities
- [ ] Multi-university users see selector
- [ ] API routes return 401 for unauthenticated
- [ ] API routes return 403 WALLET_REQUIRED for no wallet
- [ ] API routes return 403 NOT_AUTHORIZED for unauthorized
- [ ] UI renders from DB APIs only (no chain reads)
- [ ] Transactions confirmed via DB updates (not chain reads)

## 🎯 Priority Order

1. **Critical (Do First):**
   - Remove all demo/mock data
   - Fix password verification everywhere
   - Add middleware to critical API routes

2. **High Priority:**
   - Implement SIWE
   - Update login endpoints to use authorization resolver
   - Implement dashboard gating

3. **Medium Priority:**
   - Remove chain reads from UI
   - Create wallet_accounts table
   - University selector

4. **Lower Priority:**
   - DB-driven transaction confirmation (if not already working)
   - Additional caching optimizations

---

**Status:** Foundation complete (authorization resolver + middleware). Continuing with demo data removal and SIWE implementation.
