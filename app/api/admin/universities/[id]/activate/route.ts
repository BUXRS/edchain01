import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { registerUniversity } from "@/lib/blockchain"
import { sendAccountActivatedEmail } from "@/lib/services/email-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { walletAddress } = body

    // Get university details
    const universities = await sql`
      SELECT 
        u.*,
        ur.is_trial,
        ur.trial_end_date,
        ur.nda_signed
      FROM universities u
      LEFT JOIN university_registrations ur ON u.id = ur.university_id
      WHERE u.id = ${id}
    `

    if (universities.length === 0) {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 }
      )
    }

    const university = universities[0]

    // Validate NDA is signed
    if (!university.nda_signed) {
      return NextResponse.json(
        { error: "University must sign NDA before activation" },
        { status: 400 }
      )
    }

    // Use provided wallet or existing wallet
    const finalWalletAddress = walletAddress || university.wallet_address

    if (!finalWalletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required for activation" },
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

    // Get blockchain ID from request (transaction already executed on frontend)
    const { blockchainId: providedBlockchainId, txHash } = body
    
    // Validate blockchain ID is provided (transaction was successful)
    if (!providedBlockchainId) {
      return NextResponse.json(
        { error: "Blockchain registration failed. University ID not received from transaction." },
        { status: 400 }
      )
    }

    const blockchainId = Number(providedBlockchainId)
    
    // Verify the blockchain ID is valid
    if (isNaN(blockchainId) || blockchainId <= 0) {
      return NextResponse.json(
        { error: "Invalid blockchain ID received from transaction" },
        { status: 400 }
      )
    }

    console.log(`[Activate] Updating database with blockchain_id: ${blockchainId}, wallet: ${finalWalletAddress}`)

    // Update university in database with blockchain ID and wallet
    // First, update essential fields (wallet_address is the primary wallet field)
    await sql`
      UPDATE universities
      SET 
        wallet_address = ${finalWalletAddress.toLowerCase()},
        is_active = true,
        status = 'active',
        blockchain_id = ${blockchainId},
        blockchain_verified = true,
        last_synced_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
    `

    // Try to update admin_wallet if the column exists (optional field)
    // This won't fail if the column doesn't exist - we'll just skip it
    try {
      await sql`
        UPDATE universities
        SET admin_wallet = ${finalWalletAddress.toLowerCase()}
        WHERE id = ${id}
      `
      console.log(`[Activate] ✅ admin_wallet updated`)
    } catch (adminWalletError: any) {
      // If admin_wallet column doesn't exist, that's okay - wallet_address is sufficient
      if (adminWalletError?.message?.includes('admin_wallet') || adminWalletError?.code === '42703') {
        console.warn(`[Activate] ⚠️ admin_wallet column not found, skipping. wallet_address is set instead.`)
      } else {
        // Re-throw if it's a different error
        throw adminWalletError
      }
    }

    console.log(`[Activate] ✅ Database updated: university_id=${id}, blockchain_id=${blockchainId}, wallet=${finalWalletAddress}`)

    // Update registration record
    await sql`
      UPDATE university_registrations
      SET 
        account_activated = true,
        wallet_address = ${finalWalletAddress.toLowerCase()}
      WHERE university_id = ${id}
    `

    // Send comprehensive activation email with all information
    try {
      console.log(`[Activate] 📧 Sending comprehensive activation email to ${university.admin_email}`)
      const emailResult = await sendAccountActivatedEmail({
        to: university.admin_email,
        universityName: university.name,
        adminName: university.admin_name,
        walletAddress: finalWalletAddress.toLowerCase(),
        blockchainId: blockchainId,
        txHash: txHash || undefined,
        adminEmail: university.admin_email,
        subscriptionType: university.subscription_type,
        expiresAt: university.subscription_expires_at
          ? new Date(university.subscription_expires_at).toLocaleDateString()
          : undefined,
        isTrial: university.is_trial || false,
      })
      
      if (!emailResult.success) {
        console.error(`[Activate] ❌ Failed to send activation email:`, emailResult.error)
        // Don't fail activation if email fails, but log it
      } else {
        console.log(`[Activate] ✅ Activation email sent successfully`)
      }
    } catch (emailError) {
      console.error("[Activate] ❌ Error sending activation email:", emailError)
      // Don't fail activation if email fails
    }

    // Log activity
    await sql`
      INSERT INTO activity_logs (
        action,
        entity_type,
        entity_id,
        details,
        created_at
      ) VALUES (
        'university_activated',
        'university',
        ${id},
        ${JSON.stringify({ walletAddress: finalWalletAddress, blockchainId })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "University activated successfully",
      blockchainId,
    })
  } catch (error: any) {
    console.error("[Activate] ❌ Error activating university:", error)
    
    // Provide more detailed error message
    const errorMessage = error?.message || "Failed to activate university"
    const statusCode = error?.statusCode || 500
    
    // If it's a database error, provide more context
    if (errorMessage.includes("database") || errorMessage.includes("SQL")) {
      console.error("[Activate] Database error details:", error)
      return NextResponse.json(
        { 
          error: `Database error: ${errorMessage}. Please check database connection and try again.`,
          details: process.env.NODE_ENV === "development" ? error?.stack : undefined
        },
        { status: statusCode }
      )
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: statusCode }
    )
  }
}
