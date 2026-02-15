/**
 * Top Universities by Issued Degrees
 * 
 * Returns universities ranked by number of degrees issued
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const range = searchParams.get("range") || "all"
    
    // Calculate date range
    let startDate: Date | null = null
    if (range !== "all") {
      const endDate = new Date()
      endDate.setUTCHours(23, 59, 59, 999)
      startDate = new Date()
      
      switch (range) {
        case "7d":
          startDate.setUTCDate(endDate.getUTCDate() - 7)
          break
        case "30d":
          startDate.setUTCDate(endDate.getUTCDate() - 30)
          break
        case "90d":
          startDate.setUTCDate(endDate.getUTCDate() - 90)
          break
      }
      
      if (startDate) {
        startDate.setUTCHours(0, 0, 0, 0)
      }
    }

    // Get top universities by degree count
    let query
    if (startDate) {
      query = sql`
        SELECT 
          u.id,
          u.blockchain_id,
          u.name,
          u.name_ar,
          COALESCE(u.name_en, u.name) as name_en,
          COUNT(d.id) as degree_count
        FROM universities u
        LEFT JOIN degrees d ON d.university_id = u.id 
          AND d.created_at >= ${startDate}
          AND d.blockchain_verified = true
        WHERE u.blockchain_verified = true
        GROUP BY u.id, u.blockchain_id, u.name, u.name_ar, COALESCE(u.name_en, u.name)
        ORDER BY degree_count DESC
        LIMIT ${limit}
      `
    } else {
      query = sql`
        SELECT 
          u.id,
          u.blockchain_id,
          u.name,
          u.name_ar,
          COALESCE(u.name_en, u.name) as name_en,
          COUNT(d.id) as degree_count
        FROM universities u
        LEFT JOIN degrees d ON d.university_id = u.id 
          AND d.blockchain_verified = true
        WHERE u.blockchain_verified = true
        GROUP BY u.id, u.blockchain_id, u.name, u.name_ar, COALESCE(u.name_en, u.name)
        ORDER BY degree_count DESC
        LIMIT ${limit}
      `
    }

    const topUniversities = await query

    return NextResponse.json({
      universities: topUniversities.map((u: any) => ({
        id: u.id,
        blockchainId: u.blockchain_id,
        name: u.name_en || u.name,
        nameAr: u.name_ar,
        degreeCount: Number(u.degree_count || 0),
      })),
      range,
    })
  } catch (error: any) {
    console.error("[TopUniversities] Error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to get top universities",
        universities: [],
      },
      { status: 500 }
    )
  }
}
