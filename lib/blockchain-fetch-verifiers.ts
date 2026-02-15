/**
 * Fetch Verifiers from Blockchain
 * 
 * The V2 contract has getUniversityVerifiers() function that returns an array of verifier addresses.
 * We also listen to VerifierAdded/VerifierRemoved events for real-time sync.
 */

import { getReadOnlyContract, getReadOnlyProvider } from "./blockchain"
import { getUniversityVerifiers, getVerifierCount, getRequiredApprovals } from "./blockchain"
import { hasV2Contract } from "./contracts/abi"

/**
 * Fetch all verifiers for a university from blockchain
 * Uses getUniversityVerifiers() function from V2 contract
 */
export async function fetchVerifiersFromBlockchain(
  universityId: number
): Promise<string[]> {
  try {
    if (!hasV2Contract()) {
      console.warn(`[FetchVerifiers] V2 contract not available, cannot fetch verifiers`)
      return []
    }

    const verifiers = await getUniversityVerifiers(universityId)
    console.log(`[FetchVerifiers] Found ${verifiers.length} verifiers on blockchain for university ${universityId}`)
    
    return verifiers
  } catch (error) {
    console.error(`[FetchVerifiers] Error fetching verifiers for university ${universityId}:`, error)
    return []
  }
}

/**
 * Fetch verifier count and required approvals for a university
 */
export async function fetchVerifierInfo(universityId: number): Promise<{
  count: number
  requiredApprovals: number
  verifiers: string[]
}> {
  try {
    if (!hasV2Contract()) {
      return { count: 0, requiredApprovals: 0, verifiers: [] }
    }

    const [count, requiredApprovals, verifiers] = await Promise.all([
      getVerifierCount(universityId),
      getRequiredApprovals(universityId),
      getUniversityVerifiers(universityId)
    ])

    return {
      count,
      requiredApprovals,
      verifiers: verifiers.map((v: string) => v.toLowerCase())
    }
  } catch (error) {
    console.error(`[FetchVerifiers] Error fetching verifier info for university ${universityId}:`, error)
    return { count: 0, requiredApprovals: 0, verifiers: [] }
  }
}
