import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { fetchUniversityFromBlockchain } from "@/lib/blockchain"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

/**
 * Fix admin wallet mismatch by syncing from blockchain
 * This endpoint syncs the admin_wallet field from blockchain (source of truth)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require admin authentication
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { id } = await params

    // Get university from database
    const universities = await sql`
      SELECT id, blockchain_id, name, wallet_address, admin_wallet
      FROM universities 
      WHERE id = ${id}
    `

    if (universities.length === 0) {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 }
      )
    }

    const university = universities[0]

    if (!university.blockchain_id) {
      return NextResponse.json(
        { error: "University not registered on blockchain. Cannot sync admin wallet." },
        { status: 400 }
      )
    }

    // Fetch from blockchain (source of truth)
    const blockchainData = await fetchUniversityFromBlockchain(Number(university.blockchain_id))

    if (!blockchainData) {
      return NextResponse.json(
        { error: "Failed to fetch university data from blockchain" },
        { status: 500 }
      )
    }

    const blockchainAdmin = blockchainData.admin?.toLowerCase() || null

    if (!blockchainAdmin) {
      return NextResponse.json(
        { error: "Blockchain data does not contain admin address" },
        { status: 500 }
      )
    }

    // Check for mismatch
    const dbWallet = university.wallet_address?.toLowerCase() || ""
    const dbAdminWallet = (university as any).admin_wallet?.toLowerCase() || ""
    const hasMismatch = dbWallet !== blockchainAdmin || dbAdminWallet !== blockchainAdmin

    // Update database with blockchain admin wallet (source of truth)
    await sql`
      UPDATE universities
      SET 
        wallet_address = ${blockchainAdmin},
        admin_wallet = ${blockchainAdmin},
        blockchain_verified = true,
        last_synced_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
    `

    // Log activity
    await sql`
      INSERT INTO activity_logs (
        action,
        entity_type,
        entity_id,
        details,
        created_at
      ) VALUES (
        'admin_wallet_synced',
        'university',
        ${id},
        ${JSON.stringify({ 
          previous_wallet_address: dbWallet,
          previous_admin_wallet: dbAdminWallet,
          blockchain_admin: blockchainAdmin,
          had_mismatch: hasMismatch
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Admin wallet synced from blockchain",
      data: {
        universityId: university.id,
        blockchainId: university.blockchain_id,
        previousWalletAddress: dbWallet,
        previousAdminWallet: dbAdminWallet,
        blockchainAdmin: blockchainAdmin,
        hadMismatch: hasMismatch,
        fixed: true
      }
    })
  } catch (error: any) {
    console.error("[FixAdminWallet] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync admin wallet from blockchain" },
      { status: 500 }
    )
  }
}
