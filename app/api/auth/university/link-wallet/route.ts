import { type NextRequest, NextResponse } from "next/server"
import { getUniversitySession, setUniversitySession } from "@/lib/auth"
import { getUniversityByWallet, updateUniversityWallet, isDatabaseAvailable } from "@/lib/db"
import { getWalletRoles, fetchUniversityFromBlockchain } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, email } = await request.json()

    // Get current university session
    const university = await getUniversitySession()
    if (!university) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 })
    }

    const normalizedWallet = walletAddress.toLowerCase()

    // ✅ CRITICAL: Verify wallet matches the activated wallet in database
    if (isDatabaseAvailable()) {
      try {
        // Get university from database to check activated wallet
        const dbUniversity = await getUniversityByWallet(normalizedWallet)
        
        // If wallet is linked to a different university, reject
        if (dbUniversity && dbUniversity.id !== university.id) {
          return NextResponse.json({ 
            error: `This wallet is already linked to ${dbUniversity.name}` 
          }, { status: 400 })
        }

        // Get full university record to check activated wallet
        const { getUniversityById } = await import("@/lib/db")
        const fullUniversity = await getUniversityById(university.id)
        
        if (fullUniversity) {
          const activatedWallet = fullUniversity.wallet_address?.toLowerCase() || ""
          
          // ✅ CRITICAL: If university is activated (has blockchain_id), wallet MUST match
          if (fullUniversity.blockchain_id && fullUniversity.wallet_address) {
            if (normalizedWallet !== activatedWallet) {
              return NextResponse.json({
                error: `The connected wallet (${normalizedWallet}) does not match your activated admin wallet (${activatedWallet}). Please connect the correct wallet.`,
                activatedWalletAddress: activatedWallet,
                connectedWalletAddress: normalizedWallet
              }, { status: 403 })
            }
          } else if (activatedWallet && normalizedWallet !== activatedWallet) {
            // University not yet activated but has a wallet - still enforce matching
            return NextResponse.json({
              error: `The connected wallet (${normalizedWallet}) does not match the registered wallet (${activatedWallet}). Please connect the correct wallet.`,
              activatedWalletAddress: activatedWallet,
              connectedWalletAddress: normalizedWallet
            }, { status: 403 })
          }

          // If no activated wallet yet, this is the first connection - update DB
          if (!activatedWallet) {
            await updateUniversityWallet(university.id, normalizedWallet)
          }
        }
      } catch (dbError) {
        console.error("[LinkWallet] Database error:", dbError)
        // Continue with blockchain verification even if DB check fails
      }
    }

    // ✅ Verify wallet is registered as admin on blockchain (source of truth)
    const roles = await getWalletRoles(normalizedWallet)
    let blockchainUniversity = null
    let isAuthorizedAdmin = false

    if (roles.adminOfUniversities.length > 0) {
      // Wallet is admin of at least one university
      const universityId = roles.adminOfUniversities[0]
      blockchainUniversity = await fetchUniversityFromBlockchain(universityId)
      isAuthorizedAdmin = true
      
      // Verify blockchain university ID matches database university ID
      if (isDatabaseAvailable()) {
        const { getUniversityById } = await import("@/lib/db")
        const dbUni = await getUniversityById(university.id)
        if (dbUni && dbUni.blockchain_id) {
          const blockchainUniId = Number(universityId)
          if (blockchainUniId !== dbUni.blockchain_id) {
            return NextResponse.json({
              error: "University ID mismatch between database and blockchain. Please contact support.",
              dbUniversityId: dbUni.blockchain_id,
              blockchainUniversityId: blockchainUniId
            }, { status: 403 })
          }
        }
      }
    } else {
      // Wallet is not admin on blockchain - check if university is activated
      if (isDatabaseAvailable()) {
        const { getUniversityById } = await import("@/lib/db")
        const dbUni = await getUniversityById(university.id)
        if (dbUni && dbUni.blockchain_id && dbUni.wallet_address) {
          // University is activated but wallet is not admin - reject
          return NextResponse.json({
            error: "This wallet is not registered as a university admin on the blockchain. Please contact support.",
            requiresBlockchainRegistration: true
          }, { status: 403 })
        }
      }
    }

    await setUniversitySession({
      ...university,
      walletAddress,
      // Add blockchain-verified role information
      blockchainVerified: isAuthorizedAdmin,
      blockchainUniversityId: blockchainUniversity ? Number(blockchainUniversity.id) : null,
      isContractOwner: roles.isContractOwner,
      adminOfUniversities: roles.adminOfUniversities,
      issuerForUniversities: roles.issuerForUniversities,
      revokerForUniversities: roles.revokerForUniversities,
    })

    return NextResponse.json({
      success: true,
      message: "Wallet linked successfully",
      roles: {
        isContractOwner: roles.isContractOwner,
        isUniversityAdmin: isAuthorizedAdmin,
        adminOfUniversities: roles.adminOfUniversities,
        issuerForUniversities: roles.issuerForUniversities,
        revokerForUniversities: roles.revokerForUniversities,
      },
      blockchainUniversity: blockchainUniversity
        ? {
            id: Number(blockchainUniversity.id),
            nameEn: blockchainUniversity.nameEn,
            nameAr: blockchainUniversity.nameAr,
            isActive: blockchainUniversity.isActive,
          }
        : null,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    if (!errorMessage.includes("Failed to fetch") && !errorMessage.includes("connecting to database")) {
      console.error("Link wallet error:", error)
    }
    return NextResponse.json({ error: "Failed to link wallet. Please try again." }, { status: 500 })
  }
}
