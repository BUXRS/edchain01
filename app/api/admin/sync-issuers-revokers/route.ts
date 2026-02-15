/**
 * Force Sync Issuers and Revokers from Blockchain
 * 
 * This endpoint directly verifies existing DB records against blockchain
 * using contract calls (bypasses rate-limited event fetching)
 */

import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"
import { checkIsIssuerOnChain, checkIsRevokerOnChain } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const body = await request.json()
    const { universityId } = body

    if (!universityId) {
      return NextResponse.json({ error: "universityId is required" }, { status: 400 })
    }

    const uniId = Number(universityId)

    // Get database university ID
    const dbUniversity = await sql`
      SELECT id FROM universities WHERE blockchain_id = ${uniId} LIMIT 1
    `
    if (dbUniversity.length === 0) {
      return NextResponse.json({ error: `University ${uniId} not found in database` }, { status: 404 })
    }
    const dbUniversityId = dbUniversity[0].id

    const results = {
      issuers: { updated: 0, activated: 0, deactivated: 0, errors: [] as string[] },
      revokers: { updated: 0, activated: 0, deactivated: 0, errors: [] as string[] },
    }

    // ✅ SYNC ISSUERS: Verify each issuer directly against blockchain
    const dbIssuers = await sql`
      SELECT * FROM issuers WHERE university_id = ${dbUniversityId}
    `

    console.log(`[ForceSync] Verifying ${dbIssuers.length} issuers for university ${uniId}...`)
    
    for (const issuer of dbIssuers) {
      const normalizedAddress = issuer.wallet_address.toLowerCase()
      try {
        // Direct contract call (bypasses rate-limited event fetching)
        const isActiveOnChain = await checkIsIssuerOnChain(uniId, normalizedAddress)
        
        if (isActiveOnChain && !issuer.is_active) {
          // Activate - blockchain says active, DB says inactive
          await sql`
            UPDATE issuers 
            SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
            WHERE id = ${issuer.id}
          `
          results.issuers.activated++
          results.issuers.updated++
          console.log(`[ForceSync] ✅ Activated issuer ${normalizedAddress}`)
        } else if (!isActiveOnChain && issuer.is_active) {
          // Deactivate - blockchain says inactive, DB says active
          await sql`
            UPDATE issuers 
            SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
            WHERE id = ${issuer.id}
          `
          results.issuers.deactivated++
          results.issuers.updated++
          console.log(`[ForceSync] ⚠️ Deactivated issuer ${normalizedAddress}`)
        } else if (isActiveOnChain && issuer.is_active) {
          // Both active - just update verification
          await sql`
            UPDATE issuers 
            SET blockchain_verified = true, last_verified_at = NOW()
            WHERE id = ${issuer.id}
          `
        }
        
        // Add delay to prevent rate limiting (30-60 seconds)
        await new Promise(resolve => setTimeout(resolve, 30000 + Math.random() * 30000))
      } catch (error: any) {
        const errorMsg = `Failed to verify issuer ${normalizedAddress}: ${error.message}`
        results.issuers.errors.push(errorMsg)
        console.error(`[ForceSync] ❌ ${errorMsg}`)
      }
    }

    // ✅ SYNC REVOKERS: Verify each revoker directly against blockchain
    const dbRevokers = await sql`
      SELECT * FROM revokers WHERE university_id = ${dbUniversityId}
    `

    console.log(`[ForceSync] Verifying ${dbRevokers.length} revokers for university ${uniId}...`)
    
    for (const revoker of dbRevokers) {
      const normalizedAddress = revoker.wallet_address.toLowerCase()
      try {
        // Direct contract call (bypasses rate-limited event fetching)
        const isActiveOnChain = await checkIsRevokerOnChain(uniId, normalizedAddress)
        
        if (isActiveOnChain && !revoker.is_active) {
          // Activate - blockchain says active, DB says inactive
          await sql`
            UPDATE revokers 
            SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
            WHERE id = ${revoker.id}
          `
          results.revokers.activated++
          results.revokers.updated++
          console.log(`[ForceSync] ✅ Activated revoker ${normalizedAddress}`)
        } else if (!isActiveOnChain && revoker.is_active) {
          // Deactivate - blockchain says inactive, DB says active
          await sql`
            UPDATE revokers 
            SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
            WHERE id = ${revoker.id}
          `
          results.revokers.deactivated++
          results.revokers.updated++
          console.log(`[ForceSync] ⚠️ Deactivated revoker ${normalizedAddress}`)
        } else if (isActiveOnChain && revoker.is_active) {
          // Both active - just update verification
          await sql`
            UPDATE revokers 
            SET blockchain_verified = true, last_verified_at = NOW()
            WHERE id = ${revoker.id}
          `
        }
        
        // Add delay to prevent rate limiting (30-60 seconds)
        await new Promise(resolve => setTimeout(resolve, 30000 + Math.random() * 30000))
      } catch (error: any) {
        const errorMsg = `Failed to verify revoker ${normalizedAddress}: ${error.message}`
        results.revokers.errors.push(errorMsg)
        console.error(`[ForceSync] ❌ ${errorMsg}`)
      }
    }

    return NextResponse.json({
      success: true,
      universityId: uniId,
      results,
      message: `Synced ${results.issuers.updated} issuers and ${results.revokers.updated} revokers`
    })
  } catch (error: any) {
    console.error("[ForceSync] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync issuers/revokers" },
      { status: 500 }
    )
  }
}
