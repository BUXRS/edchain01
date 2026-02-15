# 🔄 Comprehensive DB-First Architecture Refactoring

## Goal
Refactor ALL pages to use DB-backed APIs instead of direct blockchain reads, following the same pattern as universities.

## Current Status

### ✅ Already DB-First (No Changes Needed)
- `app/admin/page.tsx` - Uses `/api/universities`, `/api/degrees`, etc.
- `app/admin/universities/page.tsx` - ✅ Just fixed to use `/api/universities`
- `app/university/degrees/page.tsx` - Uses `/api/degrees`
- `app/graduate/dashboard/page.tsx` - Uses `/api/degrees?studentAddress=`
- `app/verify/page.tsx` - Uses `/api/verify/degree/:tokenId`

### ❌ Still Reading from Blockchain (Need Refactoring)

#### Admin Pages
1. **`app/admin/reports/page.tsx`** - Uses `fetchAllUniversities()`, `fetchTotalSupply()`, etc.
2. **`app/admin/sync/page.tsx`** - Uses `fetchAllUniversities()`, `fetchTotalSupply()` (but this is OK - it's a sync status page)

#### University Pages
3. **`app/university/page.tsx`** - Uses `checkIsUniversityAdmin()` (OK - pre-tx check)
4. **`app/university/issuers/page.tsx`** - Likely uses blockchain reads
5. **`app/university/revokers/page.tsx`** - Likely uses blockchain reads
6. **`app/university/verifiers/page.tsx`** - Likely uses blockchain reads

#### Issuer Pages
7. **`app/issuer/page.tsx`** - Likely uses blockchain reads
8. **`app/issuer/issue/page.tsx`** - Likely uses blockchain reads

#### Revoker Pages
9. **`app/revoker/page.tsx`** - Likely uses blockchain reads
10. **`app/revoker/search/page.tsx`** - Likely uses blockchain reads

#### Verifier Pages
11. **`app/verifier/page.tsx`** - Likely uses blockchain reads
12. **`app/verifier/degree-requests/page.tsx`** - Likely uses blockchain reads
13. **`app/verifier/revocation-requests/page.tsx`** - Likely uses blockchain reads
14. **`app/verifier/history/page.tsx`** - Likely uses blockchain reads

#### Graduate Pages
15. **`app/graduate/share/page.tsx`** - Likely uses blockchain reads

## Refactoring Pattern

### Step 1: Replace Blockchain Reads with API Calls

**Before:**
```typescript
const universities = await getAllUniversities() // ❌ Direct blockchain read
```

**After:**
```typescript
const { data } = useSWR("/api/universities", fetcher) // ✅ DB-backed API
const universities = data?.universities || []
```

### Step 2: Map Database Schema to UI Types

**Database Schema:**
- `blockchain_id` → `id` (BigInt)
- `name_en` → `nameEn`
- `name_ar` → `nameAr`
- `admin_wallet` → `admin`
- `is_active` → `isActive`

### Step 3: Handle Sync Metadata

All API responses include sync metadata:
```typescript
{
  universities: [...],
  sync: {
    lastSyncedBlock: 12345,
    syncedAt: "2026-01-25T...",
    indexerRunning: true
  }
}
```

## Implementation Order

1. ✅ Fix degrees page error (DONE)
2. ✅ Fix universities page (DONE)
3. 🔄 Fix admin reports page
4. 🔄 Fix university issuer/revoker/verifier pages
5. 🔄 Fix issuer/revoker/verifier pages
6. 🔄 Fix graduate share page

## API Endpoints Available

- `/api/universities` - All universities (DB-backed)
- `/api/degrees` - All degrees (DB-backed)
- `/api/issuers?universityId=X` - Issuers for university (DB-backed)
- `/api/revokers?universityId=X` - Revokers for university (DB-backed)
- `/api/verifiers?universityId=X` - Verifiers for university (DB-backed)
- `/api/verify/degree/:tokenId` - Verify specific degree (DB + on-chain check)

## Notes

- **Pre-transaction checks** (like `checkIsUniversityAdmin`) are OK - they're sanity checks before sending transactions
- **Sync status pages** can read from blockchain for comparison purposes
- **All rendering/list pages** must use DB-backed APIs
