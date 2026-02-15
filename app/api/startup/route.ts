/**
 * Startup API
 * 
 * This endpoint initializes automatic blockchain sync services.
 * Can be called on server startup or manually.
 */

import { type NextRequest, NextResponse } from "next/server"
import { initializeAutoSync } from "@/lib/startup/auto-sync-init"

export async function GET(request: NextRequest) {
  return await handleStartup(request)
}

export async function POST(request: NextRequest) {
  return await handleStartup(request)
}

async function handleStartup(request: NextRequest) {
  try {
    await initializeAutoSync()
    
    return NextResponse.json({
      success: true,
      message: "Auto sync services initialized",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to initialize auto sync",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
