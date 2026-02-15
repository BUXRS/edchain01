/**
 * Unified Authorization Resolver
 * 
 * Implements the "Blockchain as Source of Truth" architecture:
 * 1. Fast DB lookup for candidate roles/universities
 * 2. On-chain verification for final authorization
 * 3. Returns ONLY confirmed authorized universities + roles
 * 
 * This is the SINGLE source of truth for all authorization decisions.
 */

import { sql, isDatabaseAvailable } from "@/lib/db"
import { 
  getWalletRoles, 
  fetchUniversityFromBlockchain,
  findUniversityByAdmin,
  findUniversitiesWhereIssuer,
  findUniversitiesWhereRevoker,
  findUniversitiesWhereVerifier
} from "@/lib/blockchain"

export interface AuthorizedUniversity {
  id: number
  nameEn: string
  nameAr?: string
  isActive: boolean
  roles: string[] // ['admin', 'issuer', 'revoker', 'verifier']
}

export interface AuthorizationResult {
  authorized: boolean
  walletAddress: string
  universities: AuthorizedUniversity[]
  rolesByUniversity: Record<number, string[]> // universityId -> roles[]
  isContractOwner: boolean
  cacheUntil?: number // timestamp for cache expiry
}

/**
 * Resolve authorization for a user by wallet address
 * 
 * @param walletAddress - Normalized wallet address (lowercase)
 * @param userId - Optional user ID from database (for email/password login)
 * @param userType - Optional user type ('university', 'issuer', 'revoker', 'verifier')
 * @returns Authorization result with confirmed universities and roles
 */
