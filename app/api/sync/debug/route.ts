/**
 * Debug Sync Endpoint
 * 
 * Helps diagnose why sync is returning 0 results
 */

import { type NextRequest, NextResponse } from "next/server"
import { fetchAllUniversities, fetchUniversityFromBlockchain } from "@/lib/blockchain"
import { sql } from "@/lib/db"
import { getReadOnlyProvider } from "@/lib/blockchain"
import { serializeBigInt } from "@/lib/utils/serialize-bigint"

export async function GET(request: NextRequest) {
  try {
    const debug: any = {
      timestamp: new Date().toISOString(),
      checks: {},
    }

    // Check 1: RPC Connection
    try {
      const provider = getReadOnlyProvider()
      const blockNumber = await provider.getBlockNumber()
      const network = await provider.getNetwork()
      debug.checks.rpcConnection = {
        success: true,
        blockNumber: typeof blockNumber === 'bigint' ? Number(blockNumber) : Number(blockNumber),
        chainId: typeof network.chainId === 'bigint' ? Number(network.chainId) : Number(network.chainId),
        expectedChainId: 8453,
        chainIdMatch: Number(network.chainId) === 8453,
      }
    } catch (error: any) {
      debug.checks.rpcConnection = {
        success: false,
        error: error.message,
      }
    }

    // Check 2: Contract Address
    const { getActiveContractAddress } = await import("@/lib/contracts/abi")
    const contractAddress = getActiveContractAddress()
    debug.checks.contractAddress = {
      address: contractAddress,
      isValid: contractAddress.startsWith("0x") && contractAddress.length === 42,
    }

    // Check 3: Fetch Universities from Blockchain
    try {
      // First check nextUniversityId
      const { fetchNextUniversityId } = await import("@/lib/blockchain")
      const nextId = await fetchNextUniversityId()
      
      debug.checks.nextUniversityId = {
        success: true,
        nextId,
        note: nextId === 1 ? "No universities registered yet (nextId = 1 means no universities)" : `${nextId - 1} universities should exist`,
      }
      
      const universities = await fetchAllUniversities()
      debug.checks.blockchainUniversities = {
        success: true,
        count: universities.length,
        nextUniversityId: nextId,
        universities: universities.map((u: any) => ({
          id: typeof u.id === 'bigint' ? Number(u.id) : Number(u.id),
          nameEn: u.nameEn || null,
          nameAr: u.nameAr || null,
          admin: u.admin ? String(u.admin).toLowerCase() : null,
          isActive: Boolean(u.isActive),
          exists: Boolean(u.exists),
        })),
      }
    } catch (error: any) {
      debug.checks.blockchainUniversities = {
        success: false,
        error: error.message,
        stack: error.stack,
      }
    }

    // Check 4: Database Connection
    try {
      const result = await sql`SELECT NOW() as now, COUNT(*) as universities_count FROM universities`
      debug.checks.databaseConnection = {
        success: true,
        serverTime: result[0]?.now,
        universitiesInDb: Number(result[0]?.universities_count || 0),
      }
    } catch (error: any) {
      debug.checks.databaseConnection = {
        success: false,
        error: error.message,
      }
    }

    // Check 5: Sync Status Table
    try {
      const syncStatus = await sql`SELECT * FROM sync_status WHERE id = 1`
      debug.checks.syncStatus = {
        success: true,
        exists: syncStatus.length > 0,
        data: syncStatus[0] || null,
      }
    } catch (error: any) {
      debug.checks.syncStatus = {
        success: false,
        error: error.message,
        hint: "Run migration: scripts/024-create-chain-events-table.sql",
      }
    }

    // Check 6: Chain Events Table
    try {
      const eventsCount = await sql`SELECT COUNT(*) as count FROM chain_events`
      debug.checks.chainEventsTable = {
        success: true,
        exists: true,
        eventsCount: Number(eventsCount[0]?.count || 0),
      }
    } catch (error: any) {
      debug.checks.chainEventsTable = {
        success: false,
        error: error.message,
        hint: "Run migration: scripts/024-create-chain-events-table.sql",
      }
    }

    // Check 7: Test Single University Fetch
    if (debug.checks.blockchainUniversities?.success && debug.checks.blockchainUniversities.count > 0) {
      try {
        const firstUni = debug.checks.blockchainUniversities.universities[0]
        const uniData = await fetchUniversityFromBlockchain(firstUni.id)
        // Convert BigInt to Number for JSON serialization
        debug.checks.singleUniversityFetch = {
          success: true,
          universityId: firstUni.id,
          data: uniData ? {
            id: typeof uniData.id === 'bigint' ? Number(uniData.id) : Number(uniData.id),
            nameEn: uniData.nameEn || null,
            nameAr: uniData.nameAr || null,
            admin: uniData.admin ? String(uniData.admin) : null,
            isActive: Boolean(uniData.isActive),
            exists: Boolean(uniData.exists),
          } : null,
        }
      } catch (error: any) {
        debug.checks.singleUniversityFetch = {
          success: false,
          error: error.message,
        }
      }
    }
    
    // Check 8: Test Contract Call Directly
    try {
      const { getActiveContractAddress, getCoreContractABI } = await import("@/lib/contracts/abi")
      const provider = getReadOnlyProvider()
      const contractAddress = getActiveContractAddress()
      const contract = new (await import("ethers")).Contract(contractAddress, getCoreContractABI(), provider)
      
      const nextId = await contract.nextUniversityId()
      const nextIdNumber = typeof nextId === 'bigint' ? Number(nextId) : Number(nextId)
      
      debug.checks.directContractCall = {
        success: true,
        contractAddress,
        nextUniversityId: nextIdNumber,
        note: nextIdNumber === 1 ? "Contract reports no universities registered" : `Contract reports ${nextIdNumber - 1} universities`,
      }
      
      // Try to fetch university ID 1 directly
      if (nextIdNumber > 1) {
        try {
          const uni1 = await contract.getUniversity(1)
          debug.checks.directContractCall.university1 = {
            exists: Boolean(uni1.exists),
            nameEn: uni1.nameEn || null,
            nameAr: uni1.nameAr || null,
            admin: uni1.admin ? String(uni1.admin) : null,
            isActive: Boolean(uni1.isActive),
          }
        } catch (err: any) {
          debug.checks.directContractCall.university1Error = err.message
        }
      }
    } catch (error: any) {
      debug.checks.directContractCall = {
        success: false,
        error: error.message,
      }
    }

    // Summary
    const allChecksPass = Object.values(debug.checks).every((c: any) => c.success !== false)
    debug.summary = {
      allChecksPass,
      issues: Object.entries(debug.checks)
        .filter(([_, c]: [string, any]) => c.success === false)
        .map(([name, c]: [string, any]) => ({ name, error: c.error, hint: c.hint })),
    }

    // Serialize BigInt values before returning
    const serializedDebug = serializeBigInt(debug)
    return NextResponse.json(serializedDebug)
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Debug check failed",
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
