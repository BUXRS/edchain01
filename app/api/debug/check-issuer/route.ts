import { type NextRequest, NextResponse } from "next/server"
import { 
  getWalletRoles, 
  checkIsIssuerOnChain, 
  findUniversitiesWhereIssuer,
  getReadOnlyContract,
  getCoreContract,
} from "@/lib/blockchain"
import { Contract } from "ethers"
import { 
  getActiveContractAddress, 
  getReaderContractAddress,
  getCoreContractABI,
  getReaderContractABI,
} from "@/lib/contracts/abi"
import { getReadOnlyProvider } from "@/lib/blockchain"

/**
 * GET /api/debug/check-issuer?walletAddress=0x...&universityId=1
 * Debug endpoint to check issuer status on blockchain
 * Returns detailed information about the wallet's issuer status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get("walletAddress")
    const universityIdParam = searchParams.get("universityId")

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress query parameter is required" },
        { status: 400 }
      )
    }

    const normalizedAddress = walletAddress.toLowerCase()
    const results: any = {
      walletAddress: normalizedAddress,
      contractAddresses: {
        core: getActiveContractAddress(),
        reader: getReaderContractAddress(),
        render: "0xC28ed1b3DD8AE49e7FC94cB15891524848f6ef42",
      },
      checks: {},
    }

    // Check 1: Use getWalletRoles (efficient method)
    console.log(`[Debug] Checking wallet roles for ${normalizedAddress}...`)
    try {
      const roles = await getWalletRoles(normalizedAddress)
      results.checks.getWalletRoles = {
        success: true,
        issuerForUniversities: roles.issuerForUniversities,
        adminOfUniversities: roles.adminOfUniversities,
        revokerForUniversities: roles.revokerForUniversities,
        verifierForUniversities: roles.verifierForUniversities,
        isContractOwner: roles.isContractOwner,
      }
      console.log(`[Debug] getWalletRoles result:`, results.checks.getWalletRoles)
    } catch (error: any) {
      results.checks.getWalletRoles = {
        success: false,
        error: error.message || String(error),
      }
      console.error(`[Debug] getWalletRoles error:`, error)
    }

    // Check 2: Use findUniversitiesWhereIssuer
    console.log(`[Debug] Finding universities where issuer...`)
    try {
      const universities = await findUniversitiesWhereIssuer(normalizedAddress)
      results.checks.findUniversitiesWhereIssuer = {
        success: true,
        universities: universities.map(u => ({
          id: Number(u.id),
          nameEn: u.nameEn,
          nameAr: u.nameAr,
          isActive: u.isActive,
        })),
        count: universities.length,
      }
      console.log(`[Debug] findUniversitiesWhereIssuer result:`, results.checks.findUniversitiesWhereIssuer)
    } catch (error: any) {
      results.checks.findUniversitiesWhereIssuer = {
        success: false,
        error: error.message || String(error),
      }
      console.error(`[Debug] findUniversitiesWhereIssuer error:`, error)
    }

    // Check 3: Direct Reader contract checkRoles call
    if (universityIdParam) {
      const uniId = Number.parseInt(universityIdParam)
      console.log(`[Debug] Checking Reader contract checkRoles for university ${uniId}...`)
      try {
        const readerContract = getReadOnlyContract()
        const roles = await readerContract.checkRoles(uniId, normalizedAddress)
        results.checks.readerCheckRoles = {
          success: true,
          universityId: uniId,
          isIssuer: roles.isIssuer,
          isAdmin: roles.isAdmin,
          isRevoker: roles.isRevoker,
          isVerifier: roles.isVerifier,
          rawResult: roles,
        }
        console.log(`[Debug] Reader checkRoles result:`, results.checks.readerCheckRoles)
      } catch (error: any) {
        results.checks.readerCheckRoles = {
          success: false,
          universityId: uniId,
          error: error.message || String(error),
          errorCode: error?.code,
          errorInfo: error?.info,
        }
        console.error(`[Debug] Reader checkRoles error:`, error)
      }

      // Check 4: Direct Core contract isIssuer call
      console.log(`[Debug] Checking Core contract isIssuer for university ${uniId}...`)
      try {
        const coreContract = new Contract(
          getActiveContractAddress(),
          getCoreContractABI(),
          getReadOnlyProvider()
        )
        const isIssuer = await coreContract.isIssuer(uniId, normalizedAddress)
        results.checks.coreIsIssuer = {
          success: true,
          universityId: uniId,
          isIssuer: Boolean(isIssuer),
        }
        console.log(`[Debug] Core isIssuer result:`, results.checks.coreIsIssuer)
      } catch (error: any) {
        results.checks.coreIsIssuer = {
          success: false,
          universityId: uniId,
          error: error.message || String(error),
          errorCode: error?.code,
          errorInfo: error?.info,
        }
        console.error(`[Debug] Core isIssuer error:`, error)
      }

      // Check 5: Use checkIsIssuerOnChain helper
      console.log(`[Debug] Using checkIsIssuerOnChain helper...`)
      try {
        const isIssuer = await checkIsIssuerOnChain(uniId, normalizedAddress)
        results.checks.checkIsIssuerOnChain = {
          success: true,
          universityId: uniId,
          isIssuer: Boolean(isIssuer),
        }
        console.log(`[Debug] checkIsIssuerOnChain result:`, results.checks.checkIsIssuerOnChain)
      } catch (error: any) {
        results.checks.checkIsIssuerOnChain = {
          success: false,
          universityId: uniId,
          error: error.message || String(error),
        }
        console.error(`[Debug] checkIsIssuerOnChain error:`, error)
      }
    }

    // Check 6: Get nextUniversityId to see total universities
    try {
      const coreContract = new Contract(
        getActiveContractAddress(),
        getCoreContractABI(),
        getReadOnlyProvider()
      )
      const nextId = await coreContract.nextUniversityId()
      results.totalUniversities = Number(nextId) - 1
      console.log(`[Debug] Total universities: ${results.totalUniversities}`)
    } catch (error: any) {
      results.totalUniversities = "unknown"
      console.error(`[Debug] Error getting nextUniversityId:`, error)
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error: any) {
    console.error("[Debug] Error:", error)
    return NextResponse.json(
      { 
        error: "Debug check failed", 
        details: error.message || String(error),
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
