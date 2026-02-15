/**
 * Admin Auth Test Endpoint
 * 
 * Diagnostic endpoint to test Super Admin authentication
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"
import { getSession } from "@/lib/auth"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    // Get raw cookie info for debugging
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth_token")
    
    // Try to get session
    const session = await getSession()
    
    // Try requireAdmin
    const admin = await requireAdmin(request)
    
    return NextResponse.json({
      debug: {
        hasAuthTokenCookie: !!authToken,
        authTokenLength: authToken?.value?.length || 0,
        sessionExists: !!session,
        sessionRole: session?.role || null,
        requireAdminResult: isErrorResponse(admin) ? "ERROR" : "SUCCESS",
        requireAdminError: isErrorResponse(admin) ? (admin as any).error : null,
      },
      session: session ? {
        id: session.id,
        email: session.email,
        role: session.role,
        name: session.name,
      } : null,
      cookies: {
        cookieHeader: request.headers.get("cookie") || "No cookie header",
        authTokenFromCookie: authToken?.value ? "Present" : "Missing",
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Test failed", details: error.message },
      { status: 500 }
    )
  }
}
