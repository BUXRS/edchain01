/**
 * Admin Degree NFT Metadata Endpoint
 * 
 * Returns NFT metadata for a degree (tokenURI, image, attributes)
 * Prefers DB-cached metadata, falls back to blockchain fetch (server-side only)
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"
import { Contract } from "ethers"
import { getCoreContractABI, getActiveContractAddress } from "@/lib/contracts/abi"
import { getReadOnlyProvider } from "@/lib/blockchain"

const RENDER_CONTRACT_ADDRESS = "0xC28ed1b3DD8AE49e7FC94cB1591524848f6ef42"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
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

    // Get degree from database (token_id is stored as VARCHAR, so compare as string)
    const degrees = await sql`
      SELECT 
        d.*,
        u.name_en as university_name,
        u.name_ar as university_name_ar
      FROM degrees d
      LEFT JOIN universities u ON d.university_id = u.id
      WHERE d.token_id = ${tokenIdStr}
      LIMIT 1
    `

    if (degrees.length === 0) {
      return NextResponse.json(
        { error: "Degree not found in database" },
        { status: 404 }
      )
    }

    const degree = degrees[0]

    // Check if we have cached tokenURI in DB (if we add this column later)
    // For now, fetch from blockchain
    let tokenURI: string | null = null
    let metadata: any = null
    let imageUrl: string | null = null

    try {
      // Fetch tokenURI from Core contract (which calls Render contract)
      const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), getReadOnlyProvider())
      tokenURI = await coreContract.tokenURI(tokenIdNum)

      // If tokenURI is a data URI (base64), parse it
      if (tokenURI && tokenURI.startsWith("data:application/json;base64,")) {
        const base64Data = tokenURI.split(",")[1]
        const jsonString = Buffer.from(base64Data, "base64").toString("utf-8")
        metadata = JSON.parse(jsonString)
      } else if (tokenURI && (tokenURI.startsWith("http://") || tokenURI.startsWith("https://"))) {
        // Fetch from HTTP/HTTPS URL
        const response = await fetch(tokenURI)
        if (response.ok) {
          metadata = await response.json()
        }
      } else if (tokenURI && tokenURI.startsWith("ipfs://")) {
        // Handle IPFS URLs (convert to gateway URL)
        const ipfsHash = tokenURI.replace("ipfs://", "")
        const gatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`
        const response = await fetch(gatewayUrl)
        if (response.ok) {
          metadata = await response.json()
        }
      }

      // Extract image URL from metadata
      if (metadata) {
        imageUrl = metadata.image || metadata.image_url || null
        if (imageUrl && imageUrl.startsWith("ipfs://")) {
          const ipfsHash = imageUrl.replace("ipfs://", "")
          imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`
        }
      }
    } catch (error: any) {
      console.warn(`[NFTMetadata] Failed to fetch tokenURI for ${tokenIdNum}:`, error.message)
      // Continue without metadata - we'll use DB data to construct a basic metadata object
    }

    // Build normalized metadata from DB if blockchain fetch failed
    if (!metadata) {
      metadata = {
        name: `Degree Certificate #${tokenIdNum}`,
        description: `Blockchain-verified degree certificate issued by ${degree.university_name || "University"}`,
        attributes: [
          { trait_type: "Token ID", value: tokenIdNum },
          { trait_type: "Student Name", value: degree.student_name || "N/A" },
          { trait_type: "University", value: degree.university_name || "N/A" },
          { trait_type: "Major", value: degree.major || "N/A" },
          { trait_type: "Degree Type", value: degree.degree_type || "N/A" },
          { trait_type: "Graduation Date", value: degree.graduation_date || "N/A" },
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
      // Additional DB fields for convenience
      degree: {
        studentName: degree.student_name,
        studentNameAr: degree.student_name_ar,
        universityName: degree.university_name,
        universityNameAr: degree.university_name_ar,
        major: degree.major,
        majorAr: degree.major_ar,
        degreeType: degree.degree_type,
        graduationDate: degree.graduation_date,
        isRevoked: degree.is_revoked,
      },
    })
  } catch (error: any) {
    console.error("[NFTMetadata] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch NFT metadata", details: error.message },
      { status: 500 }
    )
  }
}
