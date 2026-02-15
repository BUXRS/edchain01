import { type NextRequest, NextResponse } from "next/server"
import { getUniversities, createUniversity, logActivity, isDatabaseAvailable, sql } from "@/lib/db"
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
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || undefined

  // ✅ DB-FIRST ARCHITECTURE: Only serve from database (synced by indexer)
  if (!isDatabaseAvailable()) {
    return NextResponse.json({ 
      universities: [], 
      source: "database",
      sync: null,
      error: "Database not available" 
    })
  }

  try {
    const universities = await getUniversities(status)

    // Get sync metadata
    const indexerStatus = getIndexerStatus()
    const syncStatus = await sql`
      SELECT last_synced_block, finalized_block, sync_mode, updated_at
      FROM sync_status WHERE id = 1
    `.then(r => r[0] || null).catch(() => null)

    return NextResponse.json({ 
      universities: universities || [], 
      source: "database",
      sync: {
        lastSyncedBlock: syncStatus?.last_synced_block || 0,
        finalizedBlock: syncStatus?.finalized_block || 0,
        syncedAt: syncStatus?.updated_at || null,
        syncMode: syncStatus?.sync_mode || indexerStatus.mode,
        indexerRunning: indexerStatus.isRunning,
      },
    })
  } catch (dbError) {
    console.error("[Universities API] Database fetch failed:", dbError)
    return NextResponse.json({ 
      universities: [], 
      source: "database",
      sync: null,
      error: "Database query failed" 
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const { walletAddress, name, nameAr, country, logoUrl, website } = body

    if (!walletAddress || !name) {
      return NextResponse.json({ error: "Wallet address and name are required" }, { status: 400 })
    }

    const university = await createUniversity({
      walletAddress,
      name,
      nameAr,
      country,
      logoUrl,
      website,
    })

    try {
      await logActivity({
        actorType: "system",
        action: "university_registered",
        entityType: "university",
        entityId: String(university.id),
        details: { walletAddress, name },
      })
    } catch (logError) {
      console.error("Error logging activity:", logError)
    }

    return NextResponse.json({ university })
  } catch (error) {
    console.error("Error creating university:", error)
    return NextResponse.json({ error: "Failed to create university" }, { status: 500 })
  }
}
