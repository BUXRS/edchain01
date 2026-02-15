// Blockchain read-only utilities using official Base L2 mainnet RPC
import { JsonRpcProvider, Contract } from "ethers"
import { 
  CORE_CONTRACT_ADDRESS, 
  READER_CONTRACT_ADDRESS, 
  RENDER_CONTRACT_ADDRESS,
  PROTOCOL_ADDRESS, // Legacy alias
  PROTOCOL_ABI, 
  CHAIN_ID,
  getReaderContractAddress,
  getActiveContractAddress,
  getRenderContractAddress,
  getReaderContractABI,
  getCoreContractABI,
  getRenderContractABI
} from "@/lib/contracts/abi"

// ✅ Upgradable RPC Configuration System
// Uses centralized RPC config for easy upgrades and scaling
import { getRpcHttpProvider, getRpcHttpUrl } from "@/lib/config/rpc-provider"
import { getPrimaryRpcHttpUrl } from "@/lib/config/rpc-config"

// Get RPC URL from centralized config
const BASE_RPC_URL = getPrimaryRpcHttpUrl()

let cachedProvider: JsonRpcProvider | null = null
let cachedReaderContract: Contract | null = null
let cachedCoreContract: Contract | null = null

// Get a read-only provider using centralized RPC configuration
// ✅ Upgradable: Change RPC via environment variables (BASE_RPC_HTTP_URL or NEXT_PUBLIC_BASE_RPC_URL)
export function getReadOnlyProvider(): JsonRpcProvider {
  if (!cachedProvider) {
    // Use centralized RPC provider manager for smart failover
    cachedProvider = getRpcHttpProvider()
  }
  return cachedProvider
}

// Get a read-only contract instance (uses READER contract for read operations)
export function getReadOnlyContract(): Contract {
  if (!cachedReaderContract) {
    const provider = getReadOnlyProvider()
    cachedReaderContract = new Contract(getReaderContractAddress(), getReaderContractABI(), provider)
  }
  return cachedReaderContract
}

// Get core contract instance (for write operations)
export function getCoreContract(): Contract {
  if (!cachedCoreContract) {
    const provider = getReadOnlyProvider()
    cachedCoreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
  }
  return cachedCoreContract
}

// Get render contract instance (for rendering operations)
export function getRenderContract(): Contract {
  const provider = getReadOnlyProvider()
  return new Contract(getRenderContractAddress(), getRenderContractABI(), provider)
}

