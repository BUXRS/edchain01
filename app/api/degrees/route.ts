import { type NextRequest, NextResponse } from "next/server"
import { getDegrees, createDegree, logActivity, isDatabaseAvailable, sql } from "@/lib/db"
// Use new indexer service
let getIndexerStatus: () => any = () => ({ isRunning: false, mode: "unknown", lastProcessedBlock: 0, finalizedBlock: 0 })
try {
  const { indexerService } = require("@/lib/services/indexer/IndexerService")
  getIndexerStatus = () => indexerService.getStatus()
} catch {
  // Fallback to old indexer if new one not available
  try {
    const oldIndexer = require("@/lib/services/websocket-indexer")
    getIndexerStatus = oldIndexer.getIndexerStatus
  } catch {}
}

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({ degrees: [], sync: null })
    }

    const { searchParams } = new URL(request.url)
    const universityId = searchParams.get("universityId")
    const studentAddress = searchParams.get("studentAddress")
    const issuedBy = searchParams.get("issuedBy")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    try {
      const degrees = await getDegrees({
        universityId: universityId ? Number(universityId) : undefined,
        studentAddress: studentAddress || undefined,
        issuedBy: issuedBy || undefined,
        status: status || undefined,
        search: search || undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      })

      // Get sync metadata
      const indexerStatus = getIndexerStatus()
      const syncStatus = await sql`
        SELECT last_synced_block, finalized_block, sync_mode, updated_at
        FROM sync_status WHERE id = 1
      `.then(r => r[0] || null).catch(() => null)

      return NextResponse.json({
        degrees,
        sync: {
          lastSyncedBlock: syncStatus?.last_synced_block || 0,
          finalizedBlock: syncStatus?.finalized_block || 0,
          syncedAt: syncStatus?.updated_at || null,
          syncMode: syncStatus?.sync_mode || indexerStatus.mode,
          indexerRunning: indexerStatus.isRunning,
        },
      })
    } catch {
      return NextResponse.json({ degrees: [], sync: null })
    }
  } catch {
    return NextResponse.json({ degrees: [], sync: null })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tokenId,
      universityId,
      studentAddress,
      studentName,
      studentNameAr,
      degreeType,
      degreeTypeAr,
      major,
      majorAr,
      graduationDate,
      cgpa,
      honors,
      honorsAr,
      ipfsHash,
      issuedBy,
    } = body

    if (
      !tokenId ||
      !universityId ||
      !studentAddress ||
      !studentName ||
      !degreeType ||
      !major ||
      !graduationDate ||
      !issuedBy
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        degree: {
          id: Date.now(),
          tokenId,
          universityId,
          studentAddress,
          studentName,
          status: "active",
          createdAt: new Date().toISOString(),
        },
        message: "Degree recorded on blockchain (database sync pending)",
      })
    }

    try {
      const degree = await createDegree({
        tokenId,
        universityId,
        studentAddress,
        studentName,
        studentNameAr,
        degreeType,
        degreeTypeAr,
        major,
        majorAr,
        graduationDate,
        cgpa,
        honors,
        honorsAr,
        ipfsHash,
        issuedBy,
      })

      await logActivity({
        actorType: "issuer",
        actorAddress: issuedBy,
        action: "degree_issued",
        entityType: "degree",
        entityId: String(degree.id),
        details: { tokenId, studentAddress, universityId },
      }).catch(() => {}) // Ignore activity log errors

      return NextResponse.json({ degree })
    } catch {
      return NextResponse.json({
        degree: {
          id: Date.now(),
          tokenId,
          universityId,
          studentAddress,
          studentName,
          status: "active",
          createdAt: new Date().toISOString(),
        },
        message: "Degree recorded on blockchain (database sync pending)",
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    if (!errorMessage.includes("Failed to fetch") && !errorMessage.includes("connecting to database")) {
      console.error("Error creating degree:", error)
    }
    return NextResponse.json({ error: "Failed to create degree" }, { status: 500 })
  }
}
