import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { findUniversitiesWhereVerifier, fetchUniversityFromBlockchain, getWalletRoles } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, walletAddress, loginMethod, universityId } = body

    // WALLET-BASED LOGIN (Blockchain as source of truth)
    if (loginMethod === "wallet" && walletAddress) {
      // ✅ FORCED APPROACH: Check blockchain FIRST (source of truth), then sync to DB
      console.log("[VerifierLogin] Checking blockchain directly (forced check)...")
      const authorizedUniversities = await findUniversitiesWhereVerifier(walletAddress)
      console.log("[VerifierLogin] Blockchain check found", authorizedUniversities.length, "universities")
      
      if (authorizedUniversities.length === 0) {
        // Not found on blockchain - check database as fallback
        console.log("[VerifierLogin] Not found on blockchain, checking database...")
        try {
          const dbVerifiers = await sql`
            SELECT 
              v.id,
              v.university_id,
              v.wallet_address,
              v.is_active,
              COALESCE(u.name_en, u.name) as university_name,
              u.blockchain_id
            FROM verifiers v
            JOIN universities u ON v.university_id = u.id
            WHERE LOWER(v.wallet_address) = LOWER(${walletAddress})
              AND v.is_active = true
          `
          
          if (dbVerifiers.length === 0) {
            return NextResponse.json(
              { error: "This wallet is not authorized as a verifier for any university on the blockchain." },
              { status: 403 }
            )
          }
          
          // Found in DB but not on blockchain - allow login using DB data (RPC may be flaky or sync pending)
          console.warn("[VerifierLogin] ⚠️ Wallet found in DB but not on blockchain. Allowing login from DB.")
          const first = dbVerifiers[0] as { university_id: number; wallet_address: string; university_name?: string; blockchain_id?: number | null }
          const uniBlockchainId = first.blockchain_id != null ? Number(first.blockchain_id) : first.university_id
          const sessionData = {
            type: "verifier",
            loginMethod: "wallet",
            walletAddress: walletAddress.toLowerCase(),
            universityId: uniBlockchainId,
            universityName: first.university_name ?? "University",
            authorizedUniversities: dbVerifiers.map((v: { university_id: number; university_name?: string; blockchain_id?: number | null }) => ({
              id: v.blockchain_id != null ? Number(v.blockchain_id) : v.university_id,
              nameEn: v.university_name ?? "University",
              nameAr: "",
            })),
          }
          const cookieStore = await cookies()
          cookieStore.set("verifier_session", JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24,
            path: "/",
          })
          return NextResponse.json({
            success: true,
            loginMethod: "wallet",
            verifier: {
              walletAddress: walletAddress.toLowerCase(),
              universityId: uniBlockchainId,
              universityName: first.university_name ?? "University",
              authorizedUniversities: sessionData.authorizedUniversities,
            },
          })
        } catch (dbError) {
          console.error("[VerifierLogin] Database check failed:", dbError)
        }
        
        return NextResponse.json(
          { error: "This wallet is not authorized as a verifier for any university on the blockchain." },
          { status: 403 }
        )
      }

      // ✅ FORCE SYNC: Wallet IS verifier on blockchain - force sync to database immediately
      console.log("[VerifierLogin] ✅ Wallet IS verifier on blockchain! Force syncing to database...")
      try {
        // Call force-sync logic directly (inline to avoid circular imports)
        const normalizedAddress = walletAddress.toLowerCase()
        const roles = await getWalletRoles(normalizedAddress)
        const verifierUniversityIds = roles.verifierForUniversities.map(id => Number(id))
        
        if (verifierUniversityIds.length > 0) {
          for (const uniId of verifierUniversityIds) {
            try {
              const dbUni = await sql`
                SELECT id FROM universities WHERE blockchain_id = ${uniId} LIMIT 1
              `
              if (dbUni.length > 0) {
                const dbUniversityId = dbUni[0].id
                const existing = await sql`
                  SELECT id FROM verifiers 
                  WHERE university_id = ${dbUniversityId} 
                    AND wallet_address = ${normalizedAddress}
                  LIMIT 1
                `
                if (existing.length === 0) {
                  await sql`
                    INSERT INTO verifiers (university_id, wallet_address, is_active, created_at, updated_at)
                    VALUES (${dbUniversityId}, ${normalizedAddress}, true, NOW(), NOW())
                  `
                  console.log(`[VerifierLogin] ✅ Synced verifier for university ${uniId}`)
                } else {
                  await sql`
                    UPDATE verifiers 
                    SET is_active = true, updated_at = NOW()
                    WHERE university_id = ${dbUniversityId} AND wallet_address = ${normalizedAddress}
                  `
                  console.log(`[VerifierLogin] ✅ Updated verifier for university ${uniId}`)
                }
              }
            } catch (dbError) {
              console.error(`[VerifierLogin] Error syncing university ${uniId}:`, dbError)
            }
          }
        }
      } catch (syncError) {
        console.error("[VerifierLogin] Force sync error (non-critical):", syncError)
        // Continue even if sync fails - we have blockchain data
      }

      // ✅ MANDATORY: Require university selection if multiple universities exist
      if (authorizedUniversities.length > 1) {
        return NextResponse.json({
          success: true,
          requiresUniversitySelection: true,
          authorizedUniversities: authorizedUniversities.map(u => ({
            id: typeof u.id === 'bigint' ? Number(u.id) : Number(u.id),
            nameEn: u.nameEn,
            nameAr: u.nameAr,
            isActive: u.isActive,
          })),
        })
      }
      
      // Single university - auto-select
      const university = authorizedUniversities[0]
      
      const sessionData = {
        type: "verifier",
        loginMethod: "wallet",
        walletAddress: walletAddress.toLowerCase(),
        universityId: typeof university.id === 'bigint' ? Number(university.id) : Number(university.id),
        universityName: university.nameEn,
        universityNameAr: university.nameAr,
        authorizedUniversities: authorizedUniversities.map(u => ({
          id: typeof u.id === 'bigint' ? Number(u.id) : Number(u.id),
          nameEn: u.nameEn,
          nameAr: u.nameAr,
        })),
      }

      const cookieStore = await cookies()
      cookieStore.set("verifier_session", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      })

      return NextResponse.json({
        success: true,
        loginMethod: "wallet",
        verifier: {
          walletAddress: walletAddress.toLowerCase(),
          universityId: typeof university.id === 'bigint' ? Number(university.id) : Number(university.id),
          universityName: university.nameEn,
          authorizedUniversities: authorizedUniversities.map(u => ({
            id: typeof u.id === 'bigint' ? Number(u.id) : Number(u.id),
            nameEn: u.nameEn,
            nameAr: u.nameAr,
          })),
        },
      })
    }

    // ✅ Handle university selection for wallet login (when multiple universities)
    if (loginMethod === "wallet" && walletAddress && universityId) {
      const authorizedUniversities = await findUniversitiesWhereVerifier(walletAddress)
      const selectedUniversity = authorizedUniversities.find(u => Number(u.id) === Number(universityId))
      
      if (!selectedUniversity) {
        return NextResponse.json(
          { error: "Selected university is not authorized for this wallet address." },
          { status: 403 }
        )
      }
      
      const sessionData = {
        type: "verifier",
        loginMethod: "wallet",
        walletAddress: walletAddress.toLowerCase(),
        universityId: typeof selectedUniversity.id === 'bigint' ? Number(selectedUniversity.id) : Number(selectedUniversity.id),
        universityName: selectedUniversity.nameEn,
        universityNameAr: selectedUniversity.nameAr,
        authorizedUniversities: authorizedUniversities.map(u => ({
          id: typeof u.id === 'bigint' ? Number(u.id) : Number(u.id),
          nameEn: u.nameEn,
          nameAr: u.nameAr,
        })),
      }

      const cookieStore = await cookies()
      cookieStore.set("verifier_session", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      })

      return NextResponse.json({
        success: true,
        loginMethod: "wallet",
        verifier: {
          walletAddress: walletAddress.toLowerCase(),
          universityId: typeof selectedUniversity.id === 'bigint' ? Number(selectedUniversity.id) : Number(selectedUniversity.id),
          universityName: selectedUniversity.nameEn,
          authorizedUniversities: authorizedUniversities.map(u => ({
            id: typeof u.id === 'bigint' ? Number(u.id) : Number(u.id),
            nameEn: u.nameEn,
            nameAr: u.nameAr,
          })),
        },
      })
    }

    // EMAIL/PASSWORD LOGIN (Database fallback)
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required for email login" },
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

    // Find verifier by email in database
    const verifiers = await sql`
      SELECT 
        v.id,
        v.wallet_address,
        v.email,
        v.name,
        v.password_hash,
        v.university_id,
        v.is_active,
        u.name as university_name,
        u.status as university_status
      FROM verifiers v
      JOIN universities u ON v.university_id = u.id
      WHERE LOWER(v.email) = LOWER(${email})
      LIMIT 1
    `

    if (!verifiers || verifiers.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const verifier = verifiers[0]

    // Check if verifier is active
    if (!verifier.is_active) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact your university admin." },
        { status: 403 }
      )
    }

    // Check if university is active
    if (verifier.university_status !== "active") {
      return NextResponse.json(
        { error: "Your university is not currently active on the platform." },
        { status: 403 }
      )
    }

    // ✅ Verify password using unified verifyPassword (supports bcrypt + legacy)
    if (!verifier.password_hash) {
      return NextResponse.json(
        { error: "Account not properly configured. Please contact your university admin." },
        { status: 401 }
      )
    }

    const { verifyPassword } = await import("@/lib/auth")
    const passwordValid = await verifyPassword(password, verifier.password_hash)

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // ✅ BLOCKCHAIN-FIRST: Verify verifier status and fetch university from blockchain (source of truth)
    let blockchainUniversity: { id: number; nameEn: string; nameAr: string } | null = null
    let authorizedUniversities: Array<{ id: number; nameEn: string; nameAr: string }> = []
    
    if (verifier.wallet_address) {
      const blockchainUniversities = await findUniversitiesWhereVerifier(verifier.wallet_address)
      authorizedUniversities = blockchainUniversities.map(u => ({
        id: typeof u.id === 'bigint' ? Number(u.id) : Number(u.id),
        nameEn: u.nameEn,
        nameAr: u.nameAr,
      }))
      
      // Find the university matching the DB university_id
      if (verifier.university_id) {
        blockchainUniversity = authorizedUniversities.find(u => u.id === verifier.university_id) || null
        
        if (!blockchainUniversity) {
          return NextResponse.json(
            { error: "Your wallet is not authorized as a verifier for this university on the blockchain. Please contact your university admin." },
            { status: 403 }
          )
        }
      } else if (authorizedUniversities.length > 0) {
        // If no university_id in DB, use first authorized university from blockchain
        blockchainUniversity = authorizedUniversities[0]
      }
    } else {
      // No wallet address - fetch university from blockchain using DB university_id
      if (verifier.university_id) {
        const uni = await fetchUniversityFromBlockchain(verifier.university_id)
        if (uni) {
          blockchainUniversity = {
            id: typeof uni.id === 'bigint' ? Number(uni.id) : Number(uni.id),
            nameEn: uni.nameEn,
            nameAr: uni.nameAr,
          }
        }
      }
    }

    if (!blockchainUniversity) {
      return NextResponse.json(
        { error: "Could not verify your university assignment on the blockchain. Please contact support." },
        { status: 403 }
      )
    }

    // ✅ Create session with blockchain university data (source of truth)
    const sessionData = {
      type: "verifier",
      loginMethod: "email",
      verifierId: verifier.id,
      walletAddress: verifier.wallet_address?.toLowerCase(),
      email: verifier.email,
      name: verifier.name,
      universityId: blockchainUniversity.id, // From blockchain
      universityName: blockchainUniversity.nameEn, // From blockchain
      universityNameAr: blockchainUniversity.nameAr, // From blockchain
      blockchainVerified: true,
      authorizedUniversities: authorizedUniversities.length > 0 ? authorizedUniversities : [blockchainUniversity],
    }

    const cookieStore = await cookies()
    cookieStore.set("verifier_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    })

    return NextResponse.json({
      success: true,
      loginMethod: "email",
      verifier: {
        id: verifier.id,
        email: verifier.email,
        name: verifier.name,
        walletAddress: verifier.wallet_address,
        universityId: blockchainUniversity.id, // From blockchain
        universityName: blockchainUniversity.nameEn, // From blockchain
        universityNameAr: blockchainUniversity.nameAr, // From blockchain
        blockchainVerified: true,
        authorizedUniversities: authorizedUniversities.length > 0 ? authorizedUniversities : [blockchainUniversity],
      },
    })
  } catch (error) {
    console.error("Verifier login error:", error)
    return NextResponse.json(
      { error: "Login failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
