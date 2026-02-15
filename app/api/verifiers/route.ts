/**
 * Verifiers API - Dual Layer Pattern
 * 
 * GET: Read from database (fast), optionally verify against blockchain
 * POST: Record pending transaction, sync to DB after blockchain confirmation
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { transactionManager } from "@/lib/services/transaction-manager"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { checkIsVerifierOnChain } from "@/lib/blockchain"

// Fallback data for when DB is unavailable
const FALLBACK_VERIFIERS: Array<{
  id: number
  university_id: number
  wallet_address: string
  is_active: boolean
  blockchain_verified: boolean
  created_at: string
}> = []

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const universityId = searchParams.get("universityId")
    const verify = searchParams.get("verify") === "true"
    const wallet = searchParams.get("wallet")

    // If no universityId, return ALL verifiers from all universities
    // ✅ BLOCKCHAIN FIRST: Sync from blockchain before returning
    if (!universityId) {
      try {
        // Get all universities and sync verifiers for each
        const { fetchAllUniversities } = await import("@/lib/blockchain")
        const universities = await fetchAllUniversities()
        
        // Sync verifiers for all universities (await to ensure DB is updated)
        // Use Promise.allSettled to continue even if some fail
        const syncResults = await Promise.allSettled(
          universities.map(uni => 
            blockchainSync.syncVerifiersForUniversity(Number(uni.id)).catch(err => {
              console.warn(`[VerifiersAPI] Sync failed for university ${uni.id}:`, err.message)
              return null
            })
          )
        )
        
        // Log sync results
        const successful = syncResults.filter(r => r.status === 'fulfilled').length
        const failed = syncResults.filter(r => r.status === 'rejected').length
        console.log(`[VerifiersAPI] Sync completed: ${successful} successful, ${failed} failed`)

        // Return synced DB state (include all active verifiers, not just blockchain_verified)
        const allVerifiers = await sql`
          SELECT id, university_id, wallet_address, name, email, phone, department, position,
                 is_active, status, nda_signed_at, wallet_submitted_at, blockchain_added_at,
                 blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
          FROM verifiers 
          WHERE is_active = true
          ORDER BY created_at DESC
        `
        
        console.log(`[VerifiersAPI] Returning ${allVerifiers.length} active verifiers from database`)
        return NextResponse.json({ 
          verifiers: allVerifiers.map((v: Record<string, unknown>) => ({
            ...v,
            walletAddress: v.wallet_address,
            universityId: v.university_id,
            isActive: v.is_active,
            onboardingStatus: v.status ?? v.onboarding_status,
            ndaSignedAt: v.nda_signed_at,
            walletSubmittedAt: v.wallet_submitted_at,
            blockchainAddedAt: v.blockchain_added_at,
            blockchainVerified: v.blockchain_verified,
            txHash: v.tx_hash,
            lastVerifiedAt: v.last_verified_at,
            createdAt: v.created_at,
            updatedAt: v.updated_at,
          }))
        })
      } catch {
        return NextResponse.json({ verifiers: [] })
      }
    }

    // If verifying a specific wallet, check blockchain first
    if (verify && wallet) {
      const verification = await blockchainSync.verifyVerifier(Number(universityId), wallet)
      return NextResponse.json({
        isVerifier: verification.isVerifier,
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
      void blockchainSync.syncVerifiersForUniversity(blockchainIdForSync).catch((err) => {
        console.warn(`[VerifiersAPI] Background sync failed for university ${blockchainIdForSync}:`, err)
      })
    }

    // Fetch from database immediately (verifiers table may have "status" or "onboarding_status")
    try {
      const verifiers = await sql`
        SELECT id, university_id, wallet_address, name, email, phone, department, position,
               is_active, status, nda_signed_at, wallet_submitted_at, blockchain_added_at,
               blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
        FROM verifiers 
        WHERE university_id = ${dbUniversityId} AND is_active = true
        ORDER BY created_at DESC
      `

      return NextResponse.json({ 
        verifiers: verifiers.map((v: Record<string, unknown>) => ({
          ...v,
          walletAddress: v.wallet_address,
          universityId: v.university_id,
          isActive: v.is_active,
          onboardingStatus: v.status ?? v.onboarding_status,
          ndaSignedAt: v.nda_signed_at,
          walletSubmittedAt: v.wallet_submitted_at,
          blockchainAddedAt: v.blockchain_added_at,
          blockchainVerified: v.blockchain_verified,
          txHash: v.tx_hash,
          lastVerifiedAt: v.last_verified_at,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
        }))
      })
    } catch (dbError) {
      // Database unavailable - fetch directly from blockchain (source of truth)
      console.warn(`[VerifiersAPI] Database unavailable, fetching from blockchain for university ${universityId}`)
      try {
        const { fetchVerifiersFromBlockchain } = await import("@/lib/blockchain-fetch-verifiers")
        const blockchainVerifiers = await fetchVerifiersFromBlockchain(Number(universityId))
        
        return NextResponse.json({
          verifiers: blockchainVerifiers.map((address: string, index: number) => ({
            id: index + 1,
            walletAddress: address,
            universityId: Number(universityId),
            isActive: true,
            blockchainVerified: true,
            createdAt: new Date().toISOString(),
          }))
        })
      } catch (blockchainError) {
        console.error(`[VerifiersAPI] Failed to fetch from blockchain:`, blockchainError)
        return NextResponse.json({ verifiers: [] })
      }
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch verifiers",
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

    // Check if already a verifier on blockchain
    try {
      const isAlreadyVerifier = await checkIsVerifierOnChain(universityId, normalizedWallet)
      if (isAlreadyVerifier) {
        return NextResponse.json({ 
          error: "This address is already a verifier on the blockchain",
          alreadyExists: true
        }, { status: 409 })
      }
    } catch {
      // Blockchain check failed, continue with DB check
    }

    // Check if already exists in database
    try {
      const existing = await sql`
        SELECT * FROM verifiers 
        WHERE university_id = ${universityId} AND wallet_address = ${normalizedWallet} AND is_active = true
      `
      if (existing.length > 0) {
        return NextResponse.json({ 
          error: "This address is already a verifier in our records",
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
        action: 'add_verifier',
        entityType: 'verifier',
        initiatedBy: normalizedAddedBy,
        universityId,
        data: { wallet: normalizedWallet, name, email }
      })
    }

    // Try to save to database
    try {
      const result = await sql`
        INSERT INTO verifiers (
          wallet_address, university_id, name, email, added_by, is_active, created_at
        )
        VALUES (
          ${normalizedWallet}, ${universityId}, ${name || null}, ${email || null}, 
          ${normalizedAddedBy}, true, NOW()
        )
        ON CONFLICT (wallet_address, university_id) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, verifiers.name),
          email = COALESCE(EXCLUDED.email, verifiers.email),
          is_active = true,
          updated_at = NOW()
        RETURNING *
      `

      return NextResponse.json({ 
        success: true,
        verifier: result[0]
      })
    } catch (error) {
      console.error("Error saving verifier to database:", error)
      return NextResponse.json({ 
        error: "Failed to save verifier to database",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to create verifier",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
