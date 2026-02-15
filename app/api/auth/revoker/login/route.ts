import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { findUniversitiesWhereRevoker } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, walletAddress, loginMethod } = body

    // WALLET-BASED LOGIN (Blockchain as source of truth)
    if (loginMethod === "wallet" && walletAddress) {
      const authorizedUniversities = await findUniversitiesWhereRevoker(walletAddress)
      
      if (authorizedUniversities.length === 0) {
        return NextResponse.json(
          { error: "This wallet is not authorized as a revoker for any university on the blockchain." },
          { status: 403 }
        )
      }

      const university = authorizedUniversities[0]
      
      const sessionData = {
        type: "revoker",
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
      cookieStore.set("revoker_session", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      })

      return NextResponse.json({
        success: true,
        loginMethod: "wallet",
        revoker: {
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

    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { 
          error: "Database unavailable. Please use wallet login instead.",
          suggestion: "Connect your MetaMask wallet to login directly via blockchain verification."
        },
        { status: 503 }
      )
    }

    const revokers = await sql`
      SELECT 
        r.id,
        r.wallet_address,
        r.email,
        r.name,
        r.password_hash,
        r.university_id,
        r.is_active,
        u.name as university_name,
        u.status as university_status
      FROM revokers r
      JOIN universities u ON r.university_id = u.id
      WHERE LOWER(r.email) = LOWER(${email})
      LIMIT 1
    `

    if (!revokers || revokers.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const revoker = revokers[0]

    if (!revoker.is_active) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact your university admin." },
        { status: 403 }
      )
    }

    if (revoker.university_status !== "active") {
      return NextResponse.json(
        { error: "Your university is not currently active on the platform." },
        { status: 403 }
      )
    }

    // ✅ Verify password using unified verifyPassword (supports bcrypt + legacy)
    if (!revoker.password_hash) {
      return NextResponse.json(
        { error: "Account not properly configured. Please contact your university admin." },
        { status: 401 }
      )
    }

    const { verifyPassword } = await import("@/lib/auth")
    const passwordValid = await verifyPassword(password, revoker.password_hash)

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify revoker status on blockchain
    if (revoker.wallet_address && revoker.university_id) {
      const blockchainUniversities = await findUniversitiesWhereRevoker(revoker.wallet_address)
      const isOnChainRevoker = blockchainUniversities.some(u => Number(u.id) === revoker.university_id)
      
      if (!isOnChainRevoker) {
        return NextResponse.json(
          { error: "Your wallet is not authorized as a revoker on the blockchain. Please contact your university admin." },
          { status: 403 }
        )
      }
    }

    try {
      await sql`UPDATE revokers SET last_login_at = NOW() WHERE id = ${revoker.id}`
    } catch {}

    const sessionData = {
      type: "revoker",
      loginMethod: "email",
      id: revoker.id,
      email: revoker.email,
      name: revoker.name,
      walletAddress: revoker.wallet_address,
      universityId: revoker.university_id,
      universityName: revoker.university_name,
    }

    const cookieStore = await cookies()
    cookieStore.set("revoker_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    })

    return NextResponse.json({
      success: true,
      loginMethod: "email",
      revoker: {
        id: revoker.id,
        email: revoker.email,
        name: revoker.name,
        walletAddress: revoker.wallet_address,
        universityId: revoker.university_id,
        universityName: revoker.university_name,
      },
    })
  } catch (error) {
    console.error("Revoker login error:", error)
    return NextResponse.json(
      { error: "An error occurred during login. Try wallet login instead." },
      { status: 500 }
    )
  }
}
