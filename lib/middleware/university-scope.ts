/**
 * University Scope Middleware
 * 
 * Ensures all operations are scoped to the user's assigned university.
 * This enforces that issuers, revokers, and university admins can only
 * perform actions for their specific university.
 */

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { findUniversitiesWhereIssuer, findUniversitiesWhereRevoker } from "@/lib/blockchain"

export interface UniversityScopedSession {
  type: "issuer" | "revoker" | "university_admin"
  universityId: number
  universityName: string
  walletAddress?: string
  email?: string
  id?: number
}

/**
 * Get university-scoped session from cookies
 */
export async function getUniversityScopedSession(): Promise<UniversityScopedSession | null> {
  try {
    const cookieStore = await cookies()
    
    // Check issuer session
    const issuerSession = cookieStore.get("issuer_session")
    if (issuerSession) {
      const session = JSON.parse(issuerSession.value)
      if (session.universityId) {
        return {
          type: "issuer",
          universityId: session.universityId,
          universityName: session.universityName || "Unknown",
          walletAddress: session.walletAddress,
          email: session.email,
          id: session.id,
        }
      }
    }
    
    // Check revoker session
    const revokerSession = cookieStore.get("revoker_session")
    if (revokerSession) {
      const session = JSON.parse(revokerSession.value)
      if (session.universityId) {
        return {
          type: "revoker",
          universityId: session.universityId,
          universityName: session.universityName || "Unknown",
          walletAddress: session.walletAddress,
          email: session.email,
          id: session.id,
        }
      }
    }
    
    // Check university admin session
    const universitySession = cookieStore.get("university_session")
    if (universitySession) {
      const session = JSON.parse(universitySession.value)
      if (session.id) {
        return {
          type: "university_admin",
          universityId: session.id,
          universityName: session.name || "Unknown",
          email: session.email,
        }
      }
    }
    
    return null
  } catch (error) {
    console.error("[UniversityScope] Error reading session:", error)
    return null
  }
}

/**
 * Validate that the user has access to the specified university
 */
export async function validateUniversityAccess(
  session: UniversityScopedSession,
  requestedUniversityId: number
): Promise<boolean> {
  // University admins can only access their own university
  if (session.type === "university_admin") {
    return session.universityId === requestedUniversityId
  }
  
  // Issuers and revokers - verify on blockchain (source of truth)
  if (session.type === "issuer" && session.walletAddress) {
    try {
      const authorizedUniversities = await findUniversitiesWhereIssuer(session.walletAddress)
      return authorizedUniversities.some(u => Number(u.id) === requestedUniversityId)
    } catch (error) {
      console.error("[UniversityScope] Error validating issuer access:", error)
      return false
    }
  }
  
  if (session.type === "revoker" && session.walletAddress) {
    try {
      const authorizedUniversities = await findUniversitiesWhereRevoker(session.walletAddress)
      return authorizedUniversities.some(u => Number(u.id) === requestedUniversityId)
    } catch (error) {
      console.error("[UniversityScope] Error validating revoker access:", error)
      return false
    }
  }
  
  // Fallback: check session universityId matches
  return session.universityId === requestedUniversityId
}

/**
 * Middleware to enforce university scoping on API routes
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const session = await getUniversityScopedSession()
 *   if (!session) {
 *     return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
 *   }
 *   
 *   const body = await request.json()
 *   const universityId = body.universityId || session.universityId
 *   
 *   // Validate access
 *   const hasAccess = await validateUniversityAccess(session, universityId)
 *   if (!hasAccess) {
 *     return NextResponse.json({ error: "Access denied to this university" }, { status: 403 })
 *   }
 *   
 *   // Proceed with operation scoped to universityId
 * }
 * ```
 */

/**
 * Extract and validate university ID from request
 * Returns the session's universityId or validates requested universityId
 */
export async function getValidatedUniversityId(
  request: NextRequest,
  requestedUniversityId?: number | string | null
): Promise<{ universityId: number; session: UniversityScopedSession } | null> {
  const session = await getUniversityScopedSession()
  
  if (!session) {
    return null
  }
  
  // If no universityId requested, use session's universityId
  if (!requestedUniversityId) {
    return {
      universityId: session.universityId,
      session,
    }
  }
  
  const requestedId = Number(requestedUniversityId)
  
  // Validate access to requested university
  const hasAccess = await validateUniversityAccess(session, requestedId)
  
  if (!hasAccess) {
    return null
  }
  
  return {
    universityId: requestedId,
    session,
  }
}

/**
 * Require university-scoped session
 * Returns error response if no valid session
 */
export async function requireUniversitySession(): Promise<
  | { session: UniversityScopedSession; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getUniversityScopedSession()
  
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Unauthorized. Please log in to your university account." },
        { status: 401 }
      ),
    }
  }
  
  return {
    session,
    error: null,
  }
}