// Retry a function with error handling and rate limit detection
async function retryWithFallback<T>(fn: () => Promise<T>, defaultValue: T, maxRetries = 5): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Check for rate limiting (including Infura -32005)
      const errorCode = error?.code || error?.info?.error?.code || error?.error?.code
      const errorMessage = (error?.message || error?.info?.error?.message || error?.error?.message || "").toLowerCase()
      
      const isRateLimit = 
        errorCode === -32005 || // Infura rate limit
        errorCode === "-32005" || // Infura rate limit (string)
        errorCode === -32016 || // Base RPC rate limit
        error?.code === "CALL_EXCEPTION" && error?.info?.error?.code === -32016 ||
        errorMessage.includes("too many requests") ||
        errorMessage.includes("rate limit")
      
      if (isRateLimit) {
        // Rate limited - wait longer before retrying
        const waitTime = Math.min(Math.pow(2, attempt) * 2000, 30000) // Max 30 seconds
        console.warn(`[retryWithFallback] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // For contract call exceptions (non-rate-limit), return default value
      if (
        error?.code === "CALL_EXCEPTION" ||
        error?.message?.includes("missing revert data") ||
        error?.message?.includes("could not decode")
      ) {
        return defaultValue
      }

      // For other errors, retry if attempts remain
      if (attempt < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
    }
  }
  
  // If we exhausted retries due to rate limiting, log a warning
  if (lastError?.info?.error?.code === -32016) {
    console.error(`[retryWithFallback] ⚠️ Rate limit exceeded after ${maxRetries} attempts. Consider using a premium RPC provider (Infura, Alchemy, QuickNode).`)
  }
  
  return defaultValue
}

// Degree type (updated for new contract structure)
export interface BlockchainDegree {
  tokenId?: number
  universityId: bigint
  gpa: number
  year: number
  level?: number // Deprecated - not in new contracts, kept for backward compatibility
  isRevoked: boolean
  issuedAt: number
  revokedAt: number
  nameAr: string
  nameEn: string
  facultyAr: string
  facultyEn: string
  majorAr: string
  majorEn: string
  degreeNameAr?: string // New field in Core/Reader contracts
  degreeNameEn?: string // New field in Core/Reader contracts
  issuer?: string // New field - address of issuer
  revoker?: string // New field - address of revoker (if revoked)
}

// University type
export interface BlockchainUniversity {
  id: bigint
  admin: string
  nameAr: string
  nameEn: string
  exists: boolean
  isActive: boolean
}

// Fetch a degree by token ID from the blockchain (uses Reader contract)
export async function fetchDegreeFromBlockchain(tokenId: number): Promise<BlockchainDegree | null> {
  return retryWithFallback(async () => {
    const contract = getReadOnlyContract()
    // Use getDegreeInfo from Reader contract (or getDegree from Core - both have same structure)
    const result = await contract.getDegreeInfo(tokenId)
    if (!result || !result.nameEn || result.nameEn === "") return null
    return {
      tokenId,
      universityId: result.universityId,
      gpa: Number(result.gpa),
      year: Number(result.year),
      // level field removed in new contracts - set to undefined for backward compatibility
      level: undefined,
      isRevoked: result.isRevoked,
      issuedAt: Number(result.issuedAt),
      revokedAt: Number(result.revokedAt),
      nameAr: result.nameAr,
      nameEn: result.nameEn,
      facultyAr: result.facultyAr,
      facultyEn: result.facultyEn,
      majorAr: result.majorAr,
      majorEn: result.majorEn,
      degreeNameAr: result.degreeNameAr,
      degreeNameEn: result.degreeNameEn,
      issuer: result.issuer,
      revoker: result.revoker,
    }
  }, null)
}

/**
 * Helper: Resolve blockchain_id from either DB ID or blockchain ID
 * 
 * NOTE: This function does NOT access the database to avoid bundling issues.
 * It assumes the input ID is already a blockchain ID.
 * 
 * If you need to resolve a database ID to blockchain_id, use the API route:
 * GET /api/universities/[id] to get the blockchain_id from the database.
 */
async function resolveBlockchainId(id: number): Promise<number> {
  // Always assume the input is already a blockchain ID
  // Database lookup removed to prevent client bundling issues
  // If you have a database ID, use the API to get blockchain_id first
  return id
}

// ✅ RATE LIMIT PROTECTION: Tier-aware throttling (Free: 30-60s, Paid: 5-10s)
let lastFetchTime = 0

/**
 * Throttle function to ensure delays between fetchUniversityFromBlockchain calls
 */
async function throttleFetch(): Promise<void> {
  const { getFetchThrottleMinMs, getFetchThrottleMaxMs } = await import("@/lib/config/sync-config")
  const minDelay = getFetchThrottleMinMs()
  const maxDelay = getFetchThrottleMaxMs()
  const variance = maxDelay - minDelay

  const now = Date.now()
  const timeSinceLastFetch = now - lastFetchTime
  const requiredDelay = minDelay + Math.random() * variance

  if (timeSinceLastFetch < requiredDelay) {
    const waitTime = requiredDelay - timeSinceLastFetch
    console.log(`[fetchUniversityFromBlockchain] ⏳ Rate limit protection: waiting ${Math.round(waitTime / 1000)}s before next fetch...`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }

  lastFetchTime = Date.now()
}

// Fetch a university by ID from the blockchain (uses Reader contract via Core)
// Accepts either database ID or blockchain ID - will auto-resolve
export async function fetchUniversityFromBlockchain(universityId: number): Promise<BlockchainUniversity | null> {
  // ✅ RATE LIMIT PROTECTION: Throttle calls to prevent rate limiting
  await throttleFetch()
  
  // Resolve to blockchain_id if needed
  const blockchainId = await resolveBlockchainId(universityId)
  
  // If resolved ID is different, log for debugging
  if (blockchainId !== universityId && process.env.NODE_ENV === "development") {
    console.log(`[fetchUniversityFromBlockchain] Resolved DB ID ${universityId} to blockchain_id ${blockchainId}`)
  }
  try {
    // Reader contract doesn't have getUniversity, so we use Core contract for this
    const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
    
    // Call getUniversity - it returns a struct with: admin, nameAr, nameEn, exists, isActive, isDeleted
    // Use resolved blockchain_id
    const result = await coreContract.getUniversity(blockchainId)
    
    if (!result) {
      // University doesn't exist - silently return null (expected behavior)
      return null
    }
    
    // Check if university exists and is not deleted
    if (!result.exists) {
      // University doesn't exist - silently return null (expected behavior)
      return null
    }
    
    // ✅ Check for isDeleted field (new in Core contract)
    if (result.isDeleted === true) {
      // University is deleted - silently return null (expected behavior)
      return null
    }
    
    return {
      id: BigInt(blockchainId),
      admin: result.admin,
      nameAr: result.nameAr || "",
      nameEn: result.nameEn || "",
      exists: result.exists,
      isActive: result.isActive,
    }
  } catch (error: any) {
    // Handle empty/null/undefined errors (including {} which some RPCs return)
    try {
      if (!error || (typeof error === "object" && Object.keys(error).length === 0)) return null
      if (typeof error === "object" && JSON.stringify(error) === "{}") return null
    } catch {
      return null
    }

    // Better error extraction - handle various error formats
    let errorMessage = "Unknown error"
    let errorCode = error?.code || error?.error?.code || "UNKNOWN"
    
    if (typeof error === "string") {
      errorMessage = error
    } else if (error?.message) {
      errorMessage = error.message
    } else if (error?.error?.message) {
      errorMessage = error.error.message
    } else if (error?.reason) {
      errorMessage = error.reason
    } else if (error?.shortMessage) {
      errorMessage = error.shortMessage
    } else {
      // Try to stringify the error object
      try {
        const stringified = JSON.stringify(error)
        // If stringified is just "{}", treat as empty error
        if (stringified === "{}" || stringified === "null" || stringified === "undefined") {
          // Empty error - university likely doesn't exist
          return null
        }
        errorMessage = stringified
      } catch {
        errorMessage = String(error)
      }
    }
    
    // Check for common "university doesn't exist" scenarios
    const isNonExistentError = 
      errorCode === "CALL_EXCEPTION" ||
      errorCode === "UNPREDICTABLE_GAS_LIMIT" ||
      errorMessage?.includes("missing revert data") ||
      errorMessage?.includes("execution reverted") ||
      errorMessage?.includes("revert") ||
      errorMessage?.includes("invalid opcode") ||
      errorMessage?.toLowerCase().includes("not found") ||
      errorMessage === "Unknown error" ||
      errorMessage === "{}" ||
      (errorCode === "UNPREDICTABLE_GAS_LIMIT" && errorMessage?.includes("revert"))
    
    if (isNonExistentError) {
      // This is expected - university doesn't exist at this ID
      // Silently return null (no logging to reduce console noise)
      return null
    }
    
    // For other errors, log more details but still return null to prevent breaking the loop
    // This allows fetchAllUniversities to continue processing other universities
    const errorDetails = {
      message: errorMessage,
      code: errorCode,
      data: error?.data || error?.error?.data,
      reason: error?.reason || error?.error?.reason,
      shortMessage: error?.shortMessage || error?.error?.shortMessage,
      errorType: error?.constructor?.name,
    }
    const detailsStr = JSON.stringify(errorDetails)
    const looksEmpty = detailsStr === "{}" || (errorMessage === "Unknown error" && !errorCode)
    // Only log unexpected errors in development; skip empty/unhelpful details
    if (process.env.NODE_ENV === "development" && !looksEmpty) {
      console.error(`[fetchUniversityFromBlockchain] Unexpected error fetching university ${universityId}:`, errorDetails)
    }
    
    // Return null instead of throwing to allow fetchAllUniversities to continue
    // Only throw for critical errors that indicate a system problem
    if (errorMessage?.includes("network") || errorMessage?.includes("connection") || errorMessage?.includes("timeout")) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[fetchUniversityFromBlockchain] Network/system error - this might indicate RPC issues`)
      }
      // Still return null to allow partial results
    }
    
    return null
  }
}

