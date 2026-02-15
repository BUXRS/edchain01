import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const university = await requireUniversity(request)
    if (isErrorResponse(university)) return university

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { walletAddress, txHash } = body

    if (!id) {
      return NextResponse.json({ error: "Verifier ID required" }, { status: 400 })
    }

    const universityId = Number(university.id)
    // Get verifier details (must belong to this university)
    const verifiers = await sql`
      SELECT 
        v.*,
        u.name as university_name,
        u.id as university_id
      FROM verifiers v
      JOIN universities u ON v.university_id = u.id
      WHERE v.id = ${Number(id)} AND v.university_id = ${universityId}
    `

    if (verifiers.length === 0) {
      return NextResponse.json({ error: "Verifier not found" }, { status: 404 })
    }

    const verifier = verifiers[0]

    // Validate NDA is signed
    if (!verifier.nda_signed) {
      return NextResponse.json(
        { error: "Verifier must sign NDA before activation" },
        { status: 400 }
      )
    }

    // Get pending wallet address or use provided wallet
    const finalWalletAddress = walletAddress || verifier.pending_wallet_address || verifier.wallet_address

    if (!finalWalletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required for activation. Please provide wallet address or ensure verifier has submitted one." },
        { status: 400 }
      )
    }

    // Validate wallet format
    if (!/^0x[a-fA-F0-9]{40}$/.test(finalWalletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      )
    }

    // Check if wallet is already used by another verifier in this university
    const existingWallet = await sql`
      SELECT id FROM verifiers 
      WHERE wallet_address = ${finalWalletAddress.toLowerCase()} 
      AND university_id = ${verifier.university_id}
      AND id != ${Number(id)}
    `

    if (existingWallet.length > 0) {
      return NextResponse.json(
        { error: "This wallet address is already registered to another verifier in this university" },
        { status: 400 }
      )
    }

    // Check verifier count limit (max 3) - should be enforced by smart contract too
    const verifierCount = await sql`
      SELECT COUNT(*) as count FROM verifiers 
      WHERE university_id = ${verifier.university_id} 
      AND is_active = true 
      AND id != ${Number(id)}
    `
    const count = Number(verifierCount[0]?.count || 0)
    if (count >= 3) {
      return NextResponse.json(
        { error: "Maximum 3 verifiers allowed per university" },
        { status: 400 }
      )
    }

    // Note: Blockchain registration (addVerifier) should be done on frontend by University Admin
    // This endpoint prepares the database. Frontend will call addVerifier() then call this with txHash

    // Update verifier in database
    await sql`
      UPDATE verifiers
      SET 
        wallet_address = ${finalWalletAddress.toLowerCase()},
        pending_wallet_address = NULL,
        is_active = true,
        status = 'active',
        account_activated = true,
        account_activated_at = NOW(),
        blockchain_verified = ${!!txHash},
        tx_hash = ${txHash || null},
        updated_at = NOW()
      WHERE id = ${Number(id)}
    `

    // Send role-specific activation email
    try {
      const { sendRoleActivationEmail } = await import("@/lib/services/email-service")
      await sendRoleActivationEmail({
        to: verifier.email,
        roleName: verifier.name,
        universityName: verifier.university_name,
        personName: verifier.name,
        walletAddress: finalWalletAddress.toLowerCase(),
        role: "verifier",
      })
    } catch (emailError) {
      console.error("Failed to send activation email:", emailError)
    }

    // Log activity
    try {
      await sql`
        INSERT INTO activity_logs (
          action,
          entity_type,
          entity_id,
          details,
          created_at
        ) VALUES (
          'verifier_activated',
          'verifier',
          ${Number(id)},
          ${JSON.stringify({ walletAddress: finalWalletAddress, txHash })},
          NOW()
        )
      `
    } catch (logError) {
      console.error("Failed to log activity:", logError)
    }

    return NextResponse.json({ 
      success: true,
      message: "Verifier activated successfully",
      verifier: {
        id: verifier.id,
        name: verifier.name,
        email: verifier.email,
        walletAddress: finalWalletAddress.toLowerCase(),
        blockchainVerified: !!txHash,
      }
    })
  } catch (error) {
    console.error("Error activating verifier:", error)
    return NextResponse.json({ error: "Failed to activate verifier" }, { status: 500 })
  }
}
