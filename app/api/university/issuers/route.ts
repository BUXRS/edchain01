/**
 * University Issuers API – session-based, direct DB read.
 * Source of truth: issuers table (REBUILD_DATABASE_COMPLETE.sql schema).
 * Session id is resolved to DB primary key so university_id in queries matches inserts.
 */

import { NextRequest, NextResponse } from "next/server"
import { getUniversitySession } from "@/lib/auth"
import { sql, sqlJoin, getDbUniversityIdFromSessionId, isDatabaseAvailable } from "@/lib/db"

type IssuerRow = {
  id: number
  university_id: number
  wallet_address: string | null
  name: string | null
  email: string | null
  phone: string | null
  department: string | null
  position: string | null
  is_active: boolean
  status: string | null
  nda_signed_at: string | null
  wallet_submitted_at: string | null
  blockchain_verified: boolean
  tx_hash: string | null
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

function mapIssuer(i: IssuerRow) {
  const walletSubmitted = !!(i.wallet_submitted_at || (i.wallet_address && i.wallet_address.trim() !== ""))
  return {
    id: i.id,
    universityId: i.university_id,
    walletAddress: i.wallet_address,
    name: i.name,
    email: i.email,
    phone: i.phone,
    department: i.department,
    position: i.position,
    isActive: i.is_active,
    onboardingStatus: i.status ?? undefined,
    ndaSigned: !!i.nda_signed_at,
    ndaSignedAt: i.nda_signed_at,
    walletSubmitted,
    walletSubmittedAt: i.wallet_submitted_at,
    blockchainAddedAt: null,
    blockchainVerified: i.blockchain_verified,
    txHash: i.tx_hash,
    lastVerifiedAt: i.last_verified_at,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  }
}

export async function GET(request: NextRequest) {
  const university = await getUniversitySession()
  if (!university?.id) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in as a university admin." },
      { status: 401 }
    )
  }

  if (!isDatabaseAvailable()) {
    return NextResponse.json(
      { error: "Database unavailable. Please try again later." },
      { status: 503 }
    )
  }

  const dbUniversityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)

  const url = request.nextUrl ?? new URL(request.url)
  const searchParams = url.searchParams
  const search = searchParams.get("search") || ""
  const statusFilter = searchParams.get("status") || "all"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const offset = (page - 1) * limit

  try {
    const baseConditions = [sql`university_id = ${dbUniversityId}`]
    if (search.trim()) {
      baseConditions.push(sql`(
        (name IS NOT NULL AND name ILIKE ${`%${search.trim()}%`}) OR
        (email IS NOT NULL AND email ILIKE ${`%${search.trim()}%`}) OR
        (wallet_address IS NOT NULL AND wallet_address ILIKE ${`%${search.trim()}%`}) OR
        CAST(id AS TEXT) = ${search.trim()}
      )`)
    }
    if (statusFilter === "active") {
      baseConditions.push(sql`is_active = true`)
      baseConditions.push(sql`blockchain_verified = true`)
    } else if (statusFilter === "pending") {
      baseConditions.push(sql`blockchain_verified = false`)
    }
    const whereClause = sqlJoin(baseConditions, sql` AND `)

    const countResult = await sql`
      SELECT COUNT(*) as count FROM issuers WHERE ${whereClause}
    `
    const total = Number(countResult[0]?.count ?? 0)

    const issuers = await sql`
      SELECT id, university_id, wallet_address, name, email, phone, department, position,
             is_active, status, nda_signed_at, wallet_submitted_at,
             blockchain_verified, tx_hash, last_verified_at, created_at, updated_at
      FROM issuers
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    ` as IssuerRow[]

    const statsResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE blockchain_verified = true) as on_blockchain,
        COUNT(*) FILTER (WHERE is_active = true AND blockchain_verified = true) as active,
        COUNT(*) FILTER (WHERE blockchain_verified = false) as pending
      FROM issuers
      WHERE university_id = ${dbUniversityId}
    `
    const stats = Array.isArray(statsResult) ? statsResult[0] : statsResult

    return NextResponse.json({
      issuers: issuers.map(mapIssuer),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: Number(stats?.total ?? total),
        onBlockchain: Number(stats?.on_blockchain ?? 0),
        active: Number(stats?.active ?? 0),
        pending: Number(stats?.pending ?? 0),
      },
      filters: { search: search || null, status: statusFilter === "all" ? null : statusFilter },
    })
  } catch (e) {
    console.error("[UniversityIssuers] Error:", e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        error: "Failed to load issuers.",
        details: message,
        hint: "Ensure the database schema matches scripts/REBUILD_DATABASE_COMPLETE.sql (issuers table).",
      },
      { status: 500 }
    )
  }
}
