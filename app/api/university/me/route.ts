/**
 * University "me" API – session-based university info (no blockchain).
 * Returns id (DB), blockchainId, name, nameAr for fast load on Issuers/Revokers/Verifiers.
 */

import { NextResponse } from "next/server"
import { getUniversitySession } from "@/lib/auth"
import { getUniversityById, isDatabaseAvailable } from "@/lib/db"

export async function GET() {
  try {
    const university = await getUniversitySession()
    if (!university?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in as a university admin." },
        { status: 401 }
      )
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        id: university.id,
        blockchainId: null,
        name: university.name,
        nameAr: university.nameAr ?? "",
      })
    }

    const row = await getUniversityById(Number(university.id)) as { name?: string; name_en?: string; name_ar?: string; blockchain_id?: number } | null
    const blockchainId = row?.blockchain_id != null ? Number(row.blockchain_id) : null
    const name = row?.name_en ?? row?.name ?? university.name
    const nameAr = row?.name_ar ?? university.nameAr ?? ""

    return NextResponse.json({
      id: university.id,
      blockchainId,
      name,
      nameAr,
    })
  } catch (error) {
    console.error("[UniversityMe] Error:", error)
    return NextResponse.json(
      { error: "Failed to load university" },
      { status: 500 }
    )
  }
}