// Get the total supply of degrees (uses Core contract - Reader doesn't have this)
export async function fetchTotalSupply(): Promise<number> {
  return retryWithFallback(async () => {
    const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
    const supply = await coreContract.totalSupply()
    return Number(supply)
  }, 0)
}

// Get the next university ID (uses Core contract - Reader doesn't have this)
export async function fetchNextUniversityId(): Promise<number> {
  return retryWithFallback(async () => {
    const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
    const nextId = await coreContract.nextUniversityId()
    return Number(nextId)
  }, 1)
}

// Get all universities from the blockchain
export async function fetchAllUniversities(): Promise<BlockchainUniversity[]> {
  try {
    const nextId = await fetchNextUniversityId()
    // Reduce logging - only log if there are universities
    const shouldLog = process.env.NODE_ENV === "development" && nextId > 1
    
    if (shouldLog) {
      console.log(`[fetchAllUniversities] nextUniversityId = ${nextId}`)
    }
    
    if (nextId <= 1) {
      if (shouldLog) {
        console.log(`[fetchAllUniversities] No universities registered (nextId = ${nextId})`)
      }
      return []
    }
    
    const universities: BlockchainUniversity[] = []
    for (let i = 1; i < nextId; i++) {
      try {
        const uni = await fetchUniversityFromBlockchain(i)
        if (uni && uni.exists) {
          if (shouldLog) {
            console.log(`[fetchAllUniversities] Found university ${i}: ${uni.nameEn || uni.nameAr || 'Unnamed'}`)
          }
          universities.push(uni)
        }
        // Removed verbose logging for non-existent universities
      } catch (err: any) {
        // Only log errors in development
        if (shouldLog) {
          console.warn(`[fetchAllUniversities] Error fetching university ${i}:`, err.message)
        }
        // Continue to next university
      }
    }
    
    if (shouldLog) {
      console.log(`[fetchAllUniversities] Total universities found: ${universities.length}`)
    }
    return universities
  } catch (error: any) {
    console.error(`[fetchAllUniversities] Fatal error:`, error.message)
    return []
  }
}

