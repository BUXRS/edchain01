/**
 * Admin Degrees CSV Export Endpoint
 * 
 * Exports filtered degrees list to CSV
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function GET(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    // Get filters from query params (same as main degrees endpoint)
    const { searchParams } = new URL(request.url)
    const filters = new URLSearchParams()
    
    // Copy relevant filters
    if (searchParams.get("range")) filters.set("range", searchParams.get("range")!)
    if (searchParams.get("startDate")) filters.set("startDate", searchParams.get("startDate")!)
    if (searchParams.get("endDate")) filters.set("endDate", searchParams.get("endDate")!)
    if (searchParams.get("status")) filters.set("status", searchParams.get("status")!)
    if (searchParams.get("universityId")) filters.set("universityId", searchParams.get("universityId")!)
    if (searchParams.get("q")) filters.set("q", searchParams.get("q")!)
    if (searchParams.get("search")) filters.set("q", searchParams.get("search")!)

    // Fetch degrees using the main endpoint (with large page size for export)
    filters.set("pageSize", "10000") // Large limit for export
    filters.set("page", "1")

    const degreesResponse = await fetch(`${request.nextUrl.origin}/api/admin/degrees?${filters.toString()}`)
    if (!degreesResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch degrees for export" },
        { status: 500 }
      )
    }

    const { degrees } = await degreesResponse.json()

    // Generate CSV
    const headers = [
      "Token ID",
      "Student Name",
      "Student Name (Arabic)",
      "Student Address",
      "University",
      "University (Arabic)",
      "Degree Type",
      "Major",
      "Major (Arabic)",
      "Graduation Date",
      "CGPA",
      "Honors",
      "Status",
      "Revoked At",
      "Revoked By",
      "Revocation Reason",
      "Transaction Hash",
      "Issued By",
      "Created At",
    ]

    const rows = degrees.map((d: any) => [
      d.tokenId || "",
      d.studentName || "",
      d.studentNameAr || "",
      d.studentAddress || "",
      d.universityName || "",
      d.universityNameAr || "",
      d.degreeType || "",
      d.major || "",
      d.majorAr || "",
      d.graduationDate || "",
      d.cgpa || "",
      d.honors || "",
      d.status || "",
      d.revokedAt || "",
      d.revokedBy || "",
      d.revocationReason || "",
      d.txHash || "",
      d.issuedBy || "",
      d.createdAt || "",
    ])

    // Escape CSV values
    const escapeCsv = (value: any): string => {
      if (value === null || value === undefined) return ""
      const str = String(value)
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row: any[]) => row.map(escapeCsv).join(",")),
    ].join("\n")

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="degrees-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("[ExportCSV] Error:", error)
    return NextResponse.json(
      { error: "Failed to export degrees", details: error.message },
      { status: 500 }
    )
  }
}
