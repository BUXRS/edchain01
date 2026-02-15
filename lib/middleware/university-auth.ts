/**
 * University Admin Authentication Middleware
 *
 * Enforces University Admin authorization on university-scoped API routes.
 * Same pattern as Super Admin (requireAdmin): session from cookie, return user or error.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getUniversitySession, verifyUniversityToken, type UniversityUser } from "@/lib/auth"

/**
 * Require University Admin session
 * Returns the authenticated university user or an error response
 */
export async function requireUniversity(request: NextRequest): Promise<UniversityUser | NextResponse> {
  try {
    let university = await getUniversitySession()

    if (!university) {
      const cookieHeader = request.headers.get("cookie")
      if (cookieHeader) {
        const cookies: Record<string, string> = {}
        cookieHeader.split(";").forEach((cookie) => {
          const trimmed = cookie.trim()
          const equalIndex = trimmed.indexOf("=")
          if (equalIndex > 0) {
            const key = trimmed.substring(0, equalIndex).trim()
            const value = trimmed.substring(equalIndex + 1).trim()
            if (key && value) {
              try {
                cookies[key] = decodeURIComponent(value)
              } catch {
                cookies[key] = value
              }
            }
          }
        })
        const token = cookies["university_token"]
        if (token) {
          university = await verifyUniversityToken(token)
        }
      }
    }

    if (!university?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in as a university admin." },
        { status: 401 }
      )
    }

    return university
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[UniversityAuth] Error checking university session:", error)
    return NextResponse.json(
      { error: "Internal server error during authentication", details: message },
      { status: 500 }
    )
  }
}

export function isErrorResponse(response: unknown): response is NextResponse {
  return response instanceof NextResponse && response.status >= 400
}