// Get degree owner address (uses Core contract - Reader doesn't have ownerOf)
export async function fetchDegreeOwner(tokenId: number): Promise<string | null> {
  return retryWithFallback(async () => {
    const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
    return await coreContract.ownerOf(tokenId)
  }, null)
}

// Check if a degree is valid (uses Core contract - Reader doesn't have isValidDegree)
export async function checkDegreeValidity(tokenId: number): Promise<boolean> {
  return retryWithFallback(async () => {
    const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
    return await coreContract.isValidDegree(tokenId)
  }, false)
}

// Alias for checkDegreeValidity (more intuitive name)
export async function isValidDegree(tokenId: number): Promise<boolean> {
  return checkDegreeValidity(tokenId)
}

// Get the contract owner address (uses Core contract)
export async function fetchContractOwner(): Promise<string | null> {
  return retryWithFallback(async () => {
    const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
    return await coreContract.owner()
  }, null)
}

export async function checkIsIssuerOnChain(universityId: number, account: string): Promise<boolean> {
  return retryWithFallback(async () => {
    // Reader contract has checkRoles which returns all roles at once
    const readerContract = getReadOnlyContract()
    try {
      const roles = await readerContract.checkRoles(universityId, account)
      return roles.isIssuer
    } catch {
      // Fallback to Core contract if Reader doesn't work
      const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
      return await coreContract.isIssuer(universityId, account)
    }
  }, false)
}

export async function checkIsRevokerOnChain(universityId: number, account: string): Promise<boolean> {
  return retryWithFallback(async () => {
    // Reader contract has checkRoles which returns all roles at once
    const readerContract = getReadOnlyContract()
    try {
      const roles = await readerContract.checkRoles(universityId, account)
      return roles.isRevoker
    } catch {
      // Fallback to Core contract if Reader doesn't work
      const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
      return await coreContract.isRevoker(universityId, account)
    }
  }, false)
}

export async function checkIsUniversityAdminOnChain(universityId: number, account: string): Promise<boolean> {
  return retryWithFallback(async () => {
    // Reader contract has checkRoles which returns all roles at once
    const readerContract = getReadOnlyContract()
    try {
      const roles = await readerContract.checkRoles(universityId, account)
      return roles.isAdmin
    } catch {
      // Fallback to checking university admin directly
      const university = await fetchUniversityFromBlockchain(universityId)
      if (!university) return false
      return university.admin.toLowerCase() === account.toLowerCase()
    }
  }, false)
}

export async function findUniversityByAdmin(adminAddress: string): Promise<BlockchainUniversity | null> {
  try {
    const universities = await fetchAllUniversities()
    for (const uni of universities) {
      if (uni.admin.toLowerCase() === adminAddress.toLowerCase()) return uni
    }
    return null
  } catch {
    return null
  }
}

export async function findUniversitiesWhereIssuer(account: string): Promise<BlockchainUniversity[]> {
  try {
    // ✅ OPTIMIZED: Use getWalletRoles which is more efficient (fewer RPC calls)
    // This returns all issuer universities in one efficient call
    const roles = await getWalletRoles(account)
    
    if (roles.issuerForUniversities.length === 0) {
      return []
    }
    
    // Fetch university details for each issuer university ID
    const result: BlockchainUniversity[] = []
    for (const uniId of roles.issuerForUniversities) {
      try {
        const uni = await fetchUniversityFromBlockchain(Number(uniId))
        if (uni && uni.exists && !uni.isDeleted) {
          result.push(uni)
        }
      } catch (error) {
        // Skip universities that fail to fetch (might be deleted)
        console.debug(`[findUniversitiesWhereIssuer] Skipping university ${uniId}:`, error)
      }
    }
    
    return result
  } catch (error) {
    console.error("[findUniversitiesWhereIssuer] Error:", error)
    return []
  }
}

export async function findUniversitiesWhereRevoker(account: string): Promise<BlockchainUniversity[]> {
  try {
    // ✅ OPTIMIZED: Use getWalletRoles which is more efficient (fewer RPC calls)
    const roles = await getWalletRoles(account)
    
    if (roles.revokerForUniversities.length === 0) {
      return []
    }
    
    // Fetch university details for each revoker university ID
    const result: BlockchainUniversity[] = []
    for (const uniId of roles.revokerForUniversities) {
      try {
        const uni = await fetchUniversityFromBlockchain(Number(uniId))
        if (uni && uni.exists && !uni.isDeleted) {
          result.push(uni)
        }
      } catch (error) {
        // Skip universities that fail to fetch
        console.debug(`[findUniversitiesWhereRevoker] Skipping university ${uniId}:`, error)
      }
    }
    
    return result
  } catch (error) {
    console.error("[findUniversitiesWhereRevoker] Error:", error)
    return []
  }
}

