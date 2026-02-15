/**
 * Authentication & Authorization Middleware
 * 
 * Enforces the two-step security model:
 * 1. Authentication (session exists)
 * 2. Authorization (wallet linked + on-chain verified)
 * 
 * Usage in API routes:
 * ```ts
 * const auth = await requireAuth(request)
 * if (!auth.authenticated) return 401
 * if (!auth.authorized) return 403 WALLET_REQUIRED
 * ```
 */

import { type NextRequest, NextResponse } from "next/server"
import { getSession, getUniversitySession } from "@/lib/auth"
import { getCachedAuthorization } from "@/lib/auth/authorization-resolver"
import { cookies } from "next/headers"

export interface AuthContext {
  authenticated: boolean
  authorized: boolean
  userId?: number
  userType?: 'admin' | 'university' | 'issuer' | 'revoker' | 'verifier'
  walletAddress?: string
  universities: Array<{ id: number; roles: string[] }>
  isContractOwner: boolean
  error?: string
  errorCode?: 'UNAUTHENTICATED' | 'WALLET_REQUIRED' | 'NOT_AUTHORIZED'
}

/**
 * Require authentication (session must exist)
 * Returns 401 if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext | NextResponse> {
  const cookieStore = await cookies()
  
  // Check for admin session
  const adminSession = await getSession()
  if (adminSession) {
    return {
      authenticated: true,
      authorized: true, // Super admin is always authorized
      userId: Number(adminSession.id),
      userType: 'admin',
      universities: [],
      isContractOwner: false,
    }
  }

  // Check for university session
  const universitySession = await getUniversitySession()
  if (universitySession) {
    const walletAddress = universitySession.walletAddress
    
    if (!walletAddress) {
      return {
        authenticated: true,
        authorized: false,
        userId: universitySession.id,
        userType: 'university',
        walletAddress: undefined,
        universities: [],
        isContractOwner: false,
        error: "Wallet connection required",
        errorCode: 'WALLET_REQUIRED',
      }
    }

    // Verify authorization on-chain
    const auth = await getCachedAuthorization(
      walletAddress,
      universitySession.id,
      'university'
    )

    return {
      authenticated: true,
      authorized: auth.authorized,
      userId: universitySession.id,
      userType: 'university',
      walletAddress,
      universities: auth.universities.map(u => ({
        id: u.id,
        roles: u.roles,
      })),
      isContractOwner: auth.isContractOwner,
      error: auth.authorized ? undefined : "Not authorized on blockchain",
      errorCode: auth.authorized ? undefined : 'NOT_AUTHORIZED',
    }
  }

  // Check for issuer/revoker/verifier sessions
  const issuerSession = cookieStore.get("issuer_session")?.value
  const revokerSession = cookieStore.get("revoker_session")?.value
  const verifierSession = cookieStore.get("verifier_session")?.value

  if (issuerSession) {
    try {
      const session = JSON.parse(issuerSession)
      if (session.walletAddress) {
        const auth = await getCachedAuthorization(
          session.walletAddress,
          session.id,
          'issuer'
        )
        return {
          authenticated: true,
          authorized: auth.authorized,
          userId: session.id,
          userType: 'issuer',
          walletAddress: session.walletAddress,
          universities: auth.universities.map(u => ({
            id: u.id,
            roles: u.roles,
          })),
          isContractOwner: auth.isContractOwner,
          error: auth.authorized ? undefined : "Not authorized on blockchain",
          errorCode: auth.authorized ? undefined : 'NOT_AUTHORIZED',
        }
      }
    } catch {}
  }

  if (revokerSession) {
    try {
      const session = JSON.parse(revokerSession)
      if (session.walletAddress) {
        const auth = await getCachedAuthorization(
          session.walletAddress,
          session.id,
          'revoker'
        )
        return {
          authenticated: true,
          authorized: auth.authorized,
          userId: session.id,
          userType: 'revoker',
          walletAddress: session.walletAddress,
          universities: auth.universities.map(u => ({
            id: u.id,
            roles: u.roles,
          })),
          isContractOwner: auth.isContractOwner,
          error: auth.authorized ? undefined : "Not authorized on blockchain",
          errorCode: auth.authorized ? undefined : 'NOT_AUTHORIZED',
        }
      }
    } catch {}
  }

  if (verifierSession) {
    try {
      const session = JSON.parse(verifierSession)
      if (session.walletAddress) {
        const auth = await getCachedAuthorization(
          session.walletAddress,
          session.id,
          'verifier'
        )
        return {
          authenticated: true,
          authorized: auth.authorized,
          userId: session.id,
          userType: 'verifier',
          walletAddress: session.walletAddress,
          universities: auth.universities.map(u => ({
            id: u.id,
            roles: u.roles,
          })),
          isContractOwner: auth.isContractOwner,
          error: auth.authorized ? undefined : "Not authorized on blockchain",
          errorCode: auth.authorized ? undefined : 'NOT_AUTHORIZED',
        }
      }
    } catch {}
  }

  // Not authenticated
  return {
    authenticated: false,
    authorized: false,
    universities: [],
    isContractOwner: false,
    error: "Authentication required",
    errorCode: 'UNAUTHENTICATED',
  }
}

/**
 * Require authorization (wallet must be linked and verified)
 * Returns 403 if not authorized
 */
export async function requireAuthorization(
  request: NextRequest,
  requiredUniversityId?: number
): Promise<AuthContext | NextResponse> {
  const auth = await requireAuth(request)
  
  if (auth instanceof NextResponse) {
    return auth
  }

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    )
  }

  if (!auth.authorized) {
    if (auth.errorCode === 'WALLET_REQUIRED') {
      return NextResponse.json(
        { 
          error: "Wallet connection required",
          code: "WALLET_REQUIRED",
          message: "Please connect your MetaMask wallet to access this resource."
        },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Not authorized",
        code: "NOT_AUTHORIZED",
        message: "Your wallet is not authorized on the blockchain for this action."
      },
      { status: 403 }
    )
  }

  // Check university-specific authorization
  if (requiredUniversityId) {
    const hasAccess = auth.universities.some(u => u.id === requiredUniversityId)
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: "Access denied",
          code: "UNIVERSITY_ACCESS_DENIED",
          message: `You are not authorized to access university ${requiredUniversityId}.`
        },
        { status: 403 }
      )
    }
  }

  return auth
}
