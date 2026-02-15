# Smart Contract Upgrade Guide - Verifier Stage

## 🎯 Overview

This guide explains how to upgrade from the current smart contract to the new contract with "verifier stage" functionality for issuing and revoking degrees.

---

## 📋 Pre-Implementation Checklist

Before starting, ensure you have:

- [ ] New contract address (deployed on Base Mainnet)
- [ ] Complete ABI for new contract
- [ ] Understanding of verifier stage workflow
- [ ] Function signatures for all new functions
- [ ] Event signatures for all new events
- [ ] Migration strategy for existing data

---

## 🔍 What I Need From You

### Critical Information:

1. **New Contract Address**
   ```
   NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2=0x...
   ```

2. **Complete ABI** (JSON format)
   - All function signatures
   - All event signatures
   - All struct/interface definitions

3. **Verifier Stage Workflow**
   - How does verifier stage work?
   - What's the flow: Issue → Verify → Complete?
   - Who can be a verifier?
   - How are verifiers managed?

4. **Function Signatures**
   ```solidity
   // Example - please provide actual signatures
   function issueDegree(...) returns (uint256);
   function verifyIssue(uint256 tokenId) returns (bool);
   function revokeDegree(uint256 tokenId);
   function verifyRevoke(uint256 tokenId) returns (bool);
   ```

5. **Event Signatures**
   ```solidity
   // Example - please provide actual events
   event IssueVerified(uint256 indexed tokenId, address indexed verifier);
   event RevokeVerified(uint256 indexed tokenId, address indexed verifier);
   ```

---

## 🚀 Implementation Steps (Once Info Provided)

### Step 1: Environment Setup
- Update `.env.local` with new contract address
- Keep old address for fallback if needed

### Step 2: ABI Update
- Add new ABI to `lib/contracts/abi.ts`
- Support both v1 and v2 ABIs
- Add feature detection

### Step 3: Database Schema
- Add verifier-related columns to `degrees` table
- Create `verifiers` table (if needed)
- Add migration script

### Step 4: Contract Manager
- Update `lib/contracts/contract-manager.ts`
- Add verifier function detection
- Support graceful fallback

### Step 5: Hook Updates
- Update `hooks/use-contract.ts`
- Add verifier functions
- Update issue/revoke flows

### Step 6: Frontend Updates
- Update issuer flow for verifier stage
- Update revoker flow for verifier stage
- Add verifier UI components

### Step 7: API Updates
- Update `/api/degrees` endpoints
- Add verifier endpoints (if needed)
- Update sync service

### Step 8: Blockchain Sync
- Update `lib/services/blockchain-sync.ts`
- Sync verifier data from blockchain
- Handle verifier events

---

## 🔄 Migration Strategy

### Option A: Gradual Migration (Recommended)
1. Deploy new contract
2. Keep old contract active
3. Use feature detection to route to correct contract
4. Migrate data gradually
5. Eventually deprecate old contract

### Option B: Immediate Switch
1. Deploy new contract
2. Update all references immediately
3. Migrate all data at once
4. Risk: Breaking changes

---

## ✅ Testing Checklist

- [ ] New contract functions work correctly
- [ ] Verifier stage flow works end-to-end
- [ ] Database syncs verifier data
- [ ] Old degrees still accessible
- [ ] Backward compatibility maintained
- [ ] All events are captured
- [ ] UI reflects verifier status

---

## 📝 Next Steps

**Please provide the information requested above, and I'll implement the complete upgrade!**

Once you share:
1. Contract address
2. ABI
3. Verifier workflow explanation
4. Function/event signatures

I'll create:
- ✅ Updated contract integration
- ✅ Database schema changes
- ✅ Code updates for verifier stage
- ✅ Sync mechanisms
- ✅ UI updates
- ✅ Migration scripts

---

**Ready to upgrade once I have the contract details!** 🔗
