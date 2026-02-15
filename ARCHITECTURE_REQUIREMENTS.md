# Architecture Requirements - Critical Guidelines

## 🎯 Core Principles

### 1. Blockchain as Source of Truth
**MANDATORY:** The blockchain smart contract is the **FIRST and PRIMARY source of truth** for all data in this application.

- ✅ All data reads should prioritize blockchain first
- ✅ Database is a cache/mirror of blockchain data
- ✅ Blockchain state always takes precedence over database state
- ✅ Any conflicts between blockchain and DB → blockchain wins

### 2. Simultaneous Blockchain-DB Sync
**MANDATORY:** Any change in the smart contract must be reflected and synced to the database **simultaneously**.

- ✅ Transaction events must trigger immediate DB updates
- ✅ Use event listeners/webhooks to catch blockchain changes
- ✅ Implement transaction confirmation → DB update flow
- ✅ Ensure atomic operations where possible

### 3. Communication Protocol Selection
**MANDATORY:** Choose communication method based on best performance and transaction requirements.

**Decision Matrix:**
- **WebSockets:** Real-time updates, live data streams, instant notifications
- **REST API:** Standard CRUD operations, simple queries, one-time requests
- **Webhooks:** External notifications, async callbacks, third-party integrations

**Guidelines:**
- Use WebSockets for: Live blockchain event monitoring, real-time status updates
- Use REST API for: Standard operations, data fetching, form submissions
- Use Webhooks for: Stripe payments, external service notifications

### 4. Smart Contract Upgrade Support
**MANDATORY:** Backend must be ready for smart contract upgrades and new deployments.

**Requirements:**
- ✅ Support multiple contract addresses
- ✅ ✅ Support contract versioning
- ✅ Handle new features gracefully (backward compatibility)
- ✅ Environment variable for contract address (already implemented)
- ✅ ABI versioning support
- ✅ Feature detection (check if function exists before calling)

**Implementation:**
```typescript
// Support multiple contract versions
const CONTRACT_ADDRESSES = {
  v1: process.env.NEXT_PUBLIC_UNIVERSITY_REGISTRY_MAINNET,
  v2: process.env.NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2, // Future
}

// Feature detection
async function hasFeature(contract: Contract, feature: string): Promise<boolean> {
  try {
    return contract.interface.hasFunction(feature)
  } catch {
    return false
  }
}
```

### 5. BaseScan + OpenSea Buttons
**MANDATORY:** Wherever there's a BaseScan button for Web3 verification, add an OpenSea button beside it.

**Locations to check:**
- University detail pages
- Degree verification pages
- Transaction history
- NFT viewing pages

**Implementation:**
```tsx
<div className="flex gap-2">
  <Button asChild variant="outline">
    <a href={`https://basescan.org/tx/${txHash}`} target="_blank">
      <ExternalLink className="h-4 w-4 mr-2" />
      View on BaseScan
    </a>
  </Button>
  <Button asChild variant="outline">
    <a href={`https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${tokenId}`} target="_blank">
      <ExternalLink className="h-4 w-4 mr-2" />
      View on OpenSea
    </a>
  </Button>