export interface UserRoles {
  isContractOwner: boolean
  adminOf: BlockchainUniversity | null
  issuerFor: BlockchainUniversity[]
  revokerFor: BlockchainUniversity[]
}

export async function findUserRolesOnChain(account: string): Promise<UserRoles> {
  const result: UserRoles = {
    isContractOwner: false,
    adminOf: null,
    issuerFor: [],
    revokerFor: [],
  }
  try {
    const owner = await fetchContractOwner()
    if (owner && owner.toLowerCase() === account.toLowerCase()) result.isContractOwner = true
    const universities = await fetchAllUniversities()
    for (const uni of universities) {
      const uniId = Number(uni.id)
      if (uni.admin.toLowerCase() === account.toLowerCase()) result.adminOf = uni
      if (await checkIsIssuerOnChain(uniId, account)) result.issuerFor.push(uni)
      if (await checkIsRevokerOnChain(uniId, account)) result.revokerFor.push(uni)
    }
  } catch {
    // Return default on error
  }
  return result
}

export async function fetchAllDegreesFromBlockchain(): Promise<BlockchainDegree[]> {
  try {
    const totalSupply = await fetchTotalSupply()
    const degrees: BlockchainDegree[] = []
    for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
      const degree = await fetchDegreeFromBlockchain(tokenId)
      if (degree) degrees.push({ ...degree, tokenId })
    }
    return degrees
  } catch {
    return []
  }
}

export async function fetchDegreesForUniversity(
  universityId: number,
): Promise<Array<BlockchainDegree & { tokenId: number; owner: string }>> {
  try {
    const totalSupply = await fetchTotalSupply()
    const degrees: Array<BlockchainDegree & { tokenId: number; owner: string }> = []
    for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
      const degree = await fetchDegreeFromBlockchain(tokenId)
      if (degree && Number(degree.universityId) === universityId) {
        const owner = (await fetchDegreeOwner(tokenId)) || ""
        degrees.push({ ...degree, tokenId, owner })
      }
    }
    return degrees
  } catch {
    return []
  }
}

export async function fetchDegreesIssuedBy(
  issuerAddress: string,
): Promise<Array<BlockchainDegree & { tokenId: number; recipient: string }>> {
  try {
    const allDegrees = await fetchAllDegreesFromBlockchain()
    return allDegrees.map((d) => ({ ...d, tokenId: d.tokenId || 0, recipient: "" }))
  } catch {
    return []
  }
}

export async function fetchRevokedDegrees(
  universityId?: number,
): Promise<
  Array<{ tokenId: number; universityId: number; revokedAt: Date; txHash: string; degree?: BlockchainDegree }>
> {
  try {
    const allDegrees = await fetchAllDegreesFromBlockchain()
    return allDegrees
      .filter((d) => d.isRevoked && (universityId === undefined || Number(d.universityId) === universityId))
      .map((d) => ({
        tokenId: d.tokenId || 0,
        universityId: Number(d.universityId),
        revokedAt: new Date(d.revokedAt * 1000),
        txHash: "",
        degree: d,
      }))
  } catch {
    return []
  }
}

export async function fetchIssuersForUniversity(
  universityId: number,
): Promise<Array<{ address: string; isActive: boolean; addedAt?: Date }>> {
  return []
}

export async function fetchRevokersForUniversity(
  universityId: number,
): Promise<Array<{ address: string; isActive: boolean; addedAt?: Date }>> {
  return []
}

export async function checkIsUniversityAdmin(universityId: number, address: string): Promise<boolean> {
  return retryWithFallback(async () => {
    // Use Reader contract's checkRoles for efficient role checking
    const readerContract = getReadOnlyContract()
    try {
      const roles = await readerContract.checkRoles(universityId, address)
      return roles.isAdmin
    } catch {
      // Fallback to Core contract
      const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
      const uni = await coreContract.getUniversity(universityId)
      const uniAdmin = uni.admin || uni[0]
      const uniExists = uni.exists ?? uni[3]
      if (!uniExists) return false
      return uniAdmin && uniAdmin.toLowerCase() === address.toLowerCase()
    }
  }, false)
}

export async function checkIsIssuer(universityId: number, address: string): Promise<boolean> {
  return retryWithFallback(async () => {
    // Use Reader contract's checkRoles
    const readerContract = getReadOnlyContract()
    try {
      const roles = await readerContract.checkRoles(universityId, address)
      return roles.isIssuer
    } catch {
      // Fallback to Core contract
      const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
      return Boolean(await coreContract.isIssuer(universityId, address))
    }
  }, false)
}

