import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendWalletSubmittedNotification } from "@/lib/services/email-service"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { walletAddress } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
    }

    const normalizedWallet = walletAddress.toLowerCase()
    // Update revoker with wallet address (normalized to lowercase to avoid duplicate rows)
    const result = await sql`
      UPDATE revokers 
      SET wallet_address = ${normalizedWallet},
          status = 'pending_blockchain',
          wallet_submitted_at = NOW(),
          updated_at = NOW()
      WHERE onboarding_token = ${token}
        AND status = 'pending_wallet'
      RETURNING id, name, email, university_id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Invalid token or wallet already submitted" }, { status: 400 })
    }

    const revoker = result[0]

    // Get university admin to send notification
    try {
      const universities = await sql`
        SELECT name, email, wallet_address FROM universities WHERE id = ${revoker.university_id}
      `
      
      if (universities.length > 0) {
        const university = universities[0]
        await sendWalletSubmittedNotification({
          to: university.email,
          adminName: "Administrator",
          universityName: university.name,
          personName: revoker.name,
          personEmail: revoker.email,
          personRole: "revoker",
          walletAddress,
        })
      }
    } catch (emailError) {
      console.error("[v0] Failed to send notification email:", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error submitting wallet:", error)
    return NextResponse.json({ error: "Failed to submit wallet" }, { status: 500 })
  }
}
