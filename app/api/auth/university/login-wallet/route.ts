import { type NextRequest, NextResponse } from "next/server"
import { setUniversitySession } from "@/lib/auth"
import { findUniversityByAdmin, getWalletRoles, fetchUniversityFromBlockchain } from "@/lib/blockchain"
import { getUniversityByWallet, isDatabaseAvailable, getDbUniversityIdFromSessionId } from "@/lib/db"

/**
 * Wallet-based login for University Admin
 * Checks if wallet is authorized as university admin on blockchain
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    // Normalize wallet address
    const normalizedWallet = walletAddress.toLowerCase()

    // ✅ STEP 1: Check database first (DB-first approach)
    let dbUniversity = null
    let blockchainUniversity = null
    
    if (isDatabaseAvailable()) {
      try {
        dbUniversity = await getUniversityByWallet(normalizedWallet)
        console.log(`[WalletLogin] Found university in DB:`, dbUniversity ? `ID ${dbUniversity.id}` : 'not found')
      } catch (dbError) {
        console.warn("[WalletLogin] Database lookup failed:", dbError)
      }
    }

    // ✅ STEP 2: Verify on blockchain
    // Method 1: If we have blockchain_id from DB, verify directly (fastest)
    if (dbUniversity && dbUniversity.blockchain_id) {
      try {
        blockchainUniversity = await fetchUniversityFromBlockchain(Number(dbUniversity.blockchain_id))
        
        // Verify the admin wallet matches
        if (blockchainUniversity && blockchainUniversity.admin.toLowerCase() === normalizedWallet) {
          console.log(`[WalletLogin] ✅ Verified on blockchain using blockchain_id ${dbUniversity.blockchain_id}`)
        } else {
          console.warn(`[WalletLogin] ⚠️ Wallet mismatch: DB blockchain_id ${dbUniversity.blockchain_id}, blockchain admin: ${blockchainUniversity?.admin}`)
          blockchainUniversity = null
        }
      } catch (blockchainError) {
        console.error("[WalletLogin] ❌ Blockchain verification failed:", blockchainError)
        // Continue with DB data if blockchain verification fails
      }
    }
    
    // Method 2: Use getWalletRoles (more efficient than scanning all universities)
    if (!blockchainUniversity) {
      try {
        const roles = await getWalletRoles(normalizedWallet)
        if (roles.adminOfUniversities && roles.adminOfUniversities.length > 0) {
          const blockchainUniId = roles.adminOfUniversities[0]
          blockchainUniversity = await fetchUniversityFromBlockchain(blockchainUniId)
          console.log(`[WalletLogin] ✅ Found university on blockchain via getWalletRoles: ID ${blockchainUniId}`)
        }
      } catch (rolesError) {
        console.error("[WalletLogin] ❌ getWalletRoles failed:", rolesError)
        // Fallback to findUniversityByAdmin (slower but more thorough)
        try {
          blockchainUniversity = await findUniversityByAdmin(normalizedWallet)
          console.log(`[WalletLogin] Found via findUniversityByAdmin:`, blockchainUniversity ? `ID ${blockchainUniversity.id}` : 'not found')
        } catch (findError) {
          console.error("[WalletLogin] ❌ findUniversityByAdmin also failed:", findError)
        }
      }
    }

    // ✅ STEP 3: Determine if wallet is authorized
    // DB-first: If found in DB, allow login even if blockchain verification fails
    if (!dbUniversity && !blockchainUniversity) {
      return NextResponse.json(
        { 
          error: "This wallet is not registered as a university admin. Please ensure your university is activated on the blockchain.",
          requiresActivation: true
        },
        { status: 403 }
      )
    }

    // ✅ STEP 4: Build university data. Session id must be DB primary key so list/register APIs use correct university_id.
    let sessionId: number
    if (dbUniversity) {
      sessionId = dbUniversity.id
    } else if (isDatabaseAvailable() && blockchainUniversity?.id != null) {
      const dbId = await getDbUniversityIdFromSessionId(Number(blockchainUniversity.id))
      sessionId = dbId ?? Number(blockchainUniversity.id)
    } else {
      sessionId = Number(blockchainUniversity?.id) || 0
    }

    let universityData = {
      id: sessionId,
      name: dbUniversity?.name || blockchainUniversity?.nameEn || "",
      nameAr: dbUniversity?.name_ar || blockchainUniversity?.nameAr || "",
      email: dbUniversity?.email || "",
      walletAddress: normalizedWallet,
      country: dbUniversity?.country || "",
      status: dbUniversity?.status || (blockchainUniversity?.isActive ? "active" : "inactive"),
      subscriptionStatus: dbUniversity?.subscription_status || "active",
      subscriptionPlan: dbUniversity?.subscription_plan || "premium",
    }

    // Log verification status
    if (dbUniversity && blockchainUniversity) {
      console.log(`[WalletLogin] ✅ Verified: DB ID ${dbUniversity.id}, Blockchain ID ${blockchainUniversity.id}`)
    } else if (dbUniversity && !blockchainUniversity) {
      console.warn(`[WalletLogin] ⚠️ DB-first: University found in DB (ID ${dbUniversity.id}) but blockchain verification failed. Allowing login with DB data.`)
      // Still allow login - blockchain might be temporarily unavailable or university not yet activated
    } else if (!dbUniversity && blockchainUniversity) {
      console.log(`[WalletLogin] ✅ Blockchain-only: University found on blockchain (ID ${blockchainUniversity.id}) but not in DB.`)
    }

    // ✅ STEP 5: Set session and return success
    await setUniversitySession(universityData)

    return NextResponse.json({
      success: true,
      university: universityData,
      source: dbUniversity ? (blockchainUniversity ? "db_and_blockchain" : "db_only") : "blockchain_only",
      blockchainVerified: !!blockchainUniversity,
    })
  } catch (error) {
    console.error("[WalletLogin] Error:", error)
    return NextResponse.json(
      { error: "Failed to verify wallet. Please try again." },
      { status: 500 }
    )
  }
}
