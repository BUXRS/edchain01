import { type NextRequest, NextResponse } from "next/server"
import { 
  getWalletRoles, 
  fetchContractOwner,
} from "@/lib/blockchain"
import { Contract } from "ethers"
import { 
  getCoreContractABI,
  getActiveContractAddress,
} from "@/lib/contracts/abi"
import { getRpcHttpProvider } from "@/lib/config/rpc-provider"

/**
 * GET /api/debug/check-contract-owner?walletAddress=0x...
 * Debug endpoint to check if a wallet is the contract owner
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get("walletAddress")

    const results: any = {
      contractAddress: getActiveContractAddress(),
      checks: {},
    }

    // Check 1: Use fetchContractOwner
    console.log(`[Debug] Fetching contract owner...`)
    try {
      const owner = await fetchContractOwner()
      results.checks.fetchContractOwner = {
        success: true,
        owner: owner,
      }
      console.log(`[Debug] Contract owner:`, owner)
    } catch (error: any) {
      results.checks.fetchContractOwner = {
        success: false,
        error: error.message || String(error),
      }
      console.error(`[Debug] fetchContractOwner error:`, error)
    }

    // Check 2: Direct contract call
    console.log(`[Debug] Direct contract owner() call...`)
    try {
      const provider = getRpcHttpProvider()
      const contract = new Contract(
        getActiveContractAddress(),
        getCoreContractABI(),
        provider
      )
      const owner = await contract.owner()
      results.checks.directCall = {
        success: true,
        owner: owner,
      }
      console.log(`[Debug] Direct call owner:`, owner)
    } catch (error: any) {
      results.checks.directCall = {
        success: false,
        error: error.message || String(error),
        errorCode: error?.code,
      }
      console.error(`[Debug] Direct call error:`, error)
    }

    // Check 3: Use getWalletRoles if wallet provided
    if (walletAddress) {
      const normalizedAddress = walletAddress.toLowerCase()
      console.log(`[Debug] Checking wallet roles for ${normalizedAddress}...`)
      try {
        const roles = await getWalletRoles(normalizedAddress)
        results.checks.getWalletRoles = {
          success: true,
          isContractOwner: roles.isContractOwner,
          walletAddress: normalizedAddress,
        }
        console.log(`[Debug] getWalletRoles - isContractOwner:`, roles.isContractOwner)
      } catch (error: any) {
        results.checks.getWalletRoles = {
          success: false,
          error: error.message || String(error),
        }
        console.error(`[Debug] getWalletRoles error:`, error)
      }

      // Compare wallet with owner
      const owner = results.checks.fetchContractOwner?.owner || results.checks.directCall?.owner
      if (owner) {
        results.comparison = {
          walletAddress: normalizedAddress,
          contractOwner: owner.toLowerCase(),
          matches: owner.toLowerCase() === normalizedAddress,
        }
      }
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
