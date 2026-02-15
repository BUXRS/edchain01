import { type NextRequest, NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { getWalletRoles, fetchUniversityFromBlockchain } from "@/lib/blockchain"

/**
 * POST /api/verifiers/force-sync
 * Force syncs verifier status from blockchain to database
 * Body: { walletAddress: "0x..." }
 * 
 * This is a FORCED sync that will:
 * 1. Check blockchain for all universities where wallet is verifier
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

    console.log(`[ForceSync] Starting forced sync for verifier wallet: ${normalizedAddress}`)

    // ✅ OPTIMIZED: Use getWalletRoles instead of checking each university individually
    // This is much more efficient and reduces RPC calls significantly
    let verifierUniversityIds: number[] = []
    
    try {
      console.log(`[ForceSync] Using getWalletRoles for efficient check...`)
      const roles = await getWalletRoles(normalizedAddress)
      verifierUniversityIds = roles.verifierForUniversities.map(id => Number(id))
      console.log(`[ForceSync] Found ${verifierUniversityIds.length} universities where wallet is verifier`)
    } catch (rolesError: any) {
      console.error(`[ForceSync] getWalletRoles failed, falling back to individual checks:`, rolesError)
      // Fallback: This shouldn't happen, but handle gracefully
      results.errors.push(`Failed to fetch verifier roles: ${rolesError.message}`)
    }

    // Step 2: Process only the universities where wallet is verifier
    for (const uniId of verifierUniversityIds) {
      try {
        // Fetch university name from blockchain
        let uniName = `University ${uniId}`
        try {
          const uni = await fetchUniversityFromBlockchain(uniId)
          if (uni) {
            uniName = uni.nameEn || uni.nameAr || uniName
          }
        } catch (error) {
          console.debug(`[ForceSync] Could not fetch university ${uniId} name from blockchain`)
        }

        results.checkedUniversities.push({
          universityId: uniId,
          name: uniName,
          isVerifier: true,
        })

        console.log(`[ForceSync] ✅ Wallet IS verifier for university ${uniId} (${uniName})`)

        // Step 3: Get database university ID
        const dbUni = await sql`
          SELECT id, COALESCE(name_en, name) as name FROM universities WHERE blockchain_id = ${uniId} LIMIT 1
        `

        if (dbUni.length === 0) {
          results.errors.push(`University ${uniId} not found in database. Please sync universities first.`)
          continue
        }

        const dbUniversityId = dbUni[0].id
        const finalUniName = dbUni[0].name || uniName

        // Step 4: Force insert/update in database
        try {
          const existing = await sql`
            SELECT id, is_active FROM verifiers 
            WHERE university_id = ${dbUniversityId} 
              AND wallet_address = ${normalizedAddress}
            LIMIT 1
          `

          if (existing.length === 0) {
            // Insert new verifier
            await sql`
              INSERT INTO verifiers (
                university_id, 
                wallet_address, 
                is_active, 
                created_at,
                updated_at
              ) VALUES (
                ${dbUniversityId}, 
                ${normalizedAddress}, 
                true, 
                NOW(),
                NOW()
              )
            `
            results.added.push({
              universityId: uniId,
              dbUniversityId,
              name: finalUniName,
            })
            console.log(`[ForceSync] ✅ Added verifier to database for university ${uniId} (${finalUniName})`)
          } else {
            // Update existing verifier
            await sql`
              UPDATE verifiers 
              SET 
                is_active = true,
                updated_at = NOW()
              WHERE university_id = ${dbUniversityId} 
                AND wallet_address = ${normalizedAddress}
            `
            results.updated.push({
              universityId: uniId,
              dbUniversityId,
              name: finalUniName,
              wasActive: existing[0].is_active,
            })
            console.log(`[ForceSync] ✅ Updated verifier in database for university ${uniId} (${finalUniName})`)
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
        : "No verifiers found on blockchain for this wallet",
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
