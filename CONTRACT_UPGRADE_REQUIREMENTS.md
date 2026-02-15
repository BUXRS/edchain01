# Smart Contract Upgrade Requirements - Verifier Stage

## 📋 Information Needed

To properly integrate the new smart contract with the "verifier stage" feature, I need the following information:

### 1. Contract Details
- [ ] **New Contract Address** (on Base Mainnet)
- [ ] **New Contract ABI** (complete JSON)
- [ ] **Deployment Block Number** (for event filtering)

### 2. Verifier Stage Details
- [ ] **What is the verifier stage?**
  - Is it a separate role (like issuer/revoker)?
  - Is it a status/state in the issuance/revocation process?
  - Does it require additional approval before finalizing?

- [ ] **How does it work for issuing?**
  - Does `issueDegree` now require a verifier?
  - Is there a new function like `verifyIssue` or `approveIssue`?
  - What are the function signatures?

- [ ] **How does it work for revoking?**
  - Does `revokeDegree` now require a verifier?
  - Is there a new function like `verifyRevoke` or `approveRevoke`?
  - What are the function signatures?

- [ ] **Verifier Management**
  - How are verifiers added/removed?
  - Is there `addVerifier` / `removeVerifier` functions?
  - Are verifiers per-university or global?

### 3. New Events
- [ ] **What new events are emitted?**
  - `IssueVerified` / `RevokeVerified`?
  - `VerifierAdded` / `VerifierRemoved`?
  - Event signatures and parameters?

### 4. Data Structure Changes
- [ ] **Does `getDegree` return verifier information?**
  - Verifier address?
  - Verification timestamp?
  - Verification status?

- [ ] **Does `getUniversity` return verifier list?**
  - How to query verifiers for a university?

### 5. Backward Compatibility
- [ ] **Can old degrees (issued before upgrade) work with new contract?**
- [ ] **Do we need to support both contracts simultaneously?**
- [ ] **Migration strategy for existing data?**

---

## 🔄 Migration Plan (Draft)

Once I have the above information, here's the plan:

### Phase 1: Contract Integration
1. ✅ Add new contract address to `.env.local`
2. ✅ Update `lib/contracts/abi.ts` with new ABI
3. ✅ Update `lib/contracts/contract-manager.ts` for v2 support
4. ✅ Add feature detection for verifier functions

### Phase 2: Database Schema Updates
1. ✅ Add `verifier_stage` columns to `degrees` table
2. ✅ Add `verifiers` table (if verifiers are separate entities)
3. ✅ Add indexes for verifier queries
4. ✅ Create migration script

### Phase 3: Code Updates
1. ✅ Update `hooks/use-contract.ts` for verifier functions
2. ✅ Update `app/issuer/issue/page.tsx` for verifier flow
3. ✅ Update `app/revoker/search/page.tsx` for verifier flow
4. ✅ Update blockchain sync service for verifier data

### Phase 4: API Updates
1. ✅ Update `/api/degrees` to handle verifier stage
2. ✅ Add `/api/verifiers` endpoints (if needed)
3. ✅ Update sync endpoints for verifier data

### Phase 5: Testing & Deployment
1. ✅ Test with new contract
2. ✅ Verify DB sync works
3. ✅ Test backward compatibility
4. ✅ Deploy

---

## 📝 Please Provide

**Please share:**
1. New contract address
2. Complete ABI (JSON)
3. Explanation of verifier stage workflow
4. Function signatures for verifier-related functions
5. Event signatures

**Or provide:**
- Contract source code (Solidity)
- Contract verification link (BaseScan)
- Documentation about verifier stage

---

**Once I have this information, I'll implement the complete upgrade!** 🔗
