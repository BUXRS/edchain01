/**
 * University Degree NFT Metadata Endpoint
 *
 * Returns NFT metadata for a degree belonging to the authenticated university.
 * Same logic as admin NFT endpoint but restricted to university_id = session university.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"
import { Contract } from "ethers"
import { getCoreContractABI, getActiveContractAddress } from "@/lib/contracts/abi"
import { getReadOnlyProvider } from "@/lib/blockchain"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) {
    return university
  }

  try {
    const { tokenId } = await params
    const tokenIdStr = String(tokenId).trim()
    const tokenIdNum = parseInt(tokenIdStr, 10)

    if (!tokenIdStr || tokenIdStr === "undefined" || tokenIdStr === "null" || isNaN(tokenIdNum) || tokenIdNum < 1) {
      return NextResponse.json(
        { error: "Invalid token ID" },
        { status: 400 }
      )
    }

    const degrees = await sql`
      SELECT 
        d.*,
        u.name_en as university_name,
        u.name_ar as university_name_ar
      FROM degrees d
      LEFT JOIN universities u ON d.university_id = u.id
      WHERE d.token_id = ${tokenIdStr}
        AND d.university_id = ${university.id}
      LIMIT 1
    `

    if (degrees.length === 0) {
      return NextResponse.json(
        { error: "Degree not found or not issued by your university" },
        { status: 404 }
      )
    }

    const degree = degrees[0]

    let tokenURI: string | null = null
    let metadata: any = null
    let imageUrl: string | null = null

    try {
      const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
      tokenURI = await coreContract.tokenURI(tokenIdNum)

      if (tokenURI && tokenURI.startsWith("data:application/json;base64,")) {
        const base64Data = tokenURI.split(",")[1]
        const jsonString = Buffer.from(base64Data, "base64").toString("utf-8")
        metadata = JSON.parse(jsonString)
      } else if (tokenURI && (tokenURI.startsWith("http://") || tokenURI.startsWith("https://"))) {
        const response = await fetch(tokenURI)
        if (response.ok) {
          metadata = await response.json()
        }
      } else if (tokenURI && tokenURI.startsWith("ipfs://")) {
        const ipfsHash = tokenURI.replace("ipfs://", "")
        const gatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`
        const response = await fetch(gatewayUrl)
        if (response.ok) {
          metadata = await response.json()
        }
      }

      if (metadata) {
        imageUrl = metadata.image || metadata.image_url || null
        if (imageUrl && imageUrl.startsWith("ipfs://")) {
          const ipfsHash = imageUrl.replace("ipfs://", "")
          imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`
        }
      }
    } catch (error: any) {
      console.warn(`[UniversityNFT] Failed to fetch tokenURI for ${tokenIdNum}:`, error.message)
    }

    if (!metadata) {
      const graduationDate = degree.graduation_date || degree.graduation_year
      metadata = {
        name: `Degree Certificate #${tokenIdNum}`,
        description: `Blockchain-verified degree certificate issued by ${degree.university_name || "University"}`,
        attributes: [
          { trait_type: "Token ID", value: tokenIdNum },
          { trait_type: "Student Name", value: degree.student_name || "N/A" },
          { trait_type: "University", value: degree.university_name || "N/A" },
          { trait_type: "Major", value: degree.major || "N/A" },
          { trait_type: "Degree Type", value: degree.degree_type || "N/A" },
          { trait_type: "Graduation Date", value: graduationDate || "N/A" },
          { trait_type: "Status", value: degree.is_revoked ? "Revoked" : "Active" },
        ],
      }
    }

    return NextResponse.json({
      tokenId: tokenIdNum,
      tokenURI,
      metadata: {
        name: metadata.name || `Degree Certificate #${tokenIdStr}`,
        description: metadata.description || `Blockchain-verified degree certificate`,
        image: imageUrl || metadata.image || null,
        attributes: metadata.attributes || [],
      },
      imageUrl,
      degree: {
        studentName: degree.student_name,
        studentNameAr: degree.student_name_ar,
        universityName: degree.university_name,
        universityNameAr: degree.university_name_ar,
        major: degree.major,
        majorAr: degree.major_ar,
        degreeType: degree.degree_type,
        graduationDate: degree.graduation_date,
        graduationYear: degree.graduation_year,
        isRevoked: degree.is_revoked,
        faculty: degree.faculty,
        facultyAr: degree.faculty_ar,
        cgpa: degree.cgpa,
        gpa: degree.gpa,
        studentAddress: degree.student_address,
        createdAt: degree.created_at,
      },
    })
  } catch (error: any) {
    console.error("[UniversityNFT] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch NFT metadata", details: error.message },
      { status: 500 }
    )
  }
}
