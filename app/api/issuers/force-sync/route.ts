import { type NextRequest, NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { checkIsIssuerOnChain, fetchAllUniversities } from "@/lib/blockchain"

/**
 * POST /api/issuers/force-sync
 * Force syncs issuer status from blockchain to database
 * Body: { walletAddress: "0x..." }
 * 
 * This is a FORCED sync that will:
 * 1. Check blockchain for all universities where wallet is issuer
 * 2. Force insert/update database records
 * 3. Return the results
 */
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      )
    }

    const body = await request.json()
    const walletAddress = body.walletAddress

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      )
    }

    const normalizedAddress = walletAddress.toLowerCase()
    const results = {
      walletAddress: normalizedAddress,
      checkedUniversities: [] as any[],
      added: [] as any[],
      updated: [] as any[],
      errors: [] as string[],
    }

    console.log(`[ForceSync] Starting forced sync for wallet: ${normalizedAddress}`)

    // ✅ OPTIMIZED: Use getWalletRoles instead of checking each university individually
    // This is much more efficient and reduces RPC calls significantly
    const { getWalletRoles } = await import("@/lib/blockchain")
    let issuerUniversityIds: number[] = []
    
    try {
      console.log(`[ForceSync] Using getWalletRoles for efficient check...`)
      const roles = await getWalletRoles(normalizedAddress)
      issuerUniversityIds = roles.issuerForUniversities.map(id => Number(id))
      console.log(`[ForceSync] Found ${issuerUniversityIds.length} universities where wallet is issuer`)
    } catch (rolesError: any) {
      console.error(`[ForceSync] getWalletRoles failed, falling back to individual checks:`, rolesError)
      // Fallback: Check each university individually (slower but more reliable)
      const allUniversities = await fetchAllUniversities()
      console.log(`[ForceSync] Fallback: Checking ${allUniversities.length} universities individually...`)
      
      for (const uni of allUniversities) {
        const uniId = Number(uni.id)
        try {
          const isIssuer = await checkIsIssuerOnChain(uniId, normalizedAddress)
          if (isIssuer) {
            issuerUniversityIds.push(uniId)
          }
        } catch (error) {
          // Skip on error
          console.debug(`[ForceSync] Skipped university ${uniId}:`, error)
        }
      }
    }

    // Step 2: Process only the universities where wallet is issuer
    for (const uniId of issuerUniversityIds) {
      try {
        results.checkedUniversities.push({
          universityId: uniId,
          name: `University ${uniId}`,
          isIssuer: true,
        })

        console.log(`[ForceSync] ✅ Wallet IS issuer for university ${uniId}`)

        // Step 3: Get database university ID
        const dbUni = await sql`
          SELECT id, COALESCE(name_en, name) as name FROM universities WHERE blockchain_id = ${uniId} LIMIT 1
        `

        if (dbUni.length === 0) {
          results.errors.push(`University ${uniId} not found in database. Please sync universities first.`)
          continue
        }

        const dbUniversityId = dbUni[0].id
        const uniName = dbUni[0].name || `University ${uniId}`

        // Step 4: Force insert/update in database
        try {
          const existing = await sql`
            SELECT id, is_active FROM issuers 
            WHERE university_id = ${dbUniversityId} 
              AND wallet_address = ${normalizedAddress}
            LIMIT 1
          `

          if (existing.length === 0) {
            // Insert new issuer
            await sql`
              INSERT INTO issuers (
                university_id, 
                wallet_address, 
                is_active, 
                blockchain_verified, 
                last_verified_at,
                created_at,
                updated_at
              ) VALUES (
                ${dbUniversityId}, 
                ${normalizedAddress}, 
                true, 
                true, 
                NOW(),
                NOW(),
                NOW()
              )
            `
            results.added.push({
              universityId: uniId,
              dbUniversityId,
              name: uniName,
            })
            console.log(`[ForceSync] ✅ Added issuer to database for university ${uniId} (${uniName})`)
          } else {
            // Update existing issuer
            await sql`
              UPDATE issuers 
              SET 
                is_active = true,
                blockchain_verified = true,
                last_verified_at = NOW(),
                updated_at = NOW()
              WHERE university_id = ${dbUniversityId} 
                AND wallet_address = ${normalizedAddress}
            `
            results.updated.push({
              universityId: uniId,
              dbUniversityId,
              name: uniName,
              wasActive: existing[0].is_active,
            })
            console.log(`[ForceSync] ✅ Updated issuer in database for university ${uniId} (${uniName})`)
          }
        } catch (dbError: any) {
          const errorMsg = `Failed to sync university ${uniId}: ${dbError.message}`
          results.errors.push(errorMsg)
          console.error(`[ForceSync] ❌ ${errorMsg}`)
        }
      } catch (error: any) {
        const errorMsg = `Failed to process university ${uniId}: ${error.message}`
        results.errors.push(errorMsg)
        console.error(`[ForceSync] ❌ ${errorMsg}`)
      }
    }

    const success = results.added.length > 0 || results.updated.length > 0

    return NextResponse.json({
      success,
      message: success
        ? `Force sync completed. Added: ${results.added.length}, Updated: ${results.updated.length}`
        : "No issuers found on blockchain for this wallet",
      ...results,
    })
  } catch (error: any) {
    console.error("[ForceSync] Error:", error)
    return NextResponse.json(
      { error: "Failed to force sync", details: error.message },
      { status: 500 }
    )
  }
}
