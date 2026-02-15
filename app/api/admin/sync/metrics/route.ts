/**
 * Admin Sync Metrics Endpoint
 * 
 * Returns metrics for charts (events over time, throughput, etc.)
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  endDate.setUTCHours(23, 59, 59, 999)
  
  let startDate = new Date()
  
  switch (range) {
    case "1h":
      startDate.setUTCHours(endDate.getUTCHours() - 1)
      break
    case "24h":
      startDate.setUTCDate(endDate.getUTCDate() - 1)
      break
    case "7d":
      startDate.setUTCDate(endDate.getUTCDate() - 7)
      break
    case "30d":
      startDate.setUTCDate(endDate.getUTCDate() - 30)
      break
    default:
      startDate.setUTCDate(endDate.getUTCDate() - 24)
  }
  
  startDate.setUTCHours(0, 0, 0, 0)
  
  return { startDate, endDate }
}

export async function GET(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "24h"

    const { startDate, endDate } = getDateRange(range)

    // Determine bucket size based on range
    let bucketSize: "hour" | "day" = "hour"
    if (range === "7d" || range === "30d") {
      bucketSize = "day"
    }

    // Get events over time (bucketed)
    const eventsOverTime = await sql`
      SELECT 
        DATE_TRUNC(${bucketSize}, created_at) as bucket,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE processed = true) as processed_count,
        COUNT(*) FILTER (WHERE processed = false) as failed_count
      FROM chain_events
      WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
      GROUP BY DATE_TRUNC(${bucketSize}, created_at)
      ORDER BY bucket ASC
    `

    // Get events by type
    const eventsByType = await sql`
      SELECT 
        event_name,
        COUNT(*) as count
      FROM chain_events
      WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
      GROUP BY event_name
      ORDER BY count DESC
    `

    // Get blocks processed per bucket
    const blocksProcessed = await sql`
      SELECT 
        DATE_TRUNC(${bucketSize}, created_at) as bucket,
        COUNT(DISTINCT block_number) as blocks_count,
        MAX(block_number) as max_block,
        MIN(block_number) as min_block
      FROM chain_events
      WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
      GROUP BY DATE_TRUNC(${bucketSize}, created_at)
      ORDER BY bucket ASC
    `

    // Get processing stats
    const processingStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE processed = true) as processed,
        COUNT(*) FILTER (WHERE processed = false AND created_at < NOW() - INTERVAL '5 minutes') as failed,
        COUNT(*) FILTER (WHERE is_finalized = true) as finalized,
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_seconds
      FROM chain_events
      WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
    `.then(r => r[0] || null)

    return NextResponse.json({
      range,
      eventsOverTime: eventsOverTime.map((r: any) => ({
        time: r.bucket.toISOString(),
        count: Number(r.count),
        processed: Number(r.processed_count),
        failed: Number(r.failed_count),
      })),
      eventsByType: eventsByType.map((r: any) => ({
        eventName: r.event_name,
        count: Number(r.count),
      })),
      blocksProcessed: blocksProcessed.map((r: any) => ({
        time: r.bucket.toISOString(),
        blocksCount: Number(r.blocks_count),
        maxBlock: Number(r.max_block),
        minBlock: Number(r.min_block),
      })),
      processingStats: processingStats ? {
        total: Number(processingStats.total),
        processed: Number(processingStats.processed),
        failed: Number(processingStats.failed),
        finalized: Number(processingStats.finalized),
        avgProcessingTimeSeconds: processingStats.avg_processing_time_seconds 
          ? Number(processingStats.avg_processing_time_seconds) 
          : null,
      } : null,
    })
  } catch (error: any) {
    console.error("[AdminSyncMetrics] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch metrics", details: error.message },
      { status: 500 }
    )
  }
}
