import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { fetchUniversityById } from "@/lib/blockchain"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get university from database
    const universities = await sql`
      SELECT * FROM universities WHERE id = ${id}
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
        { error: "University not registered on blockchain" },
        { status: 400 }
      )
    }

    // Fetch from blockchain
    const blockchainData = await fetchUniversityById(university.blockchain_id)

    if (!blockchainData) {
      return NextResponse.json(
        { error: "Failed to fetch blockchain data" },
        { status: 500 }
      )
    }

    // Update database with blockchain data
    // ✅ CRITICAL: Sync admin_wallet from blockchain (source of truth)
    const blockchainAdmin = blockchainData.admin?.toLowerCase() || null
    
    // First, update essential fields
    await sql`
      UPDATE universities
      SET 
        is_active = ${blockchainData.isActive},
        status = ${blockchainData.isActive ? 'active' : 'inactive'},
        wallet_address = ${blockchainAdmin || university.wallet_address},
        name_en = ${blockchainData.nameEn || university.name_en || university.name},
        blockchain_verified = true,
        last_synced_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
    `

    // Try to update admin_wallet if the column exists (optional field)
    try {
      await sql`
        UPDATE universities
        SET admin_wallet = ${blockchainAdmin || (university as any).admin_wallet || university.wallet_address}
        WHERE id = ${id}
      `
      console.log(`[Sync] ✅ admin_wallet updated`)
    } catch (adminWalletError: any) {
      // If admin_wallet column doesn't exist, that's okay - wallet_address is sufficient
      if (adminWalletError?.message?.includes('admin_wallet') || adminWalletError?.code === '42703') {
        console.warn(`[Sync] ⚠️ admin_wallet column not found, skipping. wallet_address is set instead.`)
      } else {
        // Re-throw if it's a different error
        throw adminWalletError
      }
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
        'blockchain_sync',
        'university',
        ${id},
        ${JSON.stringify({ blockchainId: university.blockchain_id, isActive: blockchainData.isActive })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "University synced successfully from blockchain",
      data: {
        blockchainId: university.blockchain_id,
        isActive: blockchainData.isActive,
        adminWallet: blockchainData.admin?.toLowerCase() || null,
        nameEn: blockchainData.nameEn || null,
        syncedFields: ['is_active', 'status', 'wallet_address', 'admin_wallet', 'name_en'],
        previousWalletAddress: university.wallet_address,
        previousAdminWallet: (university as any).admin_wallet,
        walletUpdated: blockchainData.admin?.toLowerCase() !== university.wallet_address?.toLowerCase()
      },
    })
  } catch (error) {
    console.error("Error syncing with blockchain:", error)
    return NextResponse.json(
      { error: "Failed to sync with blockchain" },
      { status: 500 }
    )
  }
}
