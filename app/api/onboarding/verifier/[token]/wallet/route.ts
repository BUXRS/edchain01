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

    // Find verifier by onboarding token
    const verifiers = await sql`
      SELECT v.id, v.university_id, v.nda_signed, v.wallet_submitted_at, v.name, v.email,
             u.name as university_name, u.admin_email, u.admin_name
      FROM verifiers v
      JOIN universities u ON v.university_id = u.id
      WHERE v.onboarding_token = ${token}
    `

    if (verifiers.length === 0) {
      return NextResponse.json(
        { error: "Invalid onboarding token" },
        { status: 404 }
      )
    }

    const verifier = verifiers[0]

    if (!verifier.nda_signed) {
      return NextResponse.json(
        { error: "NDA must be signed before submitting wallet address" },
        { status: 400 }
      )
    }

    if (verifier.wallet_submitted_at) {
      return NextResponse.json(
        { error: "Wallet address already submitted" },
        { status: 400 }
      )
    }

    // Check if wallet address is already used by another verifier in this university
    const existingWallet = await sql`
      SELECT id FROM verifiers 
      WHERE wallet_address = ${walletAddress.toLowerCase()} 
      AND university_id = ${verifier.university_id}
      AND id != ${verifier.id}
    `

    if (existingWallet.length > 0) {
      return NextResponse.json(
        { error: "This wallet address is already registered to another verifier in this university" },
        { status: 400 }
      )
    }

    // Update verifier with pending wallet address
    await sql`
      UPDATE verifiers
      SET 
        wallet_submitted_at = NOW(),
        pending_wallet_address = ${walletAddress.toLowerCase()},
        status = 'pending_activation',
        updated_at = NOW()
      WHERE id = ${verifier.id}
    `

    // Send notification to university admin
    try {
      await sendWalletSubmittedNotification({
        to: verifier.admin_email,
        adminName: verifier.admin_name || "Administrator",
        universityName: verifier.university_name,
        personName: verifier.name,
        personEmail: verifier.email,
        personRole: "verifier",
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
