import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const verifiers = await sql`
      SELECT 
        v.id, v.name, v.email, v.status,
        v.nda_signed, v.nda_signature, v.nda_signed_at,
        v.wallet_submitted_at, v.pending_wallet_address,
        v.account_activated, v.account_activated_at,
        v.onboarding_token_expires_at,
        u.name as university_name, u.id as university_id
      FROM verifiers v
      JOIN universities u ON v.university_id = u.id
      WHERE v.onboarding_token = ${token}
    `

    if (verifiers.length === 0) {
      return NextResponse.json({ error: "Invalid or expired onboarding link" }, { status: 404 })
    }

    const verifier = verifiers[0]

    // Check if token is expired
    const tokenExpiry = verifier.onboarding_token_expires_at ? new Date(verifier.onboarding_token_expires_at) : null
    const isExpired = tokenExpiry ? new Date() > tokenExpiry : false

    return NextResponse.json({
      verifier: {
        id: verifier.id,
        name: verifier.name,
        email: verifier.email,
        universityName: verifier.university_name,
        universityId: verifier.university_id,
        status: verifier.status,
        ndaSigned: verifier.nda_signed || false,
        ndaSignature: verifier.nda_signature || null,
        ndaSignedAt: verifier.nda_signed_at || null,
        walletSubmitted: !!verifier.wallet_submitted_at,
        pendingWalletAddress: verifier.pending_wallet_address || null,
        walletSubmittedAt: verifier.wallet_submitted_at || null,
        accountActivated: verifier.account_activated || false,
        accountActivatedAt: verifier.account_activated_at || null,
        isExpired,
      }
    })
  } catch (error) {
    console.error("[v0] Error fetching verifier onboarding:", error)
    return NextResponse.json({ error: "Failed to fetch onboarding data" }, { status: 500 })
  }
}