export async function checkIsRevoker(universityId: number, address: string): Promise<boolean> {
  return retryWithFallback(async () => {
    // Use Reader contract's checkRoles
    const readerContract = getReadOnlyContract()
    try {
      const roles = await readerContract.checkRoles(universityId, address)
      return roles.isRevoker
    } catch {
      // Fallback to Core contract
      const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
      return Boolean(await coreContract.isRevoker(universityId, address))
    }
  }, false)
}

export async function findUniversityWhereAdmin(address: string): Promise<BlockchainUniversity | null> {
  try {
    const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
    let total = 1
    try {
      total = Number(await coreContract.nextUniversityId())
    } catch {
      return null
    }
    for (let i = 1; i < total; i++) {
      try {
        const uni = await coreContract.getUniversity(i)
        const uniAdmin = uni.admin || uni[0]
        const uniNameAr = uni.nameAr || uni[1]
        const uniNameEn = uni.nameEn || uni[2]
        const uniExists = uni.exists ?? uni[3]
        const uniIsActive = uni.isActive ?? uni[4]
        if (uniExists && uniAdmin && uniAdmin.toLowerCase() === address.toLowerCase()) {
          return {
            id: BigInt(i),
            admin: uniAdmin,
            nameAr: uniNameAr || "",
            nameEn: uniNameEn || "",
            exists: uniExists,
            isActive: uniIsActive,
          }
        }
      } catch {
        continue
      }
    }
    return null
  } catch {
    return null
  }
}

export async function getWalletRoles(address: string): Promise<{
  isContractOwner: boolean
  adminOfUniversities: number[]
  issuerForUniversities: number[]
  revokerForUniversities: number[]
  verifierForUniversities: number[]
}> {
  const defaultRoles = {
    isContractOwner: false,
    adminOfUniversities: [] as number[],
    issuerForUniversities: [] as number[],
    revokerForUniversities: [] as number[],
    verifierForUniversities: [] as number[],
  }
  try {
    const coreAddress = getActiveContractAddress()
    const readerAddress = getReaderContractAddress()
    
    // ✅ VERIFY: Log contract addresses being used
    console.log(`[getWalletRoles] Using contracts:`, {
      core: coreAddress,
      reader: readerAddress,
      wallet: address.toLowerCase(),
    })
    
    const coreContract = new Contract(coreAddress, getCoreContractABI(), getReadOnlyProvider())
    const readerContract = getReadOnlyContract()
    
    let isContractOwner = false
    try {
      const owner = await coreContract.owner()
      isContractOwner = owner.toLowerCase() === address.toLowerCase()
    } catch {}
    
    const adminOfUniversities: number[] = []
    const issuerForUniversities: number[] = []
    const revokerForUniversities: number[] = []
    let total = 1
    try {
      total = Number(await coreContract.nextUniversityId())
    } catch {}
    
    const verifierForUniversities: number[] = []
    
    // ✅ OPTIMIZED: Batch check with rate limit handling
    // Process universities in smaller batches to avoid rate limits
    const BATCH_SIZE = 5
    console.log(`[getWalletRoles] Checking ${total - 1} universities for wallet ${address.toLowerCase()}`)
    
    for (let i = 1; i < total; i++) {
      try {
        // Use Reader contract's checkRoles for efficient role checking
        const roles = await retryWithFallback(
          async () => {
            console.log(`[getWalletRoles] Checking university ${i} with Reader contract...`)
            return await readerContract.checkRoles(i, address)
          },
          null
        )
        
        if (roles) {
          if (roles.isAdmin) {
            adminOfUniversities.push(i)
            console.log(`[getWalletRoles] ✅ Wallet is ADMIN for university ${i}`)
          }
          if (roles.isIssuer) {
            issuerForUniversities.push(i)
            console.log(`[getWalletRoles] ✅ Wallet is ISSUER for university ${i}`)
          }
          if (roles.isRevoker) {
            revokerForUniversities.push(i)
            console.log(`[getWalletRoles] ✅ Wallet is REVOKER for university ${i}`)
          }
          if (roles.isVerifier) {
            verifierForUniversities.push(i)
            console.log(`[getWalletRoles] ✅ Wallet is VERIFIER for university ${i}`)
          }
        } else {
          console.log(`[getWalletRoles] ⚠️ Reader contract returned null for university ${i}`)
        }
      } catch (readerError: any) {
        console.warn(`[getWalletRoles] Reader contract failed for university ${i}:`, readerError?.message || readerError)
        // Fallback to Core contract if Reader fails
        try {
          const uni = await retryWithFallback(
            async () => await coreContract.getUniversity(i),
            null
          )
          if (!uni || !uni.exists) continue
          
          const uniAdmin = uni.admin || uni[0]
          if (uniAdmin && uniAdmin.toLowerCase() === address.toLowerCase()) {
            adminOfUniversities.push(i)
          }
          
          // Check roles with retry
          try {
            const isIssuer = await retryWithFallback(
              async () => await coreContract.isIssuer(i, address),
              false
            )
            if (isIssuer) issuerForUniversities.push(i)
          } catch {}
          
          try {
            const isRevoker = await retryWithFallback(
              async () => await coreContract.isRevoker(i, address),
              false
            )
            if (isRevoker) revokerForUniversities.push(i)
          } catch {}
          
          try {
            const isVerifier = await retryWithFallback(
              async () => await coreContract.isVerifier(i, address),
              false
            )
            if (isVerifier) verifierForUniversities.push(i)
          } catch {}
        } catch {
          continue
        }
      }
      
      // Add small delay between batches to avoid rate limits
      if (i % BATCH_SIZE === 0 && i < total - 1) {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay between batches
      }
    }
    return { isContractOwner, adminOfUniversities, issuerForUniversities, revokerForUniversities, verifierForUniversities }
  } catch {
    return defaultRoles
  }
}

