import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { findUniversitiesWhereIssuer, fetchUniversityFromBlockchain } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, walletAddress, loginMethod } = body

    // WALLET-BASED LOGIN (Blockchain as source of truth, with DB fallback)
    if (loginMethod === "wallet" && walletAddress) {
      // 1. Check blockchain for issuer authorization (primary)
      let authorizedUniversities = await findUniversitiesWhereIssuer(walletAddress)
      
      // 2. If blockchain returns empty, try database (e.g. after DB rebuild with synced data; or RPC issues)
      if (authorizedUniversities.length === 0 && isDatabaseAvailable()) {
        const dbIssuers = await sql`
          SELECT i.id, i.wallet_address, i.university_id, i.is_active, u.name as university_name, u.name_ar as university_name_ar, u.blockchain_id
          FROM issuers i
          JOIN universities u ON i.university_id = u.id
          WHERE LOWER(i.wallet_address) = LOWER(${walletAddress})
            AND i.is_active = true
            AND u.blockchain_id IS NOT NULL
          LIMIT 5
        `
        if (dbIssuers && dbIssuers.length > 0) {
          authorizedUniversities = dbIssuers.map((row: { blockchain_id: number; university_name: string; university_name_ar?: string }) => ({
            id: row.blockchain_id,
            nameEn: row.university_name,
            nameAr: row.university_name_ar,
            exists: true,
            isActive: true,
            isDeleted: false,
            admin: "",
          }))
        }
      }
      
      if (authorizedUniversities.length === 0) {
        return NextResponse.json(
          { 
            error: "This wallet is not authorized as an issuer for any university on the blockchain.",
            suggestion: "Try Email Login if you have credentials, or ask your university admin to add your wallet as an issuer."
          },
          { status: 403 }
        )
      }

      // Get first university they're an issuer for
      const university = authorizedUniversities[0]
      
      const sessionData = {
        type: "issuer",
        loginMethod: "wallet",
        walletAddress: walletAddress.toLowerCase(),
        universityId: Number(university.id),
        universityName: university.nameEn,
        universityNameAr: university.nameAr,
        authorizedUniversities: authorizedUniversities.map(u => ({
          id: Number(u.id),
          nameEn: u.nameEn,
          nameAr: u.nameAr,
        })),
      }

      const cookieStore = await cookies()
      cookieStore.set("issuer_session", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      })

      return NextResponse.json({
        success: true,
        loginMethod: "wallet",
        issuer: {
          walletAddress: walletAddress.toLowerCase(),
          universityId: Number(university.id),
          universityName: university.nameEn,
          authorizedUniversities: authorizedUniversities.map(u => ({
            id: Number(u.id),
            nameEn: u.nameEn,
            nameAr: u.nameAr,
          })),
        },
      })
    }

    // EMAIL/PASSWORD LOGIN (Database fallback)
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check if database is available
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { 
          error: "Database unavailable. Please use wallet login instead.",
          suggestion: "Connect your MetaMask wallet to login directly via blockchain verification."
        },
        { status: 503 }
      )
    }

    // Find issuer by email in database
    const issuers = await sql`
      SELECT 
        i.id,
        i.wallet_address,
        i.email,
        i.name,
        i.password_hash,
        i.university_id,
        i.is_active,
        i.status as issuer_status,
        u.name as university_name,
        u.status as university_status
      FROM issuers i
      JOIN universities u ON i.university_id = u.id
      WHERE LOWER(i.email) = LOWER(${email})
      LIMIT 1
    `

    if (!issuers || issuers.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const issuer = issuers[0]

    // Pending onboarding states: issuer can log in to complete NDA and submit wallet
    const pendingOnboardingStatuses = ["pending_nda", "pending_wallet", "pending_blockchain", "pending_activation"]
    const isPendingOnboarding = pendingOnboardingStatuses.includes((issuer.issuer_status || "").toLowerCase())

    // Only treat as "deactivated" if explicitly suspended/removed, not if still in onboarding
    if (!issuer.is_active && !isPendingOnboarding) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact your university admin." },
        { status: 403 }
      )
    }

    // Allow login when in pending onboarding so issuer can complete NDA and wallet
    if (!isPendingOnboarding && issuer.university_status !== "active") {
      return NextResponse.json(
        { error: "Your university is not currently active on the platform." },
        { status: 403 }
      )
    }

    // ✅ Verify password using unified verifyPassword (supports bcrypt + legacy)
    if (!issuer.password_hash) {
      return NextResponse.json(
        { error: "Account not properly configured. Please contact your university admin." },
        { status: 401 }
      )
    }

    const { verifyPassword } = await import("@/lib/auth")
    const passwordValid = await verifyPassword(password, issuer.password_hash)

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify issuer on blockchain only when already activated (not still in onboarding)
    if (issuer.wallet_address && issuer.university_id && !isPendingOnboarding) {
      const blockchainUniversities = await findUniversitiesWhereIssuer(issuer.wallet_address)
      const isOnChainIssuer = blockchainUniversities.some((u: { id: number }) => Number(u.id) === issuer.university_id)
      
      if (!isOnChainIssuer) {
        return NextResponse.json(
          { error: "Your wallet is not authorized as an issuer on the blockchain. Please contact your university admin." },
          { status: 403 }
        )
      }
    }

    // Update last login (ignore errors)
    try {
      await sql`UPDATE issuers SET last_login_at = NOW() WHERE id = ${issuer.id}`
    } catch {}

    // Create session
    const sessionData = {
      type: "issuer",
      loginMethod: "email",
      id: issuer.id,
      email: issuer.email,
      name: issuer.name,
      walletAddress: issuer.wallet_address,
      universityId: issuer.university_id,
      universityName: issuer.university_name,
    }

    const cookieStore = await cookies()
    cookieStore.set("issuer_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    })

    return NextResponse.json({
      success: true,
      loginMethod: "email",
      issuer: {
        id: issuer.id,
        email: issuer.email,
        name: issuer.name,
        walletAddress: issuer.wallet_address,
        universityId: issuer.university_id,
        universityName: issuer.university_name,
      },
    })
  } catch (error) {
    console.error("Issuer login error:", error)
    return NextResponse.json(
      { error: "An error occurred during login. Try wallet login instead." },
      { status: 500 }
    )
  }
}
