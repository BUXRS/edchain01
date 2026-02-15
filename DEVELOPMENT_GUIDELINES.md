# Development Guidelines - Mandatory Requirements

## 🎯 Critical Architecture Principles

### 1. Blockchain is Source of Truth ✅

**MANDATORY:** All data reads must prioritize blockchain first.

**Implementation Pattern:**
```typescript
// ✅ CORRECT
async function getData(id: number) {
  // 1. Try blockchain FIRST
  const blockchainData = await fetchFromBlockchain(id)
  if (blockchainData) {
    // 2. Sync to DB (async, non-blocking)
    syncToDatabase(blockchainData).catch(console.error)
    return blockchainData
  }
  // 3. Fallback to DB ONLY if blockchain unavailable
  return await getFromDatabase(id)
}

// ❌ WRONG - Don't do this!
async function getData(id: number) {
  return await getFromDatabase(id) // Blockchain should come first!
}
```

**Files to check:**
- All API routes in `app/api/*`
- All data fetching functions
- All hooks that fetch data

---

### 2. Simultaneous Blockchain-DB Sync ✅

**MANDATORY:** Every blockchain transaction must trigger immediate DB sync.

**Implementation Pattern:**
```typescript
// ✅ CORRECT
async function performBlockchainAction(data) {
  // 1. Execute blockchain transaction
  const tx = await contract.action(data)
  const receipt = await tx.wait() // Wait for confirmation
  
  // 2. Immediately sync to DB (after confirmation)
  await syncToDatabase({
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    ...data
  })
  
  return { success: true, txHash: receipt.hash }
}
```

**Current Implementation:**
- ✅ `app/issuer/issue/page.tsx` - Syncs after transaction
- ⚠️ Need to verify all blockchain write operations

**Files to verify:**
- `app/issuer/issue/page.tsx`
- `app/revoker/search/page.tsx`
- `app/admin/universities/page.tsx`
- All places that write to blockchain

---

### 3. Communication Protocol Selection

**Decision Matrix:**

| Use Case | Protocol | Reason |
|----------|----------|--------|
| Real-time blockchain events | WebSocket | Instant updates, live monitoring |
| Standard CRUD operations | REST API | Simple, reliable, standard |
| External notifications | Webhook | Async callbacks, third-party |
| Live status updates | WebSocket | Real-time, low latency |
| One-time queries | REST API | Simple request/response |

**Current Status:**
- ✅ REST API - Implemented
- ⚠️ WebSocket - Not implemented (needed for real-time sync)
- ✅ Webhook - Implemented (Stripe)

**To Implement:**
- [ ] WebSocket service for blockchain event monitoring
- [ ] Real-time sync when blockchain events occur
- [ ] Push updates to frontend

---

### 4. Smart Contract Upgrade Support ✅

**MANDATORY:** App must support contract upgrades and new deployments.

**Implementation:**
- ✅ `lib/contracts/contract-manager.ts` - Created
- ✅ Environment variable support for v2 contract
- ✅ Feature detection functions

**Usage:**
```typescript
import { getContractInstance, hasContractFeature, useFeatureWithFallback } from '@/lib/contracts/contract-manager'

// Check if feature exists before using
const contract = getContractInstance('v1')
if (await hasContractFeature(contract, 'newFunction')) {
  await contract.newFunction()
} else {
  // Use old method
  await contract.oldFunction()
}

// Or use with automatic fallback
await useFeatureWithFallback(
  'newFunction',
  async (contract) => await contract.newFunction(),
  async () => await contract.oldFunction() // Fallback
)
```

**Environment Variables:**
```env
# Current contract (v1)
NEXT_PUBLIC_UNIVERSITY_REGISTRY_MAINNET=0xA54B9CAEb99217ea80F109204194E179B2502e38

# Future contract (v2) - optional
# NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2=0xNewContractAddress
```

---

### 5. BaseScan + OpenSea Buttons ✅

**MANDATORY:** Every BaseScan button must have an OpenSea button beside it.

**Status:**
- ✅ `app/verify/page.tsx` - Has both
- ✅ `app/admin/degrees/page.tsx` - Added OpenSea
- ✅ `app/university/degrees/page.tsx` - Added OpenSea
- ✅ `app/issuer/history/page.tsx` - Added OpenSea
- ✅ `app/issuer/issue/page.tsx` - Added OpenSea
- ⚠️ `app/revoker/history/page.tsx` - Check if tokenId available
- ⚠️ `app/revoker/search/page.tsx` - Check if applicable

**Implementation:**
```tsx
<div className="flex gap-2">
  <Button variant="outline" asChild>
    <a href={getBasescanTokenUrl(tokenId)} target="_blank">
      <ExternalLink className="h-4 w-4 mr-2" />
      View on BaseScan
    </a>
  </Button>
  <Button variant="outline" asChild>
    <a href={getOpenSeaUrl(tokenId)} target="_blank">
      <ExternalLink className="h-4 w-4 mr-2" />
      View on OpenSea
    </a>
  </Button>
</div>
```

