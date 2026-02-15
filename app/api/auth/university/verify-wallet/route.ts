import { type NextRequest, NextResponse } from "next/server"
import { setUniversitySession } from "@/lib/auth"
import { getUniversityByEmailWithPassword, isDatabaseAvailable } from "@/lib/db"
import { findUniversityByAdmin } from "@/lib/blockchain"

/**
 * Verify that the connected wallet matches the activated wallet for the university
 * This is called after password login when user connects their wallet
 */
export async function POST(request: NextRequest) {
  try {
    const { email, connectedWalletAddress } = await request.json()

    if (!email || !connectedWalletAddress) {
      return NextResponse.json(
        { error: "Email and wallet address are required" },
        { status: 400 }
      )
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      )
    }

    // Get university from database
    // Try admin_email first (preferred), then email field
    let university = null
    try {
      university = await getUniversityByEmailWithPassword(email)
    } catch (error) {
      console.error("[VerifyWallet] Error fetching university by email:", error)
      // Try alternative lookup methods if needed
    }
    
    if (!university) {
      // Try to find by ID if email lookup fails (for wallet-only login scenarios)
      console.warn(`[VerifyWallet] University not found by email: ${email}`)
      return NextResponse.json(
        { 
          error: `University not found with email: ${email}. Please ensure you're using the correct email address.`,
          suggestion: "If you logged in with wallet, try logging in with email/password first, then connect your wallet."
        },
        { status: 404 }
      )
    }

    // Normalize wallet addresses for comparison
    const normalizedConnected = connectedWalletAddress.toLowerCase()
    
    // ✅ CRITICAL: Use admin_wallet from blockchain as source of truth
    // admin_wallet is synced from blockchain and represents the actual admin on-chain
    const adminWallet = (university as any).admin_wallet?.toLowerCase() || ""
    const walletAddress = university.wallet_address?.toLowerCase() || ""
    
    // Use admin_wallet if available (blockchain source of truth), fallback to wallet_address
    const activatedWallet = adminWallet || walletAddress

    // ✅ STEP 1: Check if wallet matches the activated wallet in database
    if (!activatedWallet) {
      return NextResponse.json(
        { 
          error: "No wallet address is registered for this university. Please contact support to activate your wallet.",
          requiresActivation: true
        },
        { status: 403 }
      )
    }

    if (normalizedConnected !== activatedWallet) {
      return NextResponse.json(
        { 
          error: `The connected wallet (${normalizedConnected}) does not match your registered admin wallet (${activatedWallet}). Please connect the correct wallet.`,
          activatedWalletAddress: activatedWallet,
          connectedWalletAddress: normalizedConnected
        },
        { status: 403 }
      )
    }

    // ✅ STEP 2: Verify wallet is registered as admin on blockchain (source of truth)
    const blockchainUniversity = await findUniversityByAdmin(normalizedConnected)
    
    if (!blockchainUniversity) {
      // If wallet matches DB but not blockchain admin, this is a data mismatch
      // We need to sync from blockchain to fix it
      console.error(`[VerifyWallet] ❌ MISMATCH: Wallet ${normalizedConnected} matches DB but is NOT admin on blockchain!`)
      console.error(`[VerifyWallet] DB admin_wallet: ${adminWallet}, DB wallet_address: ${walletAddress}`)
      console.error(`[VerifyWallet] This indicates the database is out of sync with blockchain.`)
      
      return NextResponse.json(
        { 
          error: "Wallet mismatch detected: Your wallet matches the database but is not registered as admin on the blockchain. The database needs to be synced with blockchain. Please contact support to sync the database.",
          requiresBlockchainSync: true,
          dbWallet: activatedWallet,
          connectedWallet: normalizedConnected
        },
        { status: 403 }
      )
    }

    // ✅ STEP 3: Verify blockchain university ID matches database university ID
    const blockchainUniId = typeof blockchainUniversity.id === 'bigint' 
      ? Number(blockchainUniversity.id) 
      : Number(blockchainUniversity.id)
    
    // Check against blockchain_id if available, otherwise use id
    const dbBlockchainId = university.blockchain_id ? Number(university.blockchain_id) : null
    
    if (dbBlockchainId && blockchainUniId !== dbBlockchainId) {
      console.warn(`[VerifyWallet] University ID mismatch: DB blockchain_id=${dbBlockchainId}, Blockchain=${blockchainUniId}`)
      return NextResponse.json(
        { 
          error: "University ID mismatch between database and blockchain. Please contact support to sync the database.",
          dbUniversityId: dbBlockchainId,
          blockchainUniversityId: blockchainUniId
        },
        { status: 403 }
      )
    }

    // ✅ STEP 4: Wallet matches - create final session
    const universityData = {
      id: university.id,
      name: blockchainUniversity.nameEn || university.name,
      nameAr: blockchainUniversity.nameAr || university.name_ar,
      email: university.email,
      walletAddress: normalizedConnected,
      country: university.country,
      status: blockchainUniversity.isActive ? "active" : university.status,
      subscriptionStatus: university.subscription_status,
      subscriptionPlan: university.subscription_plan,
    }

    // Set final session cookie
    await setUniversitySession(universityData)

    return NextResponse.json({
      success: true,
      message: "Wallet verified successfully",
      university: universityData,
    })
  } catch (error: any) {
    console.error("[VerifyWallet] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to verify wallet. Please try again." },
      { status: 500 }
    )
  }
}
