/**
 * Revokers API - Dual Layer Pattern
 * 
 * GET: Read from database (fast), optionally verify against blockchain
 * POST: Record pending transaction, sync to DB after blockchain confirmation
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { transactionManager } from "@/lib/services/transaction-manager"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { checkIsRevokerOnChain } from "@/lib/blockchain"

// Fallback revokers data for when database is unavailable
const FALLBACK_REVOKERS = [
  {
    id: 1,
    university_id: 1,
    wallet_address: "0x28049312d1cd8c60480562c0cde078b2cb7b233f",
    name: null,
    email: null,
    is_active: true,
    added_by: "0x28049312d1cd8c60480562c0cde078b2cb7b233f",
    blockchain_verified: true,
    created_at: "2026-01-17T17:40:03.446Z",
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const universityId = searchParams.get("universityId")
    const verify = searchParams.get("verify") === "true"
    const wallet = searchParams.get("wallet")

    // If no universityId, return ALL revokers from all universities
    // ✅ BLOCKCHAIN FIRST: Sync from blockchain before returning
    if (!universityId) {
      try {
        // Get all universities and sync revokers for each in parallel
        const { fetchAllUniversities } = await import("@/lib/blockchain")
        const universities = await fetchAllUniversities()
        
        // Sync revokers for all universities in parallel (much faster)
        // Use Promise.allSettled to continue even if some fail
        const syncResults = await Promise.allSettled(
          universities.map(uni => 
            blockchainSync.syncRevokersForUniversity(Number(uni.id)).catch(err => {
              console.warn(`[RevokersAPI] Sync failed for university ${uni.id}:`, err.message)
              return null
            })
          )
        )
        
        // Log sync results
        const successful = syncResults.filter(r => r.status === 'fulfilled').length
        const failed = syncResults.filter(r => r.status === 'rejected').length
        console.log(`[RevokersAPI] Sync completed: ${successful} successful, ${failed} failed`)

        // Return synced DB state (include all active revokers, not just blockchain_verified)
        const allRevokers = await sql`
          SELECT id, university_id, wallet_address, name, email, phone, department, position,
                 is_active, status, nda_signed_at, wallet_submitted_at, blockchain_added_at,
                 blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
          FROM revokers 
          WHERE is_active = true
          ORDER BY created_at DESC
        `
        
        console.log(`[RevokersAPI] Returning ${allRevokers.length} active revokers from database`)
        return NextResponse.json({ 
          revokers: allRevokers.map((r: Record<string, unknown>) => ({
            ...r,
            walletAddress: r.wallet_address,
            universityId: r.university_id,
            isActive: r.is_active,
            onboardingStatus: r.status ?? r.onboarding_status,
            ndaSignedAt: r.nda_signed_at,
            walletSubmittedAt: r.wallet_submitted_at,
            blockchainAddedAt: r.blockchain_added_at,
            blockchainVerified: r.blockchain_verified,
            txHash: r.tx_hash,
            lastVerifiedAt: r.last_verified_at,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }))
        })
      } catch {
        return NextResponse.json({ revokers: [] })
      }
    }

    // If verifying a specific wallet, check blockchain first
    if (verify && wallet) {
      const verification = await blockchainSync.verifyRevoker(Number(universityId), wallet)
      return NextResponse.json({
        isRevoker: verification.isRevoker,
        verified: verification.verified,
        source: verification.source
      })
    }

    // Resolve universityId to DB id (client may send DB id from session or blockchain id)
    const resolved = await sql`
      SELECT id, blockchain_id FROM universities
      WHERE id = ${Number(universityId)} OR blockchain_id = ${Number(universityId)}
      LIMIT 1
    `
    const dbUniversityId = resolved[0]?.id != null ? Number(resolved[0].id) : Number(universityId)
    const blockchainIdForSync = resolved[0]?.blockchain_id != null ? Number(resolved[0].blockchain_id) : null

    // Run sync in background so we don't block on rate limits; return DB state immediately
    if (blockchainIdForSync != null) {
      void blockchainSync.syncRevokersForUniversity(blockchainIdForSync).catch((err) => {
        console.warn(`[RevokersAPI] Background sync failed for university ${blockchainIdForSync}:`, err)
      })
    }

    // Fetch from database immediately (revokers table may have "status" or "onboarding_status")
    try {
      const revokers = await sql`
        SELECT id, university_id, wallet_address, name, email, phone, department, position,
               is_active, status, nda_signed_at, wallet_submitted_at, blockchain_added_at,
               blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
        FROM revokers 
        WHERE university_id = ${dbUniversityId}
        ORDER BY created_at DESC
      `

      return NextResponse.json({ 
        revokers: revokers.map((r: Record<string, unknown>) => ({
          ...r,
          walletAddress: r.wallet_address,
          universityId: r.university_id,
          isActive: r.is_active,
          onboardingStatus: r.status ?? r.onboarding_status,
          ndaSignedAt: r.nda_signed_at,
          walletSubmittedAt: r.wallet_submitted_at,
          blockchainAddedAt: r.blockchain_added_at,
          blockchainVerified: r.blockchain_verified,
          txHash: r.tx_hash,
          lastVerifiedAt: r.last_verified_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
      })
    } catch {
      // Database unavailable, return fallback
      const filteredFallback = FALLBACK_REVOKERS.filter(
        (r) => r.university_id === Number(universityId) && r.is_active
      )
      return NextResponse.json({ revokers: filteredFallback })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch revokers",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { universityId, walletAddress, name, email, addedBy, txHash } = body

    if (!universityId || !walletAddress || !addedBy) {
      return NextResponse.json({ 
        error: "University ID, wallet address, and addedBy are required" 
      }, { status: 400 })
    }

    // Normalize wallet address
    const normalizedWallet = walletAddress.toLowerCase()
    const normalizedAddedBy = addedBy.toLowerCase()

    // Check if already a revoker on blockchain
    try {
      const isAlreadyRevoker = await checkIsRevokerOnChain(universityId, normalizedWallet)
      if (isAlreadyRevoker) {
        return NextResponse.json({ 
          error: "This address is already a revoker on the blockchain",
          alreadyExists: true
        }, { status: 409 })
      }
    } catch {
      // Blockchain check failed, continue with DB check
    }

    // Check if already exists in database
    try {
      const existing = await sql`
        SELECT * FROM revokers 
        WHERE university_id = ${universityId} AND wallet_address = ${normalizedWallet} AND is_active = true
      `
      if (existing.length > 0) {
        return NextResponse.json({ 
          error: "This address is already a revoker in our records",
          alreadyExists: true
        }, { status: 409 })
      }
    } catch {
      // DB check failed, continue
    }

    // If txHash provided, record the pending transaction
    if (txHash) {
      await transactionManager.createPendingTransaction({
        txHash,
        action: 'add_revoker',
        entityType: 'revoker',
        initiatedBy: normalizedAddedBy,
        universityId,
        data: { wallet: normalizedWallet, name, email }
      })
    }

    // Try to save to database
    try {
      const result = await sql`
        INSERT INTO revokers (university_id, wallet_address, name, email, added_by, is_active, tx_hash, blockchain_verified)
        VALUES (${universityId}, ${normalizedWallet}, ${name || null}, ${email || null}, ${normalizedAddedBy}, true, ${txHash || null}, ${!!txHash})
        ON CONFLICT (university_id, wallet_address) 
        DO UPDATE SET is_active = true, tx_hash = ${txHash || null}, blockchain_verified = ${!!txHash}
        RETURNING *
      `

      const revoker = result[0]
      return NextResponse.json({ 
        success: true,
        revoker: {
          id: revoker.id,
          universityId: revoker.university_id,
          walletAddress: revoker.wallet_address,
          name: revoker.name,
          email: revoker.email,
          isActive: revoker.is_active,
          txHash: revoker.tx_hash,
          blockchainVerified: revoker.blockchain_verified,
          createdAt: revoker.created_at
        },
        message: txHash ? "Revoker recorded. Awaiting blockchain confirmation." : "Revoker added to database."
      })
    } catch (dbError) {
      // Database write failed, but if we have txHash, the blockchain transaction may still succeed
      if (txHash) {
        return NextResponse.json({ 
          success: true,
          revoker: {
            universityId,
            walletAddress: normalizedWallet,
            name,
            email,
            isActive: true,
            txHash,
            blockchainVerified: false
          },
          message: "Database unavailable. Revoker will be synced after blockchain confirmation.",
          dbError: true
        })
      }
      
      return NextResponse.json({ 
        error: "Failed to save revoker to database",
        details: dbError instanceof Error ? dbError.message : "Unknown error"
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to create revoker",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// DELETE endpoint for removing revokers
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const universityId = searchParams.get("universityId")
    const walletAddress = searchParams.get("wallet")
    const txHash = searchParams.get("txHash")
    const removedBy = searchParams.get("removedBy")

    if (!universityId || !walletAddress) {
      return NextResponse.json({ 
        error: "University ID and wallet address are required" 
      }, { status: 400 })
    }

    const normalizedWallet = walletAddress.toLowerCase()

    // If txHash provided, record the pending transaction
    if (txHash && removedBy) {
      await transactionManager.createPendingTransaction({
        txHash,
        action: 'remove_revoker',
        entityType: 'revoker',
        initiatedBy: removedBy.toLowerCase(),
        universityId: Number(universityId),
        data: { wallet: normalizedWallet }
      })
    }

    // Mark as inactive in database
    try {
      await sql`
        UPDATE revokers 
        SET is_active = false
        WHERE university_id = ${Number(universityId)} AND wallet_address = ${normalizedWallet}
      `

      return NextResponse.json({ 
        success: true,
        message: txHash ? "Revoker removal recorded. Awaiting blockchain confirmation." : "Revoker removed from database."
      })
    } catch (dbError) {
      if (txHash) {
        return NextResponse.json({ 
          success: true,
          message: "Database unavailable. Revoker will be synced after blockchain confirmation.",
          dbError: true
        })
      }
      
      return NextResponse.json({ 
        error: "Failed to remove revoker from database"
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to remove revoker",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
