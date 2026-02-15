import { type NextRequest, NextResponse } from "next/server"
import { verifyPassword, setUniversitySession } from "@/lib/auth"
import { getUniversityByEmailWithPassword, isDatabaseAvailable, getDbUniversityIdFromSessionId } from "@/lib/db"

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; loginMethod?: string; walletAddress?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }
  const { email, password, loginMethod, walletAddress } = body

  try {

    // WALLET-BASED LOGIN
    if (loginMethod === "wallet" && walletAddress) {
      console.log("[UniversityLogin] Starting wallet login for:", walletAddress)
      // Use the existing wallet login endpoint logic
      const { findUniversityByAdmin, getWalletRoles, fetchUniversityFromBlockchain } = await import("@/lib/blockchain")
      const { getUniversityByWallet, isDatabaseAvailable } = await import("@/lib/db")
      
      const normalizedWallet = walletAddress.toLowerCase()
      console.log("[UniversityLogin] Normalized wallet:", normalizedWallet)

      // Check database first
      let dbUniversity = null
      let blockchainUniversity = null
      
      if (isDatabaseAvailable()) {
        try {
          dbUniversity = await getUniversityByWallet(normalizedWallet)
          console.log("[UniversityLogin] Found in DB:", dbUniversity ? `ID ${dbUniversity.id}` : "not found")
        } catch (dbError) {
          console.warn("[UniversityLogin] Database lookup failed:", dbError)
        }
      }

      // Verify on blockchain with timeout
      if (dbUniversity?.blockchain_id) {
        try {
          console.log("[UniversityLogin] Fetching from blockchain using ID:", dbUniversity.blockchain_id)
          blockchainUniversity = await Promise.race([
            fetchUniversityFromBlockchain(Number(dbUniversity.blockchain_id)),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Blockchain fetch timeout")), 15000))
          ]) as any
          console.log("[UniversityLogin] ✅ Found on blockchain:", blockchainUniversity?.id)
        } catch (error) {
          console.warn("[UniversityLogin] Failed to fetch from blockchain:", error)
        }
      }
      
      // Use getWalletRoles if needed (faster than findUniversityByAdmin)
      if (!blockchainUniversity) {
        try {
          console.log("[UniversityLogin] Trying getWalletRoles...")
          const roles = await Promise.race([
            getWalletRoles(normalizedWallet),
            new Promise((_, reject) => setTimeout(() => reject(new Error("getWalletRoles timeout")), 15000))
          ]) as any
          
          if (roles.adminOfUniversities && roles.adminOfUniversities.length > 0) {
            const blockchainUniId = roles.adminOfUniversities[0]
            console.log("[UniversityLogin] Found university ID from roles:", blockchainUniId)
            blockchainUniversity = await fetchUniversityFromBlockchain(blockchainUniId)
          }
        } catch (rolesError) {
          console.error("[UniversityLogin] getWalletRoles failed:", rolesError)
          // Fallback to findUniversityByAdmin (slower but more thorough)
          try {
            console.log("[UniversityLogin] Trying findUniversityByAdmin (fallback)...")
            blockchainUniversity = await Promise.race([
              findUniversityByAdmin(normalizedWallet),
              new Promise((_, reject) => setTimeout(() => reject(new Error("findUniversityByAdmin timeout")), 20000))
            ]) as any
            console.log("[UniversityLogin] ✅ Found via findUniversityByAdmin:", blockchainUniversity?.id)
          } catch (findError) {
            console.error("[UniversityLogin] findUniversityByAdmin also failed:", findError)
          }
        }
      }

      if (!dbUniversity && !blockchainUniversity) {
        console.error("[UniversityLogin] ❌ Wallet not found in DB or blockchain")
        return NextResponse.json(
          { 
            error: "This wallet is not registered as a university admin. Please ensure your university is activated on the blockchain.",
            requiresActivation: true
          },
          { status: 403 }
        )
      }

      // Build university data
      // ✅ CRITICAL: Use admin_wallet from blockchain as the walletAddress in session
      const blockchainAdminWallet = blockchainUniversity?.admin?.toLowerCase() || normalizedWallet
      
      // CRITICAL: Include both email and admin_email for compatibility
      // dbUniversity from getUniversityByWallet returns admin_email as email field
      const universityEmail = dbUniversity ? (dbUniversity.admin_email || (dbUniversity as any).email || "") : (blockchainUniversity?.adminEmail || "")
      
      // Session id must be the database primary key so list/register APIs use correct university_id
      let sessionId: number
      if (dbUniversity) {
        sessionId = dbUniversity.id
      } else if (isDatabaseAvailable()) {
        const dbId = await getDbUniversityIdFromSessionId(Number(blockchainUniversity?.id) || 0)
        sessionId = dbId ?? (Number(blockchainUniversity?.id) || 0)
      } else {
        sessionId = Number(blockchainUniversity?.id) || 0
      }

      const universityData = dbUniversity ? {
        id: sessionId,
        name: dbUniversity.name,
        nameAr: dbUniversity.name_ar,
        email: universityEmail,
        admin_email: universityEmail,
        walletAddress: blockchainAdminWallet,
        wallet_address: blockchainAdminWallet,
        country: dbUniversity.country,
        status: dbUniversity.status,
        subscriptionStatus: dbUniversity.subscription_status,
        subscriptionPlan: dbUniversity.subscription_plan,
      } : {
        id: sessionId,
        name: blockchainUniversity?.nameEn || "",
        nameAr: blockchainUniversity?.nameAr || "",
        email: universityEmail,
        admin_email: universityEmail,
        walletAddress: blockchainAdminWallet,
        wallet_address: blockchainAdminWallet,
        country: blockchainUniversity?.country || "",
        status: blockchainUniversity?.isActive ? "active" : "inactive",
        subscriptionStatus: "active",
        subscriptionPlan: "basic",
      }
      
      // ✅ If DB has different wallet_address, log warning and suggest sync
      if (dbUniversity && dbUniversity.wallet_address?.toLowerCase() !== blockchainAdminWallet) {
        console.warn(`[UniversityLogin] ⚠️ WARNING: DB wallet_address (${dbUniversity.wallet_address}) differs from blockchain admin (${blockchainAdminWallet})`)
        console.warn(`[UniversityLogin] Database needs to be synced with blockchain. Using blockchain admin wallet.`)
      }

      console.log("[UniversityLogin] ✅ Creating session for:", universityData)
      await setUniversitySession(universityData)

      return NextResponse.json({
        success: true,
        university: universityData,
        requiresWalletConnection: false,
        message: "Wallet login successful",
      })
    }

    // EMAIL-BASED LOGIN (existing logic)
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // ✅ MANDATORY: Database must be available - no demo/fallback
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Database unavailable. Please contact support." },
        { status: 503 },
      )
    }

    // ✅ Database-first authentication
    let university = null
    try {
      university = await getUniversityByEmailWithPassword(email)
    } catch (dbError) {
      console.error("[UniversityLogin] Database error:", dbError)
      return NextResponse.json(
        { error: "Database error. Please try again or contact support." },
        { status: 503 },
      )
    }

    if (!university) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // ✅ Verify password using bcrypt (supports legacy SHA-256 for migration)
    if (!university.password_hash) {
      return NextResponse.json({ 
        error: "Account not properly configured. Please contact support." 
      }, { status: 401 })
    }

    const isValidPassword = await verifyPassword(password, university.password_hash)

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // ✅ Check if university is active
    if (university.status !== "active" && !university.is_active) {
      return NextResponse.json({ 
        error: "University account is not active. Please contact support." 
      }, { status: 403 })
    }

    // ✅ Two-step security: Authenticated but wallet must be linked for authorization
    // User can login but will need to connect wallet to access dashboard features
    const requiresWalletConnection = !university.wallet_address

    // ✅ Build university session data
    // CRITICAL: Include both email and admin_email for compatibility
    const universityData = {
      id: university.id,
      name: university.name,
      nameAr: university.name_ar,
      email: university.admin_email || university.email, // Use admin_email as primary
      admin_email: university.admin_email || university.email, // Also include admin_email explicitly
      walletAddress: university.wallet_address,
      wallet_address: university.wallet_address, // Include both formats
      country: university.country,
      status: university.status,
      subscriptionStatus: university.subscription_status,
      subscriptionPlan: university.subscription_plan,
    }

    // Set session cookie
    await setUniversitySession(universityData)

    return NextResponse.json({
      success: true,
      university: universityData,
      requiresWalletConnection: requiresWalletConnection,
      activatedWalletAddress: university.wallet_address || null,
      message: requiresWalletConnection 
        ? "Please connect your MetaMask wallet to activate your account and access the dashboard."
        : "Login successful. You can now access your dashboard.",
    })
  } catch (error) {
    console.error("[v0] University login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
