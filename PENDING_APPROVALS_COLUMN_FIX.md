# ✅ Pending Approvals Column Fix

## Problem

**Error:**
```
Error fetching approvals: Error: Error connecting to database: column pa.created_at does not exist
```

## Root Cause

The `pending_approvals` table schema uses `requested_at`, not `created_at`:

```sql
CREATE TABLE pending_approvals (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  requester_email VARCHAR(255),
  requester_name VARCHAR(255),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- ✅ Correct column name
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(42),
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

But the query in `lib/db.ts` was using `pa.created_at` (which doesn't exist).

## Solution Applied

### 1. Fixed `lib/db.ts` - `getPendingApprovals()` function

**Changed:**
- `ORDER BY pa.created_at DESC` → `ORDER BY pa.requested_at DESC`

**All 4 query branches fixed:**
- ✅ `universityId && status` case
- ✅ `universityId` only case
- ✅ `status` only case
- ✅ No filters case

### 2. Fixed `app/admin/pending/page.tsx` - Frontend mapping

**Changed:**
```typescript
// Before:
requestedAt: new Date(a.created_at),

// After:
requestedAt: new Date(a.requested_at || a.created_at),
```

Added fallback for backward compatibility (in case old data exists).

## Expected Behavior After Fix

**Server Logs Should Show:**
- No more `column pa.created_at does not exist` errors
- `/api/approvals?status=pending` returns data successfully

**Frontend Should:**
- Display pending approvals correctly
- Show correct `requestedAt` timestamps

---

**Status**: ✅ Fixed  
**Date**: 2026-01-25  
**Files Changed**: 
- `lib/db.ts`
- `app/admin/pending/page.tsx`