export async function resolveAuthorization(
  walletAddress: string,
  userId?: number,
  userType?: 'university' | 'issuer' | 'revoker' | 'verifier'
): Promise<AuthorizationResult> {
  const normalizedWallet = walletAddress.toLowerCase()
  
  if (!normalizedWallet || !/^0x[a-fA-F0-9]{40}$/.test(normalizedWallet)) {
    return {
      authorized: false,
      walletAddress: normalizedWallet,
      universities: [],
      rolesByUniversity: {},
      isContractOwner: false,
    }
  }

  // ✅ STEP 1: Fast DB lookup for candidate roles/universities
  let dbCandidates: Array<{ universityId: number; role: string }> = []
  
  if (isDatabaseAvailable() && userId) {
    try {
      // Query DB for candidate roles based on user type
      if (userType === 'university') {
        const universities = await sql`
          SELECT id as university_id, 'admin' as role
          FROM universities
          WHERE wallet_address = ${normalizedWallet} AND id = ${userId}
        `
        dbCandidates = universities.map((u: any) => ({
          universityId: u.university_id,
          role: u.role
        }))
      } else if (userType === 'issuer') {
        const issuers = await sql`
          SELECT university_id, 'issuer' as role
          FROM issuers
          WHERE wallet_address = ${normalizedWallet} AND id = ${userId} AND is_active = true
        `
        dbCandidates = issuers.map((i: any) => ({
          universityId: i.university_id,
          role: i.role
        }))
      } else if (userType === 'revoker') {
        const revokers = await sql`
          SELECT university_id, 'revoker' as role
          FROM revokers
          WHERE wallet_address = ${normalizedWallet} AND id = ${userId} AND is_active = true
        `
        dbCandidates = revokers.map((r: any) => ({
          universityId: r.university_id,
          role: r.role
        }))
      } else if (userType === 'verifier') {
        const verifiers = await sql`
          SELECT university_id, 'verifier' as role
          FROM verifiers
          WHERE wallet_address = ${normalizedWallet} AND id = ${userId} AND is_active = true
        `
        dbCandidates = verifiers.map((v: any) => ({
          universityId: v.university_id,
          role: v.role
        }))
      }
    } catch (dbError) {
      console.error("[AuthResolver] DB lookup error:", dbError)
      // Continue with blockchain-only verification
    }
  }

  // ✅ STEP 2: On-chain verification (source of truth)
  let blockchainRoles: {
    isContractOwner: boolean
    adminOfUniversities: number[]
    issuerForUniversities: number[]
    revokerForUniversities: number[]
    verifierForUniversities: number[]
  } | null = null

  try {
    const roles = await getWalletRoles(normalizedWallet)
    
    blockchainRoles = {
      isContractOwner: roles.isContractOwner || false,
      adminOfUniversities: roles.adminOfUniversities || [],
      issuerForUniversities: roles.issuerForUniversities || [],
      revokerForUniversities: roles.revokerForUniversities || [],
      verifierForUniversities: roles.verifierForUniversities || [],
    }
  } catch (blockchainError) {
    console.error("[AuthResolver] Blockchain verification error:", blockchainError)
    // If blockchain check fails, user is NOT authorized (fail-secure)
    return {
      authorized: false,
      walletAddress: normalizedWallet,
      universities: [],
      rolesByUniversity: {},
      isContractOwner: false,
    }
  }

  // ✅ STEP 3: Build confirmed authorization from blockchain (source of truth)
  const confirmedUniversities: Map<number, AuthorizedUniversity> = new Map()
  const rolesByUniversity: Record<number, string[]> = {}

  // Process admin roles
  for (const uniId of blockchainRoles.adminOfUniversities) {
    const id = Number(uniId)
    if (!confirmedUniversities.has(id)) {
      try {
        const uni = await fetchUniversityFromBlockchain(id)
        if (uni && uni.isActive) {
          confirmedUniversities.set(id, {
            id,
            nameEn: uni.nameEn,
            nameAr: uni.nameAr,
            isActive: uni.isActive,
            roles: ['admin'],
          })
          rolesByUniversity[id] = ['admin']
        }
      } catch (error) {
        console.error(`[AuthResolver] Error fetching university ${id}:`, error)
      }
    } else {
      confirmedUniversities.get(id)!.roles.push('admin')
      rolesByUniversity[id].push('admin')
    }
  }

  // Process issuer roles
  for (const uniId of blockchainRoles.issuerForUniversities) {
    const id = Number(uniId)
    if (!confirmedUniversities.has(id)) {
      try {
        const uni = await fetchUniversityFromBlockchain(id)
        if (uni && uni.isActive) {
          confirmedUniversities.set(id, {
            id,
            nameEn: uni.nameEn,
            nameAr: uni.nameAr,
            isActive: uni.isActive,
            roles: ['issuer'],
          })
          rolesByUniversity[id] = ['issuer']
        }
      } catch (error) {
        console.error(`[AuthResolver] Error fetching university ${id}:`, error)
      }
    } else {
      confirmedUniversities.get(id)!.roles.push('issuer')
      rolesByUniversity[id].push('issuer')
    }
  }

  // Process revoker roles
  for (const uniId of blockchainRoles.revokerForUniversities) {
    const id = Number(uniId)
    if (!confirmedUniversities.has(id)) {
      try {
        const uni = await fetchUniversityFromBlockchain(id)
        if (uni && uni.isActive) {
          confirmedUniversities.set(id, {
            id,
            nameEn: uni.nameEn,
            nameAr: uni.nameAr,
            isActive: uni.isActive,
            roles: ['revoker'],
          })
          rolesByUniversity[id] = ['revoker']
        }
      } catch (error) {
        console.error(`[AuthResolver] Error fetching university ${id}:`, error)
      }
    } else {
      confirmedUniversities.get(id)!.roles.push('revoker')
      rolesByUniversity[id].push('revoker')
    }
  }

  // Process verifier roles
  for (const uniId of blockchainRoles.verifierForUniversities) {
    const id = Number(uniId)
    if (!confirmedUniversities.has(id)) {
      try {
        const uni = await fetchUniversityFromBlockchain(id)
        if (uni && uni.isActive) {
          confirmedUniversities.set(id, {
            id,
            nameEn: uni.nameEn,
            nameAr: uni.nameAr,
            isActive: uni.isActive,
            roles: ['verifier'],
          })
          rolesByUniversity[id] = ['verifier']
        }
      } catch (error) {
        console.error(`[AuthResolver] Error fetching university ${id}:`, error)
      }
    } else {
      confirmedUniversities.get(id)!.roles.push('verifier')
      rolesByUniversity[id].push('verifier')
    }
  }

  const universities = Array.from(confirmedUniversities.values())

  return {
    authorized: universities.length > 0 || blockchainRoles.isContractOwner,
    walletAddress: normalizedWallet,
    universities,
    rolesByUniversity,
    isContractOwner: blockchainRoles.isContractOwner,
    cacheUntil: Date.now() + (30 * 1000), // 30 second cache
  }
}

/**
 * Check if wallet is authorized for a specific university
 */
export async function isAuthorizedForUniversity(
  walletAddress: string,
  universityId: number
): Promise<boolean> {
  const auth = await resolveAuthorization(walletAddress)
  return auth.universities.some(u => u.id === universityId)
}

/**
 * Get authorized universities for wallet (cached version)
 */
const authCache = new Map<string, { result: AuthorizationResult; expires: number }>()

export async function getCachedAuthorization(
  walletAddress: string,
  userId?: number,
  userType?: 'university' | 'issuer' | 'revoker' | 'verifier'
): Promise<AuthorizationResult> {
  const normalizedWallet = walletAddress.toLowerCase()
  const cacheKey = `${normalizedWallet}:${userId || ''}:${userType || ''}`
  
  const cached = authCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.result
  }

  const result = await resolveAuthorization(normalizedWallet, userId, userType)
  
  // Cache for 30 seconds
  authCache.set(cacheKey, {
    result,
    expires: Date.now() + (30 * 1000),
  })

  // Clean up expired entries
  if (authCache.size > 100) {
    for (const [key, value] of authCache.entries()) {
      if (value.expires <= Date.now()) {
        authCache.delete(key)
      }
    }
  }

  return result
}