**Note:** OpenSea is for NFTs (tokenId), not transactions. Only add where tokenId is available.

---

### 6. Issuer-Revoker Symmetry ✅

**MANDATORY:** Any change to issuer must be applied identically to revoker.

**Symmetry Checklist:**
- [ ] `app/issuer/*` ↔ `app/revoker/*` - Structure identical?
- [ ] `app/api/issuers/*` ↔ `app/api/revokers/*` - Logic identical?
- [ ] `lib/db.ts` - Issuer functions ↔ Revoker functions
- [ ] Components - Same UI/UX?
- [ ] Hooks - Same functionality?
- [ ] API endpoints - Same structure?

**Files to keep in sync:**
```
app/issuer/issue/page.tsx          ↔  app/revoker/search/page.tsx
app/issuer/history/page.tsx        ↔  app/revoker/history/page.tsx
app/api/issuers/route.ts           ↔  app/api/revokers/route.ts
app/api/issuers/register/route.ts ↔  app/api/revokers/register/route.ts
app/api/auth/issuer/login/route.ts ↔ app/api/auth/revoker/login/route.ts
```

**Before any modification:**
1. Identify if it affects issuers
2. If yes, apply same change to revokers
3. Keep code structure identical
4. Test both sides

---

### 7. Smart Contract Compatibility Check

**MANDATORY:** Before ANY modification, verify smart contract compatibility.

**Pre-Implementation Checklist:**

#### Step 1: Review Smart Contract ABI
- [ ] Check `lib/contracts/abi.ts` for relevant functions
- [ ] Understand contract function signatures
- [ ] Note any constraints or requirements

#### Step 2: Impact Analysis
- [ ] **Smart Contract Impact:**
  - Requires contract change?
  - New function needed?
  - Breaking change?
  - Migration required?

- [ ] **Database Impact:**
  - Schema change needed?
  - New tables/columns?
  - Migration script?
  - Data sync required?

- [ ] **App Impact:**
  - UI changes?
  - API changes?
  - Breaking changes?
  - User flow affected?

#### Step 3: Document & Notify
If any conflicts or issues found:
1. **STOP** implementation
2. **Document** the issue
3. **Notify** with:
   - What you're trying to do
   - What conflicts with smart contract
   - Impact on SC/DB/App
   - Recommendations for best approach

**Template:**
```markdown
## Change Request: [Description]

### Smart Contract Compatibility:
- ✅ Compatible / ⚠️ Requires changes / ❌ Conflicts

### Impact Analysis:
**Smart Contract:**
- [Impact details]

**Database:**
- [Impact details]

**Application:**
- [Impact details]

### Recommendations:
[Expert advice on best approach]

### Migration Strategy:
[If contract upgrade needed]
```

---

## 📋 Code Review Checklist

Before submitting any PR:

### Blockchain-First
- [ ] Reads from blockchain first
- [ ] Database used only as cache/fallback
- [ ] Blockchain state takes precedence

### Sync Pattern
- [ ] Blockchain writes trigger DB sync
- [ ] Sync is immediate (after confirmation)
- [ ] Errors handled gracefully

### Protocol Choice
- [ ] WebSocket for real-time updates
- [ ] REST API for standard operations
- [ ] Webhook for external notifications

### Upgrade Support
- [ ] Works with contract address changes
- [ ] Feature detection before use
- [ ] Backward compatibility maintained

### OpenSea Buttons
- [ ] BaseScan buttons have OpenSea beside them
- [ ] OpenSea only for NFTs (not transactions)

### Symmetry
- [ ] Issuer changes mirrored in revoker
- [ ] Code structure identical
- [ ] UI/UX consistent

### Contract Check
- [ ] Smart contract ABI reviewed
- [ ] No conflicts with contract logic
- [ ] Impact analyzed and documented

---

## 🚨 Breaking Change Protocol

If change requires smart contract modification:

1. **STOP** - Don't proceed
2. **ANALYZE** - Document impact
3. **NOTIFY** - Share findings
4. **WAIT** - Get approval
5. **IMPLEMENT** - With migration strategy

---

## 📝 Documentation Requirements

Every significant change must include:

1. **Smart Contract Impact**
2. **Database Impact**
3. **App Impact**
4. **Migration Path** (if needed)
5. **Testing Strategy**

---

## 🎯 Priority Implementation

1. **High Priority:**
   - ✅ Blockchain-first pattern (partially done)
   - ✅ Simultaneous sync (partially done)
   - ✅ OpenSea buttons (mostly done)

2. **Medium Priority:**
   - ⚠️ WebSocket support for real-time updates
   - ⚠️ Verify issuer-revoker symmetry
   - ⚠️ Test contract upgrade scenarios

3. **Low Priority:**
   - ⚠️ Contract versioning UI
   - ⚠️ Feature detection UI

---

**Remember:** Blockchain is truth. Everything else is a mirror. 🔗
