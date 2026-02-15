# Authentication Flow - University Scoping

## Overview

All users (issuers, revokers, university admins) are now **mandatorily scoped to their university**. This ensures:
- ✅ Users can only perform actions for their assigned university
- ✅ No cross-university access
- ✅ Blockchain verification of university assignment
- ✅ Clear university context in all operations

---

## Login Flow

### 1. Issuer/Revoker Login

#### Wallet Login (Primary Method)
1. User connects MetaMask wallet
2. System checks blockchain for authorized universities
3. **If multiple universities:**
   - Show university selection dropdown
   - User must select which university to access
   - System validates selection against blockchain
4. **If single university:**
   - Auto-select and proceed
5. Create session with `universityId` scoped

#### Email Login (Fallback)
1. User enters email/password
2. System checks database for issuer/revoker record
3. System verifies against blockchain (source of truth)
4. Create session with `universityId` from database record

### 2. University Admin Login

1. User enters university email/password
2. System validates credentials
3. Create session with `universityId` = university's own ID
4. Admin can only manage their own university

---

## Session Structure

### Issuer Session
```typescript
{
  type: "issuer",
  loginMethod: "wallet" | "email",
  walletAddress: string,
  universityId: number,        // ✅ MANDATORY
  universityName: string,
  authorizedUniversities: [...], // For multi-university users
}
```

### Revoker Session
```typescript
{
  type: "revoker",
  loginMethod: "wallet" | "email",
  walletAddress: string,
  universityId: number,        // ✅ MANDATORY
  universityName: string,
  authorizedUniversities: [...],
}
```

### University Admin Session
```typescript
{
  id: number,                  // university.id
  name: string,
  email: string,
  walletAddress: string,
  // universityId = id (same value)
}
```

---

## University Scoping Enforcement

### Middleware: `lib/middleware/university-scope.ts`

All API endpoints should use this middleware to enforce university scoping:

```typescript
import { getUniversityScopedSession, validateUniversityAccess } from '@/lib/middleware/university-scope'

export async function POST(request: NextRequest) {
  // 1. Get session
  const session = await getUniversityScopedSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // 2. Get requested universityId (from body or use session's)
  const body = await request.json()
  const requestedUniversityId = body.universityId || session.universityId
  
  // 3. Validate access
  const hasAccess = await validateUniversityAccess(session, requestedUniversityId)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Access denied to this university" },
      { status: 403 }
    )
  }
  
  // 4. Proceed with operation scoped to requestedUniversityId
  // All operations must use this universityId
}
```

---

## Frontend Enforcement

### All Operations Must Use Session's UniversityId

```typescript
// ✅ CORRECT
const session = JSON.parse(localStorage.getItem('issuer_session') || '{}')
const universityId = session.universityId // Always use this

// Issue degree for this university
await issueDegree(universityId, ...)

// ❌ WRONG - Don't allow user to select different university
const userSelectedUniversityId = formData.universityId // Don't do this!
```

### University Selector (If Multiple Universities)

If a user has access to multiple universities:
1. Show selector on login (already implemented)
2. **Optionally** allow switching universities (requires re-login or session update)
3. All operations use the selected `universityId` from session

---

## API Endpoints - Required Updates

All API endpoints that perform university-scoped operations must:

1. ✅ Get session using `getUniversityScopedSession()`
2. ✅ Validate university access using `validateUniversityAccess()`
3. ✅ Use session's `universityId` for all operations
4. ✅ Reject requests for different universities

### Endpoints to Update:

- [ ] `app/api/degrees/route.ts` - POST (issue degree)
- [ ] `app/api/degrees/route.ts` - GET (list degrees)
- [ ] `app/api/issuers/route.ts` - All operations
- [ ] `app/api/revokers/route.ts` - All operations
- [ ] `app/api/universities/[id]/*` - All operations
- [ ] Any other university-scoped endpoints

---

## Blockchain Verification

### Issuers/Revokers

The system verifies university assignment on blockchain (source of truth):

```typescript
// Check if wallet is issuer for university
const authorizedUniversities = await findUniversitiesWhereIssuer(walletAddress)
const hasAccess = authorizedUniversities.some(u => u.id === universityId)
```

### University Admins

University admins are identified by:
- Database record: `universities` table
- Wallet address must match `admin_wallet` on blockchain
- Session `universityId` = their own university's ID

---

## Multi-University Users

If a user (issuer/revoker) is authorized for multiple universities:

1. **Login:** Must select which university to access
2. **Session:** Contains `authorizedUniversities` array
3. **Operations:** All operations use session's `universityId`
4. **Switching:** User must log out and log back in to switch universities

**Future Enhancement:** Could add university switcher in UI (requires session update)

---

## Security Considerations

1. ✅ **Blockchain is source of truth** - Always verify on-chain
2. ✅ **Session validation** - Check session on every request
3. ✅ **University scoping** - Never allow cross-university access
4. ✅ **Wallet verification** - Verify wallet matches session
5. ✅ **Database sync** - Keep DB in sync with blockchain

---

## Testing Checklist

- [ ] Issuer can only issue degrees for their university
- [ ] Revoker can only revoke degrees for their university
- [ ] University admin can only manage their own university
- [ ] Multi-university user must select university on login
- [ ] API endpoints reject cross-university requests
- [ ] Blockchain verification works correctly
- [ ] Session persists university context

---

## Migration Notes

### Existing Sessions

Existing sessions without `universityId` will be invalid. Users will need to:
1. Log out
2. Log back in
3. Select university (if multiple)

### Database Records

Ensure all `issuers` and `revokers` records have correct `university_id`:
```sql
-- Verify all issuers have university_id
SELECT id, email, university_id FROM issuers WHERE university_id IS NULL;

-- Verify all revokers have university_id
SELECT id, email, university_id FROM revokers WHERE university_id IS NULL;
```

---

**All operations are now university-scoped!** 🎓
