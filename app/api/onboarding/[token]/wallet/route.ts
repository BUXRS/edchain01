import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

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

    // Find registration by onboarding token
    const registrations = await sql`
      SELECT ur.id, ur.university_id, ur.nda_signed, ur.wallet_submitted, u.name as university_name, u.admin_name
      FROM university_registrations ur
      JOIN universities u ON ur.university_id = u.id
      WHERE ur.onboarding_token = ${token}
    `

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "Invalid onboarding token" },
        { status: 404 }
      )
    }

    const registration = registrations[0]

    if (!registration.nda_signed) {
      return NextResponse.json(
        { error: "NDA must be signed before submitting wallet address" },
        { status: 400 }
      )
    }

    if (registration.wallet_submitted) {
      return NextResponse.json(
        { error: "Wallet address already submitted" },
        { status: 400 }
      )
    }

    // Check if wallet address is already used by another university
    const existingWallet = await sql`
      SELECT id FROM universities WHERE wallet_address = ${walletAddress.toLowerCase()}
    `

    if (existingWallet.length > 0) {
      return NextResponse.json(
        { error: "This wallet address is already registered to another university" },
        { status: 400 }
      )
    }

    // Update registration with wallet address
    await sql`
      UPDATE university_registrations
      SET 
        wallet_submitted = true,
        wallet_submitted_at = NOW(),
        wallet_address = ${walletAddress.toLowerCase()}
      WHERE id = ${registration.id}
    `

    // Create notification for super admin
    await sql`
      INSERT INTO admin_notifications (
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        action_url
      ) VALUES (
        'wallet_submitted',
        'University Wallet Submitted',
        ${`${registration.university_name} has submitted their wallet address and is ready for activation.`},
        'university',
        ${registration.university_id},
        ${`/admin/universities/${registration.university_id}`}
      )
    `

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
