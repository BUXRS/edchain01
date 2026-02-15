/**
 * Super Admin Authentication Middleware
 * 
 * Enforces Super Admin authorization on all admin API routes.
 * Must be called at the start of every admin API route handler.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getSession, verifyToken, type AdminUser } from "@/lib/auth"

/**
 * Require Super Admin session
 * Returns the authenticated admin user or an error response
 */
export async function requireAdmin(request: NextRequest): Promise<AdminUser | NextResponse> {
  try {
    // Try to get session from cookies (primary method)
    let user = await getSession()
    
    // If that fails, try reading cookie from request headers directly (fallback for direct API calls)
    if (!user) {
      const cookieHeader = request.headers.get("cookie")
      if (cookieHeader) {
        // Parse cookies more robustly
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
                cookies[key] = value // Use raw value if decode fails
              }
            }
          }
        })
        
        const token = cookies["auth_token"]
        if (token) {
          user = await verifyToken(token)
          if (user) {
            console.log(`[AdminAuth] Authenticated via cookie header fallback for ${user.email}`)
          }
        }
      }
    }
    
    if (!user) {
      // Log for debugging
      const cookieHeader = request.headers.get("cookie")
      const hasAuthToken = cookieHeader?.includes("auth_token")
      console.warn(`[AdminAuth] Unauthorized access attempt. Has auth_token cookie: ${hasAuthToken}, URL: ${request.url}`)
      
      return NextResponse.json(
        { error: "Unauthorized. Please log in as Super Admin." },
        { status: 401 }
      )
    }

    if (user.role !== "super_admin") {
      console.warn(`[AdminAuth] Forbidden: User ${user.email} has role ${user.role}, not super_admin`)
      return NextResponse.json(
        { error: "Forbidden. Super Admin privileges required." },
        { status: 403 }
      )
    }

    return user
  } catch (error: any) {
    console.error("[AdminAuth] Error checking admin session:", error)
    return NextResponse.json(
      { error: "Internal server error during authentication", details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Helper to check if response is an error response
 */
export function isErrorResponse(response: any): response is NextResponse {
  return response instanceof NextResponse && response.status >= 400
}
