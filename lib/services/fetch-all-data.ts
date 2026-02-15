/**
 * Fetch All Data from Blockchain
 * 
 * Comprehensive functions to fetch all data from the smart contract
 * for initial migration and full sync.
 */

import { 
  getReadOnlyContract,
  getReadOnlyProvider,
  fetchAllUniversities,
  fetchAllDegreesFromBlockchain,
  fetchDegreeOwner,
  checkIsIssuerOnChain,
  checkIsRevokerOnChain,
} from "@/lib/blockchain"
import { getCoreContractABI, getActiveContractAddress } from "@/lib/contracts/abi"

export interface AllBlockchainData {
  universities: Array<{
    id: number
    admin: string
    nameEn: string
    nameAr: string
    isActive: boolean
    issuers: string[]
    revokers: string[]
    verifiers?: string[] // Core contract
    requiredApprovals?: number // Core contract
  }>
  degrees: Array<{
    tokenId: number
    universityId: number
    owner: string
    nameEn: string
    nameAr: string
    majorEn: string
    majorAr: string
    facultyEn?: string
    facultyAr?: string
    year: number
    level?: number // Deprecated - not in new contracts
    gpa: number
    isRevoked: boolean
    issuedAt: number
    revokedAt: number
  }>
  totalUniversities: number
  totalDegrees: number
  lastBlockNumber: number
}

/**
 * Fetch all data from blockchain contract
 */
export async function fetchAllBlockchainData(): Promise<AllBlockchainData> {
  console.log("[FetchAllData] Starting comprehensive data fetch...")
  
  const contract = getReadOnlyContract()
  const provider = getReadOnlyProvider()
  
  // Get current block number
  const lastBlockNumber = await provider.getBlockNumber()
  
  // Fetch all universities
  console.log("[FetchAllData] Fetching universities...")
  const blockchainUniversities = await fetchAllUniversities()
  console.log(`[FetchAllData] Found ${blockchainUniversities.length} universities`)
  
  // Fetch all degrees
  console.log("[FetchAllData] Fetching degrees...")
  const blockchainDegrees = await fetchAllDegreesFromBlockchain()
  console.log(`[FetchAllData] Found ${blockchainDegrees.length} degrees`)
  
  // Enrich universities with issuers, revokers, and verifiers
  const enrichedUniversities = await Promise.all(
    blockchainUniversities.map(async (uni) => {
      const uniId = Number(uni.id)
      const issuers: string[] = []
      const revokers: string[] = []
      const verifiers: string[] = []
      let requiredApprovals: number | undefined = undefined
      
      try {
        // ✅ Fetch issuers and revokers from blockchain events
        const { fetchIssuersFromBlockchainEvents, fetchRevokersFromBlockchainEvents } = await import("@/lib/blockchain-fetch-issuers-revokers")
        
        // Fetch issuers from blockchain events
        const blockchainIssuers = await fetchIssuersFromBlockchainEvents(uniId)
        issuers.push(...blockchainIssuers)
        
        // Fetch revokers from blockchain events
        const blockchainRevokers = await fetchRevokersFromBlockchainEvents(uniId)
        revokers.push(...blockchainRevokers)
        
        // Core contract - get verifiers using getUniversityVerifiers
        try {
          // Use Core contract directly for verifier functions
          const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
          const verifierAddresses = await coreContract.getUniversityVerifiers(uniId)
          verifiers.push(...verifierAddresses.map((addr: string) => addr.toLowerCase()))
          console.log(`[FetchAllData] University ${uniId} has ${verifiers.length} verifiers`)
        } catch (error) {
          console.warn(`[FetchAllData] Could not fetch verifiers for university ${uniId}:`, error)
        }
        
        // Get required approvals (Core contract)
        try {
          const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
          const approvals = await coreContract.getRequiredApprovals(uniId)
          requiredApprovals = Number(approvals)
        } catch (error) {
          console.warn(`[FetchAllData] Could not fetch required approvals for university ${uniId}:`, error)
          requiredApprovals = undefined
        }
      } catch (error) {
        console.error(`[FetchAllData] Error enriching university ${uniId}:`, error)
      }
      
      const result: any = {
        id: uniId,
        admin: uni.admin.toLowerCase(),
        nameEn: uni.nameEn,
        nameAr: uni.nameAr,
        isActive: uni.isActive,
        issuers,
        revokers,
      }
      
      // Add verifier fields (Core contract always has verifiers)
      if (verifiers.length > 0) {
        result.verifiers = verifiers
      }
      if (requiredApprovals !== undefined) {
        result.requiredApprovals = requiredApprovals
      }
      
      return result
    })
  )
  
  // Enrich degrees with owner addresses
  console.log("[FetchAllData] Enriching degrees with owner addresses...")
  const enrichedDegrees = await Promise.all(
    blockchainDegrees.map(async (degree) => {
      let owner = "0x0000000000000000000000000000000000000000"
      
      if (degree.tokenId) {
        try {
          const ownerAddress = await fetchDegreeOwner(degree.tokenId)
          if (ownerAddress) {
            owner = ownerAddress.toLowerCase()
          }
        } catch (error) {
          console.warn(`[FetchAllData] Could not fetch owner for token ${degree.tokenId}:`, error)
        }
      }
      
      return {
        tokenId: degree.tokenId || 0,
        universityId: Number(degree.universityId),
        owner,
        nameEn: degree.nameEn,
        nameAr: degree.nameAr,
        majorEn: degree.majorEn,
        majorAr: degree.majorAr,
        facultyEn: (degree as any).facultyEn || "",
        facultyAr: (degree as any).facultyAr || "",
        year: degree.year,
        level: degree.level || undefined, // level field removed in new contracts
        gpa: degree.gpa,
        isRevoked: degree.isRevoked,
        issuedAt: degree.issuedAt,
        revokedAt: degree.revokedAt,
      }
    })
  )
  
  console.log(`[FetchAllData] Data fetch completed: ${enrichedUniversities.length} universities, ${enrichedDegrees.length} degrees`)
  
  return {
    universities: enrichedUniversities,
    degrees: enrichedDegrees,
    totalUniversities: enrichedUniversities.length,
    totalDegrees: enrichedDegrees.length,
    lastBlockNumber,
  }
}