// Alias for fetchUniversityFromBlockchain for compatibility
export async function fetchUniversityById(universityId: number): Promise<BlockchainUniversity | null> {
  return fetchUniversityFromBlockchain(universityId)
}

// Get encoded transaction data for registering a university (to be signed by wallet)
export function getRegisterUniversityTxData(
  adminAddress: string,
  nameAr: string,
  nameEn: string
): { to: string; data: string } {
  const contract = getCoreContract()
  const data = contract.interface.encodeFunctionData("registerUniversity", [adminAddress, nameAr, nameEn])
  return {
    to: getActiveContractAddress(),
    data,
  }
}

// Get encoded transaction data for deactivating a university (to be signed by wallet)
export function getDeactivateUniversityTxData(universityId: number): { to: string; data: string } {
  const contract = getCoreContract()
  // Core contract uses setUniversityStatus (not setUniversityActive)
  const data = contract.interface.encodeFunctionData("setUniversityStatus", [universityId, false])
  return {
    to: getActiveContractAddress(),
    data,
  }
}

// Get encoded transaction data for activating a university (to be signed by wallet)
export function getActivateUniversityTxData(universityId: number): { to: string; data: string } {
  const contract = getCoreContract()
  // Core contract uses setUniversityStatus (not setUniversityActive)
  const data = contract.interface.encodeFunctionData("setUniversityStatus", [universityId, true])
  return {
    to: getActiveContractAddress(),
    data,
  }
}

// Helper functions that return transaction data for wallet signing
// These are used by the admin UI to prepare transactions
export interface TransactionData {
  to: string
  data: string
  chainId: number
}

export async function registerUniversity(
  adminAddress: string,
  nameAr: string,
  nameEn: string
): Promise<TransactionData> {
  const txData = getRegisterUniversityTxData(adminAddress, nameAr, nameEn)
  return {
    ...txData,
    chainId: CHAIN_ID,
  }
}

export async function deactivateUniversity(universityId: number): Promise<TransactionData> {
  const txData = getDeactivateUniversityTxData(universityId)
  return {
    ...txData,
    chainId: CHAIN_ID,
  }
}

export async function activateUniversity(universityId: number): Promise<TransactionData> {
  const txData = getActivateUniversityTxData(universityId)
  return {
    ...txData,
    chainId: CHAIN_ID,
  }
}

// Fetch all degrees owned by a wallet address
export async function fetchDegreesOwnedByWallet(
  walletAddress: string
): Promise<Array<BlockchainDegree & { tokenId: number }>> {
  return retryWithFallback(async () => {
    const coreContract = getCoreContract()
    // Use getStudentDegrees from Core contract
    const tokenIds = await coreContract.getStudentDegrees(walletAddress)
    const degrees: Array<BlockchainDegree & { tokenId: number }> = []
    for (const tokenIdBigInt of tokenIds) {
      const tokenId = Number(tokenIdBigInt)
      const degree = await fetchDegreeFromBlockchain(tokenId)
      if (degree) {
        degrees.push({ ...degree, tokenId })
      }
    }
    return degrees
  }, [])
}

