# Implementation Plan - Architecture Requirements

## ✅ Completed Actions

### 1. Added OpenSea Buttons
- ✅ `app/admin/degrees/page.tsx` - Added OpenSea button
- ✅ `app/university/degrees/page.tsx` - Added OpenSea button  
- ✅ `app/issuer/history/page.tsx` - Added OpenSea button
- ✅ `app/issuer/issue/page.tsx` - Added OpenSea button
- ✅ `app/verify/page.tsx` - Already has OpenSea (verified)

### 2. Created Utility Functions
- ✅ `lib/utils/blockchain-links.ts` - Centralized link generation
- ✅ `lib/contracts/contract-manager.ts` - Contract upgrade support

### 3. Fixed Dropdown Menu
- ✅ Added "View Details" option
- ✅ Fixed onClick handlers
- ✅ Improved error handling

---

## 🔄 Remaining Tasks

### Task 1: Add OpenSea to Remaining Pages

**Files to update:**
- [ ] `app/revoker/history/page.tsx` - Add OpenSea for token links (if tokenId available)
- [ ] `app/revoker/search/page.tsx` - Add OpenSea button (if applicable)
- [ ] Any other pages with BaseScan links

**Note:** OpenSea is for NFTs (tokenId), not transactions. Only add where tokenId is available.

### Task 2: Implement Blockchain-First Pattern

**Current Status:** Partially implemented
- ✅ `lib/services/blockchain-sync.ts` exists
- ⚠️ Some API routes still read from DB first

**Files to update:**
- [ ] `app/api/universities/route.ts` - Ensure blockchain-first
- [ ] `app/api/degrees/route.ts` - Ensure blockchain-first
- [ ] All API routes that read data

**Pattern to follow:**
```typescript
// ✅ CORRECT
async function getData(id: number) {
  // 1. Try blockchain first
  const blockchainData = await fetchFromBlockchain(id)
  if (blockchainData) {
    // 2. Sync to DB (async, don't block)
    syncToDatabase(blockchainData).catch(console.error)
    return blockchainData
  }
  // 3. Fallback to DB only if blockchain unavailable
  return await getFromDatabase(id)
}
```

### Task 3: Implement Simultaneous Sync

**Current Status:** Partially implemented
- ✅ Transaction manager exists
- ⚠️ Need to ensure all blockchain transactions trigger immediate DB sync

**Files to update:**
- [ ] `app/issuer/issue/page.tsx` - Ensure DB sync after blockchain transaction
- [ ] `app/revoker/search/page.tsx` - Ensure DB sync after revocation
- [ ] All places that write to blockchain

**Pattern to follow:**
```typescript
// ✅ CORRECT
async function performAction(data) {
  // 1. Execute blockchain transaction
  const tx = await contract.action(data)
  await tx.wait() // Wait for confirmation
  
  // 2. Immediately sync to DB
  await syncToDatabase({
    txHash: tx.hash,
    blockNumber: tx.blockNumber,
    ...data
  })
  
  return { success: true, txHash: tx.hash }
}
```

### Task 4: Add WebSocket Support for Real-time Updates

**Current Status:** Not implemented

**Implementation needed:**
- [ ] Create WebSocket service for blockchain event monitoring
- [ ] Listen to contract events (DegreeIssued, DegreeRevoked, etc.)
- [ ] Auto-sync to DB when events detected
- [ ] Push updates to frontend via WebSocket

**Files to create:**
- `lib/services/websocket-service.ts`
- `app/api/ws/route.ts` (or similar)

### Task 5: Ensure Issuer-Revoker Symmetry

**Current Status:** Need to verify

**Checklist:**
- [ ] Compare `app/issuer/*` with `app/revoker/*`
- [ ] Compare `app/api/issuers/*` with `app/api/revokers/*`
- [ ] Compare issuer hooks with revoker hooks
- [ ] Ensure identical functionality

**Files to review:**
- `app/issuer/issue/page.tsx` ↔ `app/revoker/search/page.tsx`
- `app/issuer/history/page.tsx` ↔ `app/revoker/history/page.tsx`
- `hooks/use-contract.ts` - issuer vs revoker functions

### Task 6: Add Contract Upgrade Support to .env

**Update `.env.local` and `.env.example`:**
```env
# Current contract (v1)
NEXT_PUBLIC_UNIVERSITY_REGISTRY_MAINNET=0xA54B9CAEb99217ea80F109204194E179B2502e38

# Future contract (v2) - optional
# NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2=0xNewContractAddress

# Base RPC URL (for contract manager)
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

---

## 📋 Code Review Checklist

Before any modification, verify:

### Blockchain-First Check
- [ ] Does this read from blockchain first?
- [ ] Is database used only as cache/fallback?
- [ ] Are blockchain reads prioritized?

### Sync Check
- [ ] Do blockchain writes trigger immediate DB sync?
- [ ] Is sync handled asynchronously (non-blocking)?
- [ ] Are errors in sync handled gracefully?

### Protocol Choice Check
- [ ] Is WebSocket used for real-time updates?
- [ ] Is REST API used for standard operations?
- [ ] Is Webhook used for external notifications?

### Upgrade Support Check
- [ ] Does this work with contract address changes?
- [ ] Are new features detected before use?
- [ ] Is backward compatibility maintained?

### OpenSea Check
- [ ] Are BaseScan buttons paired with OpenSea?
- [ ] Is OpenSea only used for NFTs (not transactions)?

### Symmetry Check
- [ ] Are issuer changes mirrored in revoker?
- [ ] Is code structure identical?
- [ ] Are UI/UX consistent?

### Contract Compatibility Check
- [ ] Has smart contract ABI been reviewed?
- [ ] Will this conflict with contract logic?
- [ ] Has impact been analyzed?

---

## 🎯 Priority Implementation Order

1. **High Priority:**
   - ✅ Add OpenSea buttons (mostly done)
   - ⚠️ Ensure blockchain-first pattern everywhere
   - ⚠️ Fix simultaneous sync for all transactions

2. **Medium Priority:**
   - ⚠️ Add WebSocket support for real-time updates
   - ⚠️ Verify issuer-revoker symmetry
   - ⚠️ Test contract upgrade support

3. **Low Priority:**
   - ⚠️ Add contract versioning UI
   - ⚠️ Add feature detection UI
   - ⚠️ Add migration tools

---

## 🔍 Areas Needing Immediate Attention

### 1. API Routes - Blockchain First
**Files to fix:**
- `app/api/universities/route.ts` - Currently tries DB first
- `app/api/degrees/route.ts` - Need to check
- Other data-fetching routes

### 2. Transaction Sync
**Files to fix:**
- `app/issuer/issue/page.tsx` - Check if DB sync happens
- `app/revoker/search/page.tsx` - Check if DB sync happens
- All blockchain write operations

### 3. Issuer-Revoker Comparison
**Need to verify:**
- Are all issuer features available for revokers?
- Is the code structure identical?
- Are there any discrepancies?

---

## 📝 Next Steps

1. **Review current implementation** against requirements
2. **Fix blockchain-first pattern** in API routes
3. **Add WebSocket support** for real-time sync
4. **Verify issuer-revoker symmetry**
5. **Test contract upgrade scenarios**

---

**All future modifications must follow these requirements!** 🔗
