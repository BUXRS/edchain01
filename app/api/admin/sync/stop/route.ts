/**
 * Admin Sync Stop Endpoint
 * 
 * Stops the blockchain indexer
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function POST(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    // Get indexer service
    let indexerService: any = null
    try {
      const module = await import("@/lib/services/indexer/IndexerService")
      indexerService = module.indexerService
    } catch {
      return NextResponse.json(
        { error: "Indexer service not available" },
        { status: 503 }
      )
    }

    if (!indexerService) {
      return NextResponse.json(
        { error: "Indexer service not initialized" },
        { status: 503 }
      )
    }

    await indexerService.stop()

    return NextResponse.json({
      success: true,
      message: "Indexer stopped successfully",
    })
  } catch (error: any) {
    console.error("[AdminSyncStop] Error:", error)
    return NextResponse.json(
      { error: "Failed to stop indexer", details: error.message },
      { status: 500 }
    )
  }
}
