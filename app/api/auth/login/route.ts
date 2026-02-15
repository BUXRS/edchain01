import { type NextRequest, NextResponse } from "next/server"
import { setSession, verifyPassword, type AdminUser } from "@/lib/auth"
import { getAdminByEmailWithPassword, isDatabaseAvailable } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, loginMethod, walletAddress } = body

    // WALLET-BASED LOGIN (for contract owner/admin)
    if (loginMethod === "wallet" && walletAddress) {
      console.log("[AdminWalletLogin] Starting wallet login verification for:", walletAddress)
      const normalizedWallet = walletAddress.toLowerCase()
      console.log("[AdminWalletLogin] Normalized wallet:", normalizedWallet)
      
      try {
        // ✅ OPTIMIZED: Use getWalletRoles which already checks contract owner efficiently
        const { getWalletRoles, fetchContractOwner } = await import("@/lib/blockchain")
        const { getCoreContractABI, getActiveContractAddress } = await import("@/lib/contracts/abi")
        const { Contract } = await import("ethers")
        const { getRpcHttpProvider } = await import("@/lib/config/rpc-provider")
        
        const coreAddress = getActiveContractAddress()
        console.log("[AdminWalletLogin] Using Core contract address:", coreAddress)
        
        // Method 1: Use getWalletRoles (includes contract owner check)
        let isContractOwner = false
        try {
          console.log("[AdminWalletLogin] Checking wallet roles...")
          const roles = await getWalletRoles(normalizedWallet)
          isContractOwner = roles.isContractOwner
          console.log("[AdminWalletLogin] getWalletRoles result - isContractOwner:", isContractOwner)
        } catch (rolesError: any) {
          console.warn("[AdminWalletLogin] getWalletRoles failed, trying direct owner check:", rolesError?.message)
        }
        
        // Method 2: Direct owner check (fallback if getWalletRoles didn't work)
        if (!isContractOwner) {
          try {
            console.log("[AdminWalletLogin] Performing direct contract owner check...")
            const provider = getRpcHttpProvider()
            const contract = new Contract(coreAddress, getCoreContractABI(), provider)
            const owner = await contract.owner()
            console.log("[AdminWalletLogin] Contract owner from blockchain:", owner)
            console.log("[AdminWalletLogin] Comparing:", owner.toLowerCase(), "===", normalizedWallet)
            
            isContractOwner = owner.toLowerCase() === normalizedWallet
            console.log("[AdminWalletLogin] Direct check result - isContractOwner:", isContractOwner)
          } catch (ownerError: any) {
            console.error("[AdminWalletLogin] Direct owner check failed:", ownerError?.message)
            // Try fetchContractOwner as last resort
            try {
              const owner = await fetchContractOwner()
              if (owner) {
                isContractOwner = owner.toLowerCase() === normalizedWallet
                console.log("[AdminWalletLogin] fetchContractOwner result - isContractOwner:", isContractOwner)
              }
            } catch (fetchError: any) {
              console.error("[AdminWalletLogin] fetchContractOwner also failed:", fetchError?.message)
            }
          }
        }
        
        if (!isContractOwner) {
          // Get the actual owner for error message
          let actualOwner = "unknown"
          try {
            const provider = getRpcHttpProvider()
            const contract = new Contract(coreAddress, getCoreContractABI(), provider)
            actualOwner = await contract.owner()
          } catch {}
          
          console.error("[AdminWalletLogin] ❌ Wallet is NOT contract owner!")
          console.error("[AdminWalletLogin] Expected:", normalizedWallet)
          console.error("[AdminWalletLogin] Actual owner:", actualOwner)
          
          return NextResponse.json(
            { 
              error: `This wallet is not authorized as a super admin (contract owner). Contract owner is: ${actualOwner}`,
              contractOwner: actualOwner,
              providedWallet: normalizedWallet,
              contractAddress: coreAddress,
            },
            { status: 403 }
          )
        }

        console.log("[AdminWalletLogin] ✅ Wallet verified as contract owner!")

        // Wallet is contract owner - create admin session
        const user: AdminUser = {
          id: "admin",
          email: `admin@${normalizedWallet.slice(0, 6)}.eth`,
          name: "Super Admin",
          role: "super_admin",
        }

        await setSession(user)
        console.log("[AdminWalletLogin] Session created successfully")

        return NextResponse.json({ 
          success: true,
          admin: user,
          user: user, // Also include for compatibility
          message: "Wallet login successful"
        })
      } catch (error: any) {
        console.error("[AdminWalletLogin] Error details:", error)
        console.error("[AdminWalletLogin] Error message:", error?.message)
        console.error("[AdminWalletLogin] Error stack:", error?.stack)
        return NextResponse.json(
          { 
            error: `Failed to verify wallet: ${error?.message || "Unknown error"}. Please check the console for details.`,
            details: error?.message,
            contractAddress: coreAddress,
          },
          { status: 500 }
        )
      }
    }

    // EMAIL-BASED LOGIN (existing logic)
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    // ✅ MANDATORY: Database must be available - no demo/fallback
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { message: "Database unavailable. Please contact support." },
        { status: 503 }
      )
    }

    // ✅ Database-first authentication
    const admin = await getAdminByEmailWithPassword(email)

    if (!admin) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    if (!admin.password_hash) {
      return NextResponse.json({ 
        message: "Account not properly configured. Please contact administrator." 
      }, { status: 401 })
    }

    // ✅ Verify password using bcrypt (supports legacy SHA-256 for migration)
    const isValidPassword = await verifyPassword(password, admin.password_hash)

    if (!isValidPassword) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    if (!admin.is_super_admin) {
      return NextResponse.json({ 
        message: "Access denied. Super admin privileges required." 
      }, { status: 403 })
    }

    const user: AdminUser = {
      id: String(admin.id),
      email: admin.email,
      name: admin.name,
      role: "super_admin",
    }

    await setSession(user)

    return NextResponse.json({ user })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
