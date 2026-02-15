# Smart Contract Upgrade Summary - Verifier Stage

## ✅ Completed Implementation

### 1. Contract Integration ✅
- **New Protocol Contract**: `0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`
- **New Renderer Contract**: `0xf60FfAA7b0c51219af0A347B704211402FF8e90f`
- **Environment Variables**: Updated `.env.local`
- **ABI Created**: `lib/contracts/abi-v2.ts` with complete V2 ABI
- **Contract Manager**: Updated to support V2 with feature detection

### 2. Database Schema ✅
- **Migration Script**: `scripts/003-add-verifier-stage.sql`
- **New Tables**:
  - `verifiers` - Stores verifier wallets per university
  - `degree_requests` - Tracks pending degree issuance requests
  - `degree_request_approvals` - Tracks verifier approvals
  - `revocation_requests` - Tracks pending revocation requests
  - `revocation_request_approvals` - Tracks verifier approvals
- **Updated Tables**:
  - `degrees` - Added `request_id`, `verification_status`, `approval_count`, `required_approvals`

### 3. Key Features of V2 Contract

#### Verifier System
- **Max Verifiers**: 3 per university
- **Approval Requirements**:
  - 1 approval if ≤2 verifiers
  - 2 approvals if 3 verifiers
- **Management**: University admins can add/remove verifiers

#### New Workflow

**Issuing Degrees:**
1. Issuer calls `requestDegree()` → Returns `requestId`
2. Verifiers call `approveDegreeRequest(requestId)`
3. Auto-executes when enough approvals → Mints NFT
4. Event: `DegreeIssued` with `requestId`

**Revoking Degrees:**
1. Revoker calls `requestRevocation(tokenId)` → Returns `requestId`
2. Verifiers call `approveRevocationRequest(requestId)`
3. Auto-executes when enough approvals → Revokes degree
4. Event: `DegreeRevoked` with `requestId`

---

## ⚠️ Remaining Tasks

### High Priority

1. **Update Hooks** (`hooks/use-contract.ts`)
   - Replace `issueDegree()` with `requestDegree()`
   - Add `approveDegreeRequest()`
   - Replace `revokeDegree()` with `requestRevocation()`
   - Add `approveRevocationRequest()`
   - Add verifier management functions

2. **Update Frontend**
   - `app/issuer/issue/page.tsx` - Use request flow
   - `app/revoker/search/page.tsx` - Use request flow
   - Create verifier dashboard
   - Show pending requests UI

3. **Update API Endpoints**
   - Handle request-based flow
   - Add verifier endpoints
   - Add request endpoints

4. **Update Blockchain Sync**
   - Sync requests from blockchain
   - Sync verifier data
   - Listen to new events

5. **Run Database Migration**
   ```bash
   # Run the migration script
   psql -U postgres -d bubd -f scripts/003-add-verifier-stage.sql
   # Or use the setup script
   npm run setup:db
   ```

---

## 📋 Next Steps

1. **Run Database Migration** - Execute `scripts/003-add-verifier-stage.sql`
2. **Update Hooks** - Implement new contract functions
3. **Update Frontend** - Modify issuer/revoker flows
4. **Add Verifier UI** - Create verifier dashboard
5. **Update Sync** - Sync verifier data and requests

---

## 🔗 Contract Details

- **Protocol V2**: `0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A`
- **Renderer V2**: `0xf60FfAA7b0c51219af0A347B704211402FF8e90f`
- **Network**: Base Mainnet (8453)

---

**Foundation is complete! Ready for hooks and frontend updates.** 🔗
