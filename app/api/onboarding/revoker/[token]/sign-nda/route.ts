import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    // Update revoker status to pending_wallet (DB column is "status" not "onboarding_status")
    const result = await sql`
      UPDATE revokers 
      SET status = 'pending_wallet',
          nda_signed_at = NOW(),
          updated_at = NOW()
      WHERE onboarding_token = ${token}
        AND status = 'pending_nda'
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Invalid token or already signed" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error signing NDA:", error)
    return NextResponse.json({ error: "Failed to sign agreement" }, { status: 500 })
  }
}
