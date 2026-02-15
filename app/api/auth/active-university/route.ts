/**
 * GET/POST active university (for multi-university issuer/revoker/verifier)
 * Cookie: active_university_id (DB id) or active_university_blockchain_id (chain id)
 */

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const COOKIE_NAME = "active_university_id"
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function GET() {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  const activeUniversityId = raw ? Number(raw) : null
  return NextResponse.json({ activeUniversityId })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const activeUniversityId = body?.activeUniversityId != null ? Number(body.activeUniversityId) : null
    const cookieStore = await cookies()
    if (activeUniversityId != null && !isNaN(activeUniversityId)) {
      cookieStore.set(COOKIE_NAME, String(activeUniversityId), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: MAX_AGE,
        path: "/",
      })
    } else {
      cookieStore.delete(COOKIE_NAME)
    }
    return NextResponse.json({ success: true, activeUniversityId })
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
}