// Get a degree request by ID from the blockchain
export async function getDegreeRequest(requestId: number): Promise<{
  universityId: bigint
  recipient: string
  requester: string
  gpa: number
  year: number
  approvalCount: number
  createdAt: number
  executed: boolean
  rejected: boolean
  nameAr: string
  nameEn: string
  facultyAr: string
  facultyEn: string
  majorAr: string
  majorEn: string
  degreeNameAr: string
  degreeNameEn: string
} | null> {
  return retryWithFallback(async () => {
    const coreContract = getCoreContract()
    // Public mapping getter: degreeRequests(requestId)
    const request = await coreContract.degreeRequests(requestId)
    // Check if request exists (if all fields are zero/empty, it doesn't exist)
    if (!request || (request.universityId === 0n && request.recipient === "0x0000000000000000000000000000000000000000")) {
      return null
    }
    return {
      universityId: request.universityId,
      recipient: request.recipient,
      requester: request.requester,
      gpa: Number(request.gpa),
      year: Number(request.year),
      approvalCount: Number(request.approvalCount),
      createdAt: Number(request.createdAt),
      executed: request.executed,
      rejected: request.rejected,
      nameAr: request.nameAr,
      nameEn: request.nameEn,
      facultyAr: request.facultyAr,
      facultyEn: request.facultyEn,
      majorAr: request.majorAr,
      majorEn: request.majorEn,
      degreeNameAr: request.degreeNameAr,
      degreeNameEn: request.degreeNameEn,
    }
  }, null)
}

// Get a revocation request by ID from the blockchain
export async function getRevocationRequest(requestId: number): Promise<{
  tokenId: bigint
  universityId: bigint
  requester: string
  approvalCount: number
  createdAt: number
  executed: boolean
  rejected: boolean
} | null> {
  return retryWithFallback(async () => {
    const coreContract = getCoreContract()
    // Public mapping getter: revocationRequests(requestId)
    const request = await coreContract.revocationRequests(requestId)
    // Check if request exists
    if (!request || (request.universityId === 0n && request.tokenId === 0n)) {
      return null
    }
    return {
      tokenId: request.tokenId,
      universityId: request.universityId,
      requester: request.requester,
      approvalCount: Number(request.approvalCount),
      createdAt: Number(request.createdAt),
      executed: request.executed,
      rejected: request.rejected,
    }
  }, null)
}

// Get required approvals for a university
export async function getRequiredApprovals(universityId: number): Promise<number> {
  return retryWithFallback(async () => {
    const coreContract = getCoreContract()
    const required = await coreContract.getRequiredApprovals(universityId)
    return Number(required)
  }, 0)
}

// Find universities where an address is a verifier
export async function findUniversitiesWhereVerifier(account: string): Promise<BlockchainUniversity[]> {
  try {
    // ✅ OPTIMIZED: Use getWalletRoles which is more efficient (fewer RPC calls)
    // This returns all verifier universities in one efficient call
    const roles = await getWalletRoles(account)
    
    if (roles.verifierForUniversities.length === 0) {
      return []
    }
    
    // Fetch university details for each verifier university ID
    const result: BlockchainUniversity[] = []
    for (const uniId of roles.verifierForUniversities) {
      try {
        const uni = await fetchUniversityFromBlockchain(Number(uniId))
        if (uni && uni.exists && !uni.isDeleted) {
          result.push(uni)
        }
      } catch (error) {
        // Skip universities that fail to fetch (might be deleted)
        console.debug(`[findUniversitiesWhereVerifier] Skipping university ${uniId}:`, error)
      }
    }
    
    return result
  } catch (error) {
    console.error("[findUniversitiesWhereVerifier] Error:", error)
    return []
  }
}

// Check if an address is a verifier for a university
export async function checkIsVerifierOnChain(universityId: number, account: string): Promise<boolean> {
  return retryWithFallback(async () => {
    const coreContract = getCoreContract()
    return await coreContract.isVerifier(universityId, account)
  }, false)
}

// Get verifier count for a university
export async function getVerifierCount(universityId: number): Promise<number> {
  return retryWithFallback(async () => {
    const coreContract = getCoreContract()
    const count = await coreContract.verifierCount(universityId)
    return Number(count)
  }, 0)
}

// Get all verifiers for a university
export async function getUniversityVerifiers(universityId: number): Promise<string[]> {
  return retryWithFallback(async () => {
    const coreContract = getCoreContract()
    const verifiers = await coreContract.getUniversityVerifiers(universityId)
    return verifiers.map((v: string) => v.toLowerCase())
  }, [])
}

// Check if a verifier has approved a degree request
export async function hasApprovedDegreeRequest(requestId: number, verifierAddress: string): Promise<boolean> {
  return retryWithFallback(async () => {
    const coreContract = getCoreContract()
    return await coreContract.hasApprovedDegreeRequest(requestId, verifierAddress)
  }, false)
}

// Check if a verifier has approved a revocation request
export async function hasApprovedRevocationRequest(requestId: number, verifierAddress: string): Promise<boolean> {
  return retryWithFallback(async () => {
    const coreContract = getCoreContract()
    return await coreContract.hasApprovedRevocationRequest(requestId, verifierAddress)
  }, false)
}
