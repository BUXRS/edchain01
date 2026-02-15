# Smart Contract Upgrade - Implementation Template

## Step 1: Update Environment Variables

```env
# .env.local
# Old contract (keep for reference/fallback)
NEXT_PUBLIC_UNIVERSITY_REGISTRY_MAINNET=0xA54B9CAEb99217ea80F109204194E179B2502e38

# New contract with verifier stage
NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2=0x[NEW_CONTRACT_ADDRESS]
```

## Step 2: Update ABI

```typescript
// lib/contracts/abi.ts

// Add new ABI for v2
export const PROTOCOL_ABI_V2 = [
  // ... existing functions ...
  // ... new verifier functions ...
] as const

// Use v2 ABI when v2 contract is active
export function getProtocolABI(version: "v1" | "v2" = "v1") {
  if (version === "v2" && PROTOCOL_ADDRESS_V2) {
    return PROTOCOL_ABI_V2
  }
  return PROTOCOL_ABI
}
```

## Step 3: Database Schema Updates

```sql
-- scripts/003-add-verifier-stage.sql

-- Add verifier stage columns to degrees table
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS verifier_address VARCHAR(42);
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending'; -- pending, verified, rejected

-- Create verifiers table (if verifiers are separate entities)
CREATE TABLE IF NOT EXISTS verifiers (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  added_by VARCHAR(42),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_address, university_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_degrees_verifier_status ON degrees(verification_status);
CREATE INDEX IF NOT EXISTS idx_degrees_verifier_address ON degrees(verifier_address);
CREATE INDEX IF NOT EXISTS idx_verifiers_university ON verifiers(university_id);
```

## Step 4: Update Contract Functions

```typescript
// hooks/use-contract.ts

// Add verifier functions
const verifyIssue = useCallback(async (tokenId: number) => {
  // Implementation
}, [getSigner])

const verifyRevoke = useCallback(async (tokenId: number) => {
  // Implementation
}, [getSigner])

// Update issueDegree to handle verifier stage
const issueDegree = useCallback(async (...args) => {
  // Check if contract has verifier stage
  const hasVerifierStage = await hasContractFeature(contract, 'issueDegreeWithVerifier')
  
  if (hasVerifierStage) {
    // Use new function with verifier
    return await contract.issueDegreeWithVerifier(...args)
  } else {
    // Fallback to old function
    return await contract.issueDegree(...args)
  }
}, [getSigner])
```

## Step 5: Update Sync Service

```typescript
// lib/services/blockchain-sync.ts

// Update degree sync to include verifier data
async syncDegree(tokenId: number) {
  const degree = await fetchDegreeFromBlockchain(tokenId)
  
  // Check if degree has verifier data
  if (degree.verifier) {
    await sql`
      UPDATE degrees 
      SET verifier_address = ${degree.verifier},
          verified_at = ${degree.verifiedAt},
          verification_status = ${degree.verificationStatus}
      WHERE token_id = ${tokenId}
    `
  }
}
```

---

**This template will be customized based on the actual contract details!**
