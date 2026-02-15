/**
 * Start WebSocket Indexer API
 * 
 * Manually start the WebSocket indexer if it's not running
 */

import { NextRequest, NextResponse } from "next/server"
import { websocketIndexer, getIndexerStatus } from "@/lib/services/websocket-indexer"

export async function POST(request: NextRequest) {
  try {
    const status = getIndexerStatus()
    
    if (status.isRunning) {
      return NextResponse.json({
        success: true,
        message: "Indexer is already running",
        status: getIndexerStatus(),
      })
    }

    console.log("[API] Manually starting WebSocket indexer...")
    await websocketIndexer.start()
    
    const newStatus = getIndexerStatus()
    
    return NextResponse.json({
      success: true,
      message: "Indexer started successfully",
      status: newStatus,
    })
  } catch (error: any) {
    console.error("[API] Failed to start indexer:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to start indexer",
      details: error.stack,
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: getIndexerStatus(),
    message: "Use POST to start the indexer",
  })
}
