import { type NextRequest, NextResponse } from "next/server"
import { fetchDegreeFromBlockchain } from "@/lib/blockchain"

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

    // Fetch degree from blockchain
    const degree = await fetchDegreeFromBlockchain(tokenIdNum)

    if (!degree) {
      return NextResponse.json({ error: "Degree not found" }, { status: 404 })
    }

    // For now, return a placeholder or redirect to verification page
    // In production, you would generate or fetch the actual certificate image
    // This could be stored in IPFS, generated on-the-fly, or stored in a CDN
    
    // Return a JSON response with the verification URL
    // The frontend can use this to display the certificate
    return NextResponse.json({
      tokenId: tokenIdNum,
      verificationUrl: `${request.nextUrl.origin}/verify?id=${tokenIdNum}`,
      degree: {
        nameEn: degree.nameEn,
        nameAr: degree.nameAr,
        majorEn: degree.majorEn,
        majorAr: degree.majorAr,
        facultyEn: degree.facultyEn,
        facultyAr: degree.facultyAr,
        year: degree.year,
        gpa: degree.gpa,
        level: degree.level,
      },
      // In production, you would return the actual image URL or generate it
      imageUrl: null, // Placeholder - implement certificate image generation
    })
  } catch (error) {
    console.error("Error fetching certificate image:", error)
    return NextResponse.json({ error: "Failed to fetch certificate" }, { status: 500 })
  }
}
