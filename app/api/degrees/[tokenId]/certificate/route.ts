import { type NextRequest, NextResponse } from "next/server"
import { fetchDegreeFromBlockchain, fetchUniversityFromBlockchain } from "@/lib/blockchain"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params
    const tokenIdNum = Number.parseInt(tokenId)

    if (Number.isNaN(tokenIdNum) || tokenIdNum < 1) {
      return NextResponse.json({ error: "Invalid token ID" }, { status: 400 })
    }

    // Fetch degree and university from blockchain
    const [degree, university] = await Promise.all([
      fetchDegreeFromBlockchain(tokenIdNum),
      fetchUniversityFromBlockchain(Number(tokenIdNum)), // This will be fetched properly with university ID
    ])

    if (!degree) {
      return NextResponse.json({ error: "Degree not found" }, { status: 404 })
    }

    // For now, redirect to verification page for printing
    // In production, you would generate a PDF certificate here
    // This could use libraries like pdfkit, puppeteer, or a service
    
    const verificationUrl = `${request.nextUrl.origin}/verify?id=${tokenIdNum}`
    
    // Return HTML that can be printed as PDF
    // The frontend can use window.print() or a service to convert to PDF
    return NextResponse.json({
      tokenId: tokenIdNum,
      verificationUrl,
      downloadUrl: verificationUrl, // For now, use verification page
      // In production, return actual PDF blob or URL
      pdfUrl: null, // Placeholder - implement PDF generation
    })
  } catch (error) {
    console.error("Error generating certificate PDF:", error)
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 })
  }
}