</div>
```

### 6. Issuer-Revoker Symmetry
**MANDATORY:** Any changes to issuer methods, flows, or processes must be applied identically to the revoker side.

**Checklist before any modification:**
- [ ] Does this affect issuers?
- [ ] If yes, apply same change to revokers
- [ ] Keep code structure identical
- [ ] Keep UI/UX consistent
- [ ] Keep API endpoints similar
- [ ] Keep database schema aligned

**Files to update in pairs:**
- `app/issuer/*` ↔ `app/revoker/*`
- `app/api/issuers/*` ↔ `app/api/revokers/*`
- `lib/db.ts` - issuer functions ↔ revoker functions
- Components, hooks, services

### 7. Smart Contract Compatibility Check
**MANDATORY:** Before ANY modification, check smart contract compatibility.

**Pre-Implementation Checklist:**
- [ ] Review smart contract ABI for relevant functions
- [ ] Check if new feature conflicts with contract
- [ ] Verify transaction flow matches contract logic
- [ ] Ensure DB schema supports contract data
- [ ] Test backward compatibility
- [ ] Document impact on: Smart Contract, Database, App

**Impact Analysis Template:**
```
## Change: [Description]

### Smart Contract Impact:
- [ ] Requires contract change?
- [ ] New function needed?
- [ ] Breaking change?
- [ ] Migration required?

### Database Impact:
- [ ] Schema change needed?
- [ ] New tables/columns?
- [ ] Migration script?
- [ ] Data sync required?

### App Impact:
- [ ] UI changes?
- [ ] API changes?
- [ ] Breaking changes?
- [ ] User flow affected?

### Recommendations:
[Expert advice on best approach]
```

---

## 📋 Implementation Guidelines

### Blockchain-First Data Flow

```typescript
// ✅ CORRECT: Read from blockchain first
async function getUniversity(id: number) {
  // 1. Try blockchain first
  const blockchainData = await fetchUniversityFromBlockchain(id)
  if (blockchainData) {
    // 2. Sync to DB (async, don't block)
    syncToDatabase(blockchainData).catch(console.error)
    return blockchainData
  }
  
  // 3. Fallback to DB only if blockchain unavailable
  return await getUniversityFromDB(id)
}

// ❌ WRONG: Reading from DB first
async function getUniversity(id: number) {
  return await getUniversityFromDB(id) // Don't do this!
}
```

### Simultaneous Sync Pattern

```typescript
// ✅ CORRECT: Sync immediately after blockchain transaction
async function issueDegree(data) {
  // 1. Execute blockchain transaction
  const tx = await contract.issueDegree(...)
  await tx.wait() // Wait for confirmation
  
  // 2. Immediately sync to DB
  await syncDegreeToDatabase(tx.hash, data)
  
  // 3. Return success
  return { success: true, txHash: tx.hash }
}
```

### Contract Upgrade Support

```typescript
// ✅ CORRECT: Support multiple contract versions
export function getContract(version: 'v1' | 'v2' = 'v1'): Contract {
  const address = version === 'v2' 
    ? process.env.NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2 
    : process.env.NEXT_PUBLIC_UNIVERSITY_REGISTRY_MAINNET
    
  return new Contract(address, PROTOCOL_ABI, provider)
}

// Feature detection
async function useNewFeatureIfAvailable() {
  const contract = getContract('v2')
  if (await hasFeature(contract, 'newFunction')) {
    return await contract.newFunction()
  }
  // Fallback to old method
  return await contract.oldFunction()
}
```

---

## 🔍 Code Review Checklist

Before submitting any PR or making changes:

- [ ] **Blockchain First:** Does this read from blockchain first?
- [ ] **Sync Pattern:** Are blockchain changes synced to DB?
- [ ] **Protocol Choice:** Is the communication method optimal?
- [ ] **Upgrade Ready:** Will this work with contract upgrades?
- [ ] **OpenSea Button:** Are BaseScan buttons paired with OpenSea?
- [ ] **Symmetry:** Are issuer/revoker changes identical?
- [ ] **Contract Check:** Has smart contract compatibility been verified?
- [ ] **Impact Analysis:** Has impact on SC/DB/App been documented?

---

## 🚨 Breaking Change Protocol

If a change requires smart contract modification:

1. **Notify immediately** with impact analysis
2. **Propose migration strategy**
3. **Document backward compatibility approach**
4. **Create feature flags for gradual rollout**
5. **Test with both old and new contracts**

---

## 📝 Documentation Requirements

Every significant change must include:

1. **Smart Contract Impact:** What changes in the contract?
2. **Database Impact:** Schema changes, migrations needed?
3. **App Impact:** UI/UX changes, breaking changes?
4. **Migration Path:** How to upgrade existing data?
5. **Testing Strategy:** How to verify the change?

---

## 🎯 Priority Order

When implementing features:

1. **Smart Contract** - Define contract interface first
2. **Blockchain Integration** - Implement contract calls
3. **Database Sync** - Mirror blockchain data
4. **API Layer** - Expose data via REST/WebSocket
5. **UI Layer** - Display data to users

---

**Remember:** Blockchain is truth. Everything else is a mirror. 🔗
