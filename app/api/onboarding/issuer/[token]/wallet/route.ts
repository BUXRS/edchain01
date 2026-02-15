import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendWalletSubmittedNotification } from "@/lib/services/email-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { walletAddress } = body

    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      )
    }

    // Find issuer by onboarding token
    const issuers = await sql`
      SELECT i.id, i.university_id, i.nda_signed, i.wallet_submitted_at, i.name, i.email,
             u.name as university_name, u.admin_email, u.admin_name
      FROM issuers i
      JOIN universities u ON i.university_id = u.id
      WHERE i.onboarding_token = ${token}
    `

    if (issuers.length === 0) {
      return NextResponse.json(
        { error: "Invalid onboarding token" },
        { status: 404 }
      )
    }

    const issuer = issuers[0]

    if (!issuer.nda_signed) {
      return NextResponse.json(
        { error: "NDA must be signed before submitting wallet address" },
        { status: 400 }
      )
    }

    if (issuer.wallet_submitted_at) {
      return NextResponse.json(
        { error: "Wallet address already submitted" },
        { status: 400 }
      )
    }

    // Check if wallet address is already used by another issuer in this university
    const existingWallet = await sql`
      SELECT id FROM issuers 
      WHERE wallet_address = ${walletAddress.toLowerCase()} 
      AND university_id = ${issuer.university_id}
      AND id != ${issuer.id}
    `

    if (existingWallet.length > 0) {
      return NextResponse.json(
        { error: "This wallet address is already registered to another issuer in this university" },
        { status: 400 }
      )
    }

    // Update issuer with pending wallet address
    await sql`
      UPDATE issuers
      SET 
        wallet_submitted_at = NOW(),
        pending_wallet_address = ${walletAddress.toLowerCase()},
        status = 'pending_activation',
        updated_at = NOW()
      WHERE id = ${issuer.id}
    `

    // Send notification to university admin
    try {
      await sendWalletSubmittedNotification({
        to: issuer.admin_email,
        adminName: issuer.admin_name || "Administrator",
        universityName: issuer.university_name,
        personName: issuer.name,
        personEmail: issuer.email,
        personRole: "issuer",
        walletAddress: walletAddress.toLowerCase(),
      })
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Wallet address submitted successfully. Awaiting admin activation.",
    })
  } catch (error) {
    console.error("Error submitting wallet:", error)
    return NextResponse.json(
      { error: "Failed to submit wallet address" },
      { status: 500 }
    )
  }
}
