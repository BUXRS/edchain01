/**
 * Issuers API - Dual Layer Pattern
 * 
 * GET: Read from database (fast), optionally verify against blockchain
 * POST: Record pending transaction, sync to DB after blockchain confirmation
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql, sqlJoin } from "@/lib/db"
import { transactionManager } from "@/lib/services/transaction-manager"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { checkIsIssuerOnChain } from "@/lib/blockchain"

// Fallback data for when DB is unavailable
const FALLBACK_ISSUERS: Array<{
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

    // If no universityId, return ALL issuers from all universities
    // ✅ BLOCKCHAIN FIRST: Sync from blockchain before returning
    if (!universityId) {
      try {
        // Get all universities and sync issuers for each
        const { fetchAllUniversities } = await import("@/lib/blockchain")
        const universities = await fetchAllUniversities()
        
        // Sync issuers for all universities (await to ensure DB is updated)
        // Use Promise.allSettled to continue even if some fail
        const syncResults = await Promise.allSettled(
          universities.map(uni => 
            blockchainSync.syncIssuersForUniversity(Number(uni.id)).catch(err => {
              console.warn(`[IssuersAPI] Sync failed for university ${uni.id}:`, err.message)
              return null
            })
          )
        )
        
        // Log sync results
        const successful = syncResults.filter(r => r.status === 'fulfilled').length
        const failed = syncResults.filter(r => r.status === 'rejected').length
        console.log(`[IssuersAPI] Sync completed: ${successful} successful, ${failed} failed`)

        // Return synced DB state (include all active issuers, not just blockchain_verified)
        const allIssuers = await sql`
          SELECT id, university_id, wallet_address, name, email, phone, department, position,
                 is_active, status, nda_signed_at, wallet_submitted_at, blockchain_added_at,
                 blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
          FROM issuers 
          WHERE is_active = true
          ORDER BY created_at DESC
        `
        
        console.log(`[IssuersAPI] Returning ${allIssuers.length} active issuers from database`)
        return NextResponse.json({ 
          issuers: allIssuers.map((i: { status?: string }) => ({
            ...i,
            walletAddress: i.wallet_address,
            universityId: i.university_id,
            isActive: i.is_active,
            onboardingStatus: i.status,
            ndaSignedAt: i.nda_signed_at,
            walletSubmittedAt: i.wallet_submitted_at,
            blockchainAddedAt: i.blockchain_added_at,
            blockchainVerified: i.blockchain_verified,
            txHash: i.tx_hash,
            lastVerifiedAt: i.last_verified_at,
            createdAt: i.created_at,
            updatedAt: i.updated_at,
          }))
        })
      } catch {
        return NextResponse.json({ issuers: [] })
      }
    }

    // If verifying a specific wallet, check blockchain first
    if (verify && wallet) {
      const verification = await blockchainSync.verifyIssuer(Number(universityId), wallet)
      return NextResponse.json({
        isIssuer: verification.isIssuer,
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

    // Run sync in background so we don't block on 429/slow RPC; return DB state immediately
    if (blockchainIdForSync != null) {
      void blockchainSync.syncIssuersForUniversity(blockchainIdForSync).catch((err) => {
        console.warn(`[IssuersAPI] Background sync failed for university ${blockchainIdForSync}:`, err)
      })
    }

    // Pagination and filters (same pattern as admin universities)
    const search = searchParams.get("search") || ""
    const statusFilter = searchParams.get("status") || "all"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const offset = (page - 1) * limit

    // Fetch from database by DB id (issuers.university_id is FK to universities.id)
    // Support both schemas: "status" (020) or "onboarding_status" (older); nda_signed optional
    type IssuerRow = {
      id: number
      university_id: number
      wallet_address: string | null
      name: string | null
      email: string | null
      phone: string | null
      department: string | null
      position: string | null
      is_active: boolean
      status?: string
      onboarding_status?: string
      nda_signed?: boolean
      nda_signed_at: string | null
      wallet_submitted_at: string | null
      blockchain_added_at: string | null
      blockchain_verified: boolean
      tx_hash: string | null
      last_verified_at: string | null
      created_at: string
      updated_at: string
    }

    try {
      // Base WHERE: university_id
      const baseConditions = [sql`university_id = ${dbUniversityId}`]
      if (search.trim()) {
        baseConditions.push(sql`(
          (name IS NOT NULL AND name ILIKE ${`%${search.trim()}%`}) OR
          (email IS NOT NULL AND email ILIKE ${`%${search.trim()}%`}) OR
          (wallet_address IS NOT NULL AND wallet_address ILIKE ${`%${search.trim()}%`}) OR
          CAST(id AS TEXT) = ${search.trim()}
        )`)
      }
      // Status filter: use only columns that exist in all schemas (no status/onboarding_status in WHERE)
      if (statusFilter === "active") {
        baseConditions.push(sql`is_active = true`)
        baseConditions.push(sql`blockchain_verified = true`)
      } else if (statusFilter === "pending") {
        baseConditions.push(sql`blockchain_verified = false`)
      }
      const whereClause = sqlJoin(baseConditions, sql` AND `)

      let issuers: IssuerRow[] = []
      let total = 0

      try {
        const countResult = await sql`
          SELECT COUNT(*) as count FROM issuers WHERE ${whereClause}
        `
        total = Number(countResult[0]?.count ?? 0)
        issuers = await sql`
          SELECT id, university_id, wallet_address, name, email, phone, department, position,
                 is_active, status, nda_signed_at, wallet_submitted_at, blockchain_added_at,
                 blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
          FROM issuers
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        ` as IssuerRow[]
      } catch (colErr: unknown) {
        const msg = colErr instanceof Error ? colErr.message : String(colErr)
        if (msg.includes("status") || msg.includes("column")) {
          const countResult = await sql`
            SELECT COUNT(*) as count FROM issuers WHERE university_id = ${dbUniversityId}
            ${search.trim() ? sql`AND ((name IS NOT NULL AND name ILIKE ${`%${search.trim()}%`}) OR (email IS NOT NULL AND email ILIKE ${`%${search.trim()}%`}) OR (wallet_address IS NOT NULL AND wallet_address ILIKE ${`%${search.trim()}%`}) OR CAST(id AS TEXT) = ${search.trim()})` : sql``}
            ${statusFilter === "active" ? sql`AND is_active = true AND blockchain_verified = true` : statusFilter === "pending" ? sql`AND blockchain_verified = false` : sql``}
          `
          total = Number(countResult[0]?.count ?? 0)
          issuers = await sql`
            SELECT id, university_id, wallet_address, name, email, phone, department, position,
                   is_active, onboarding_status, nda_signed_at, wallet_submitted_at, blockchain_added_at,
                   blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
            FROM issuers
            WHERE university_id = ${dbUniversityId}
            ${search.trim() ? sql`AND ((name IS NOT NULL AND name ILIKE ${`%${search.trim()}%`}) OR (email IS NOT NULL AND email ILIKE ${`%${search.trim()}%`}) OR (wallet_address IS NOT NULL AND wallet_address ILIKE ${`%${search.trim()}%`}) OR CAST(id AS TEXT) = ${search.trim()})` : sql``}
            ${statusFilter === "active" ? sql`AND is_active = true AND blockchain_verified = true` : statusFilter === "pending" ? sql`AND blockchain_verified = false` : sql``}
            ORDER BY created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
          ` as IssuerRow[]
        } else {
          throw colErr
        }
      }

      // Fallback: if no rows by DB id, try by blockchain id (legacy)
      if (issuers.length === 0 && total === 0 && blockchainIdForSync != null && blockchainIdForSync !== dbUniversityId) {
        try {
          issuers = await sql`
            SELECT id, university_id, wallet_address, name, email, phone, department, position,
                   is_active, status, nda_signed_at, wallet_submitted_at, blockchain_added_at,
                   blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
            FROM issuers
            WHERE university_id = ${blockchainIdForSync}
            ORDER BY created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
          ` as IssuerRow[]
          const tr = await sql`SELECT COUNT(*) as count FROM issuers WHERE university_id = ${blockchainIdForSync}`
          total = Number(tr[0]?.count ?? 0)
        } catch {
          issuers = await sql`
            SELECT id, university_id, wallet_address, name, email, phone, department, position,
                   is_active, onboarding_status, nda_signed_at, wallet_submitted_at, blockchain_added_at,
                   blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
            FROM issuers
            WHERE university_id = ${blockchainIdForSync}
            ORDER BY created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
          ` as IssuerRow[]
          const tr = await sql`SELECT COUNT(*) as count FROM issuers WHERE university_id = ${blockchainIdForSync}`
          total = Number(tr[0]?.count ?? 0)
        }
      }

      const onboardingStatus = (i: IssuerRow) => i.status ?? i.onboarding_status
      const walletSubmitted = (i: IssuerRow) => !!(i.wallet_submitted_at || (i.wallet_address && i.wallet_address.trim() !== ""))

      // Stats (same pattern as admin universities): total, onBlockchain, active, pending
      const statsResult = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE blockchain_verified = true) as on_blockchain,
          COUNT(*) FILTER (WHERE is_active = true AND blockchain_verified = true) as active,
          COUNT(*) FILTER (WHERE blockchain_verified = false) as pending
        FROM issuers
        WHERE university_id = ${dbUniversityId}
      `.catch(() => [{ total: total, on_blockchain: 0, active: 0, pending: 0 }])
      const stats = Array.isArray(statsResult) ? statsResult[0] : statsResult

      return NextResponse.json({
        issuers: issuers.map((i) => ({
          id: i.id,
          universityId: i.university_id,
          walletAddress: i.wallet_address,
          name: i.name,
          email: i.email,
          phone: i.phone,
          department: i.department,
          position: i.position,
          isActive: i.is_active,
          onboardingStatus: onboardingStatus(i),
          ndaSigned: (i as { nda_signed?: boolean }).nda_signed ?? !!i.nda_signed_at,
          ndaSignedAt: i.nda_signed_at,
          walletSubmitted: walletSubmitted(i),
          walletSubmittedAt: i.wallet_submitted_at,
          blockchainAddedAt: i.blockchain_added_at,
          blockchainVerified: i.blockchain_verified,
          txHash: i.tx_hash,
          lastVerifiedAt: i.last_verified_at,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          total: Number(stats?.total ?? total),
          onBlockchain: Number(stats?.on_blockchain ?? 0),
          active: Number(stats?.active ?? 0),
          pending: Number(stats?.pending ?? 0),
        },
        filters: { search: search || null, status: statusFilter === "all" ? null : statusFilter },
      })
    } catch {
      // Database unavailable, return fallback
      return NextResponse.json({
        issuers: FALLBACK_ISSUERS,
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        stats: { total: 0, onBlockchain: 0, active: 0, pending: 0 },
        filters: { search: null, status: null },
      })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch issuers",
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

    // Check if already an issuer on blockchain
    try {
      const isAlreadyIssuer = await checkIsIssuerOnChain(universityId, normalizedWallet)
      if (isAlreadyIssuer) {
        return NextResponse.json({ 
          error: "This address is already an issuer on the blockchain",
          alreadyExists: true
        }, { status: 409 })
      }
    } catch {
      // Blockchain check failed, continue with DB check
    }

    // Check if already exists in database
    try {
      const existing = await sql`
        SELECT * FROM issuers 
        WHERE university_id = ${universityId} AND wallet_address = ${normalizedWallet} AND is_active = true
      `
      if (existing.length > 0) {
        return NextResponse.json({ 
          error: "This address is already an issuer in our records",
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
        action: 'add_issuer',
        entityType: 'issuer',
        initiatedBy: normalizedAddedBy,
        universityId,
        data: { wallet: normalizedWallet, name, email }
      })
    }

    // Try to save to database
    try {
      const result = await sql`
        INSERT INTO issuers (university_id, wallet_address, name, email, added_by, is_active, tx_hash, blockchain_verified)
        VALUES (${universityId}, ${normalizedWallet}, ${name || null}, ${email || null}, ${normalizedAddedBy}, true, ${txHash || null}, ${!!txHash})
        ON CONFLICT (university_id, wallet_address) 
        DO UPDATE SET is_active = true, tx_hash = ${txHash || null}, blockchain_verified = ${!!txHash}
        RETURNING *
      `

      const issuer = result[0]
      return NextResponse.json({ 
        success: true,
        issuer: {
          id: issuer.id,
          universityId: issuer.university_id,
          walletAddress: issuer.wallet_address,
          name: issuer.name,
          email: issuer.email,
          isActive: issuer.is_active,
          txHash: issuer.tx_hash,
          blockchainVerified: issuer.blockchain_verified,
          createdAt: issuer.created_at
        },
        message: txHash ? "Issuer recorded. Awaiting blockchain confirmation." : "Issuer added to database."
      })
    } catch (dbError) {
      // Database write failed, but if we have txHash, the blockchain transaction may still succeed
      if (txHash) {
        return NextResponse.json({ 
          success: true,
          issuer: {
            universityId,
            walletAddress: normalizedWallet,
            name,
            email,
            isActive: true,
            txHash,
            blockchainVerified: false
          },
          message: "Database unavailable. Issuer will be synced after blockchain confirmation.",
          dbError: true
        })
      }
      
      return NextResponse.json({ 
        error: "Failed to save issuer to database",
        details: dbError instanceof Error ? dbError.message : "Unknown error"
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to create issuer",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// DELETE endpoint for removing issuers
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
        action: 'remove_issuer',
        entityType: 'issuer',
        initiatedBy: removedBy.toLowerCase(),
        universityId: Number(universityId),
        data: { wallet: normalizedWallet }
      })
    }

    // Mark as inactive in database
    try {
      await sql`
        UPDATE issuers 
        SET is_active = false
        WHERE university_id = ${Number(universityId)} AND wallet_address = ${normalizedWallet}
      `

      return NextResponse.json({ 
        success: true,
        message: txHash ? "Issuer removal recorded. Awaiting blockchain confirmation." : "Issuer removed from database."
      })
    } catch (dbError) {
      if (txHash) {
        return NextResponse.json({ 
          success: true,
          message: "Database unavailable. Issuer will be synced after blockchain confirmation.",
          dbError: true
        })
      }
      
      return NextResponse.json({ 
        error: "Failed to remove issuer from database"
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to remove issuer",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
