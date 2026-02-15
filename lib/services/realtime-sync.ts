/**
 * Real-Time Blockchain Sync Service
 * 
 * Continuously monitors blockchain events and syncs data to database in real-time.
 * Uses WebSocket connections and event listeners for instant updates.
 * 
 * ✅ MANDATORY: Blockchain is source of truth - DB is always synced from blockchain
 */

import { JsonRpcProvider, Contract, EventLog } from "ethers"
import { getRealtimeSyncInterval } from "@/lib/config/sync-config"
import { getActiveContractAddress, getCoreContractABI, CHAIN_ID } from "@/lib/contracts/abi"
import { blockchainSync } from "./blockchain-sync"

// ✅ Upgradable RPC Configuration
import { getPrimaryRpcHttpUrl } from "@/lib/config/rpc-config"

// Use centralized RPC configuration (upgradable via environment variables)
const BASE_RPC_URL = getPrimaryRpcHttpUrl()

let wsProvider: JsonRpcProvider | null = null
let eventListeners: Map<string, () => void> = new Map()
let syncInterval: NodeJS.Timeout | null = null
let isRunning = false

/**
 * Initialize real-time sync service
 */
export async function startRealtimeSync() {
  if (isRunning) {
    console.log("[RealtimeSync] Already running")
    return
  }

  console.log("[RealtimeSync] Starting real-time blockchain sync...")
  isRunning = true

  try {
    // Initial full sync
    await performFullSync()

    // Tier-aware: Free=30s, Paid=15s (set RPC_PAID_TIER=true)
    const interval = getRealtimeSyncInterval()
    syncInterval = setInterval(async () => {
      try {
        await performIncrementalSync()
      } catch (error) {
        console.error("[RealtimeSync] Periodic sync error:", error)
      }
    }, interval)

    // Skip event listeners - Base RPC has batch limit (max 10 calls)
    // Polling-based sync is handled by websocket-indexer
    // Event listeners would require batching filters, which is complex
    // Instead, rely on periodic polling which is more reliable
    console.log("[RealtimeSync] Using polling-based sync (event listeners skipped due to RPC batch limits)")

    console.log("[RealtimeSync] Real-time sync started successfully")
  } catch (error) {
    console.error("[RealtimeSync] Failed to start:", error)
    isRunning = false
  }
}

/**
 * Stop real-time sync service
 */
export function stopRealtimeSync() {
  if (!isRunning) return

  console.log("[RealtimeSync] Stopping real-time sync...")
  isRunning = false

  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }

  // Remove event listeners
  eventListeners.forEach((cleanup) => cleanup())
  eventListeners.clear()

  if (wsProvider) {
    wsProvider.destroy()
    wsProvider = null
  }

  console.log("[RealtimeSync] Stopped")
}

/**
 * Perform initial full sync of all data
 */
async function performFullSync() {
  console.log("[RealtimeSync] Performing full sync...")
  
  try {
    // Sync all universities
    const universitiesResult = await blockchainSync.syncAllUniversities()
    console.log(`[RealtimeSync] Synced ${universitiesResult.added + universitiesResult.updated} universities`)

    // Sync degrees for each university
    // First, get all universities from blockchain (not just synced ones)
    const { fetchAllUniversities } = await import("@/lib/blockchain")
    const blockchainUniversities = await fetchAllUniversities()
    
    for (const uni of blockchainUniversities) {
      try {
        const uniId = Number(uni.id)
        // Sync university first (this also syncs issuers, revokers, and verifiers)
        await blockchainSync.syncUniversity(uniId)
        // Then sync degrees
        await blockchainSync.syncDegreesForUniversity(uniId)
      } catch (error) {
        console.error(`[RealtimeSync] Error syncing university ${uni.id}:`, error)
      }
    }

    console.log("[RealtimeSync] Full sync completed")
  } catch (error) {
    console.error("[RealtimeSync] Full sync error:", error)
  }
}

/**
 * Perform incremental sync (only new/changed data)
 */
async function performIncrementalSync() {
  try {
    // Get latest block number from last sync
    const lastSyncedBlock = await getLastSyncedBlock()
    const currentBlock = await getCurrentBlock()

    if (lastSyncedBlock >= currentBlock) {
      return // No new blocks
    }

    console.log(`[RealtimeSync] Incremental sync from block ${lastSyncedBlock} to ${currentBlock}`)

    // Sync new universities
    await blockchainSync.syncAllUniversities()

    // Sync new degrees
    const { fetchAllUniversities } = await import("@/lib/blockchain")
    const blockchainUniversities = await fetchAllUniversities()
    
    for (const uni of blockchainUniversities) {
      try {
        const uniId = Number(uni.id)
        // Sync issuers, revokers, and verifiers in incremental sync too
        await blockchainSync.syncIssuersForUniversity(uniId)
        await blockchainSync.syncRevokersForUniversity(uniId)
        await blockchainSync.syncVerifiersForUniversity(uniId)
        await blockchainSync.syncDegreesForUniversity(uniId)
      } catch (error) {
        console.error(`[RealtimeSync] Error syncing data for university ${uni.id}:`, error)
      }
    }

    // Update last synced block
    await updateLastSyncedBlock(currentBlock)
  } catch (error) {
    console.error("[RealtimeSync] Incremental sync error:", error)
  }
}

/**
 * Set up WebSocket event listeners for real-time updates
 */
async function setupEventListeners() {
  try {
    const contractAddress = getActiveContractAddress()
    // Use Core contract ABI for event listening
    const abi = getCoreContractABI()

    // Use official Base L2 mainnet RPC endpoint
    // Create provider with timeout and better error handling
    // Use centralized RPC provider for smart failover
    const { getRpcHttpProvider } = await import("@/lib/config/rpc-provider")
    const provider = getRpcHttpProvider()

    // Test connection before setting up listeners
    try {
      await Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5000))
      ])
    } catch (testError: any) {
      // Suppress expected connection test failures - they're normal during retries
      if (!testError?.message?.includes("failed to detect network")) {
        // Only log unexpected errors
        console.warn("[RealtimeSync] Connection test warning:", testError?.message)
      }
      // Continue with setup even if test fails - provider might still work
    }

    const contract = new Contract(contractAddress, abi, provider)

    // Listen to UniversityRegistered events
    const universityListener = contract.on("UniversityRegistered", async (universityId, nameEn, admin, event) => {
      console.log(`[RealtimeSync] New university registered: ${universityId}`)
      await blockchainSync.syncUniversity(Number(universityId))
    })
    eventListeners.set("UniversityRegistered", () => {
      try { contract.off("UniversityRegistered", universityListener) } catch {}
    })

    // Listen to DegreeIssued events
    // Core contract: (tokenId, universityId, recipient, requestId)
    const degreeIssuedListener = contract.on("DegreeIssued", async (...args: any[]) => {
      const tokenId = Number(args[0])
      console.log(`[RealtimeSync] New degree issued: ${tokenId}`)
      await blockchainSync.syncDegree(tokenId)
    })
    eventListeners.set("DegreeIssued", () => {
      try { contract.off("DegreeIssued", degreeIssuedListener) } catch {}
    })

    // Listen to DegreeRevoked events
    // Core contract: (tokenId, universityId, requestId, revoker)
    const degreeRevokedListener = contract.on("DegreeRevoked", async (...args: any[]) => {
      const tokenId = Number(args[0])
      console.log(`[RealtimeSync] Degree revoked: ${tokenId}`)
      await blockchainSync.syncDegree(tokenId)
    })
    eventListeners.set("DegreeRevoked", () => {
      try { contract.off("DegreeRevoked", degreeRevokedListener) } catch {}
    })

    // Listen to IssuerUpdated events (real-time issuer sync)
    // Event: IssuerUpdated(uint64 indexed universityId, address indexed issuer, bool status)
    const issuerUpdatedListener = contract.on("IssuerUpdated", async (...args: any[]) => {
      const universityId = Number(args[0])
      const issuerAddress = args[1]?.toLowerCase()
      const status = args[2]
      console.log(`[RealtimeSync] Issuer updated: ${issuerAddress} for university ${universityId}, status: ${status}`)
      
      // Sync issuers for this university (fetches all from events)
      await blockchainSync.syncIssuersForUniversity(universityId)
    })
    eventListeners.set("IssuerUpdated", () => {
      try { contract.off("IssuerUpdated", issuerUpdatedListener) } catch {}
    })

    // Listen to RevokerUpdated events (real-time revoker sync)
    // Event: RevokerUpdated(uint64 indexed universityId, address indexed revoker, bool status)
    const revokerUpdatedListener = contract.on("RevokerUpdated", async (...args: any[]) => {
      const universityId = Number(args[0])
      const revokerAddress = args[1]?.toLowerCase()
      const status = args[2]
      console.log(`[RealtimeSync] Revoker updated: ${revokerAddress} for university ${universityId}, status: ${status}`)
      
      // Sync revokers for this university (fetches all from events)
      await blockchainSync.syncRevokersForUniversity(universityId)
    })
    eventListeners.set("RevokerUpdated", () => {
      try { contract.off("RevokerUpdated", revokerUpdatedListener) } catch {}
    })

    // Listen to VerifierAdded events (real-time verifier sync)
    // Event: VerifierAdded(uint64 indexed universityId, address indexed verifier)
    const verifierAddedListener = contract.on("VerifierAdded", async (...args: any[]) => {
      const universityId = Number(args[0])
      const verifierAddress = args[1]?.toLowerCase()
      console.log(`[RealtimeSync] Verifier added: ${verifierAddress} for university ${universityId}`)
      
      // Sync verifiers for this university
      await blockchainSync.syncVerifiersForUniversity(universityId)
    })
    eventListeners.set("VerifierAdded", () => {
      try { contract.off("VerifierAdded", verifierAddedListener) } catch {}
    })

    // Listen to VerifierRemoved events (real-time verifier sync)
    // Event: VerifierRemoved(uint64 indexed universityId, address indexed verifier)
    const verifierRemovedListener = contract.on("VerifierRemoved", async (...args: any[]) => {
      const universityId = Number(args[0])
      const verifierAddress = args[1]?.toLowerCase()
      console.log(`[RealtimeSync] Verifier removed: ${verifierAddress} for university ${universityId}`)
      
      // Sync verifiers for this university
      await blockchainSync.syncVerifiersForUniversity(universityId)
    })
    eventListeners.set("VerifierRemoved", () => {
      try { contract.off("VerifierRemoved", verifierRemovedListener) } catch {}
    })

    // Core contract events (DegreeRequested, RevocationRequested, and approval events)
    // Listen to DegreeRequested events
    const requestListener = contract.on("DegreeRequested", async (requestId, universityId, recipient, requester, event) => {
      console.log(`[RealtimeSync] New degree request: ${requestId}`)
      await syncDegreeRequest(Number(requestId))
    })
    eventListeners.set("DegreeRequested", () => {
      try { contract.off("DegreeRequested", requestListener) } catch {}
    })

    // Listen to RevocationRequested events
    const revocationListener = contract.on("RevocationRequested", async (requestId, tokenId, universityId, requester, event) => {
      console.log(`[RealtimeSync] New revocation request: ${requestId}`)
      await syncRevocationRequest(Number(requestId))
    })
    eventListeners.set("RevocationRequested", () => {
      try { contract.off("RevocationRequested", revocationListener) } catch {}
    })

    // Listen to DegreeRequestApproved events (update approval count)
    const degreeApprovedListener = contract.on("DegreeRequestApproved", async (requestId, verifier, currentApprovals, required, event) => {
      console.log(`[RealtimeSync] Degree request ${requestId} approved by ${verifier} (${currentApprovals}/${required})`)
      await syncDegreeRequest(Number(requestId))
    })
    eventListeners.set("DegreeRequestApproved", () => {
      try { contract.off("DegreeRequestApproved", degreeApprovedListener) } catch {}
    })

    // Listen to RevocationApproved events (update approval count)
    const revocationApprovedListener = contract.on("RevocationApproved", async (requestId, verifier, currentApprovals, required, event) => {
      console.log(`[RealtimeSync] Revocation request ${requestId} approved by ${verifier} (${currentApprovals}/${required})`)
      await syncRevocationRequest(Number(requestId))
    })
    eventListeners.set("RevocationApproved", () => {
      try { contract.off("RevocationApproved", revocationApprovedListener) } catch {}
    })

    wsProvider = provider
    console.log("[RealtimeSync] Event listeners set up successfully using Base L2 mainnet RPC")
    return
  } catch (error: any) {
    // Log connection errors for debugging
    console.error("[RealtimeSync] Failed to set up event listeners:", error?.message || error)
    // Polling will be used instead - this is acceptable
  }
}

/**
 * Sync a degree request to database (uses Core via blockchain.getDegreeRequest; DB university_id = universities.id)
 */
export async function syncDegreeRequest(requestId: number) {
  try {
    const { getDegreeRequest, getRequiredApprovals } = await import("@/lib/blockchain")
    const request = await getDegreeRequest(requestId)
    if (!request || request.executed) return

    const sql = (await import("@/lib/db")).sql
    if (!sql) return

    const blockchainUniId = Number(request.universityId)
    const dbUni = await sql`SELECT id FROM universities WHERE blockchain_id = ${blockchainUniId} LIMIT 1`
    const dbUniversityId = dbUni.length > 0 ? dbUni[0].id : null
    if (dbUniversityId == null) return

    const required = await getRequiredApprovals(blockchainUniId)
    const status = request.rejected ? 'REJECTED' : request.executed ? 'ISSUED' : 'PENDING'

    await sql`
      INSERT INTO degree_requests (
        request_id, university_id, recipient_address, requester_address,
        student_name, student_name_ar, faculty_en, faculty_ar,
        major_en, major_ar, degree_name_en, degree_name_ar,
        gpa, year, approval_count, required_approvals, status, created_at, requested_at
      ) VALUES (
        ${requestId}, ${dbUniversityId}, ${request.recipient.toLowerCase()}, ${request.requester.toLowerCase()},
        ${request.nameEn || null}, ${request.nameAr || null},
        ${request.facultyEn || null}, ${request.facultyAr || null},
        ${request.majorEn || null}, ${request.majorAr || null},
        ${request.degreeNameEn || null}, ${request.degreeNameAr || null},
        ${Number(request.gpa)}, ${Number(request.year)},
        ${Number(request.approvalCount)}, ${required},
        ${status}, ${new Date(Number(request.createdAt) * 1000)}, ${new Date(Number(request.createdAt) * 1000)}
      )
      ON CONFLICT (request_id) DO UPDATE SET
        recipient_address = EXCLUDED.recipient_address,
        requester_address = EXCLUDED.requester_address,
        student_name = EXCLUDED.student_name,
        student_name_ar = EXCLUDED.student_name_ar,
        faculty_en = EXCLUDED.faculty_en,
        faculty_ar = EXCLUDED.faculty_ar,
        major_en = EXCLUDED.major_en,
        major_ar = EXCLUDED.major_ar,
        degree_name_en = EXCLUDED.degree_name_en,
        degree_name_ar = EXCLUDED.degree_name_ar,
        gpa = EXCLUDED.gpa,
        year = EXCLUDED.year,
        approval_count = EXCLUDED.approval_count,
        required_approvals = EXCLUDED.required_approvals,
        status = EXCLUDED.status,
        updated_at = NOW()
    `
  } catch (error) {
    console.error(`[RealtimeSync] Error syncing degree request ${requestId}:`, error)
  }
}

/**
 * Sync a revocation request to database (uses Core via blockchain.getRevocationRequest; DB university_id = universities.id)
 */
export async function syncRevocationRequest(requestId: number) {
  try {
    const { getRevocationRequest, getRequiredApprovals } = await import("@/lib/blockchain")
    const request = await getRevocationRequest(requestId)
    if (!request || request.executed) return

    const sql = (await import("@/lib/db")).sql
    if (!sql) return

    const blockchainUniId = Number(request.universityId)
    const dbUni = await sql`SELECT id FROM universities WHERE blockchain_id = ${blockchainUniId} LIMIT 1`
    const dbUniversityId = dbUni.length > 0 ? dbUni[0].id : null
    if (dbUniversityId == null) return

    const required = await getRequiredApprovals(blockchainUniId)
    const status = request.rejected ? 'REJECTED' : request.executed ? 'EXECUTED' : 'PENDING'

    await sql`
      INSERT INTO revocation_requests (
        request_id, token_id, university_id, requester_address,
        approval_count, required_approvals, status, created_at, requested_at
      ) VALUES (
        ${requestId}, ${String(request.tokenId)}, ${dbUniversityId}, ${request.requester.toLowerCase()},
        ${Number(request.approvalCount)}, ${required},
        ${status}, ${new Date(Number(request.createdAt) * 1000)}, ${new Date(Number(request.createdAt) * 1000)}
      )
      ON CONFLICT (request_id) DO UPDATE SET
        token_id = EXCLUDED.token_id,
        requester_address = EXCLUDED.requester_address,
        approval_count = EXCLUDED.approval_count,
        required_approvals = EXCLUDED.required_approvals,
        status = EXCLUDED.status,
        updated_at = NOW()
    `
  } catch (error) {
    console.error(`[RealtimeSync] Error syncing revocation request ${requestId}:`, error)
  }
}

/**
 * Get current blockchain block number
 */
async function getCurrentBlock(): Promise<number> {
  try {
    const provider = getReadOnlyProvider()
    const blockNumber = await provider.getBlockNumber()
    return blockNumber
  } catch {
    return 0
  }
}

/**
 * Get last synced block number from database
 */
async function getLastSyncedBlock(): Promise<number> {
  try {
    const sql = (await import("@/lib/db")).sql
    if (!sql) return 0

    const result = await sql`
      SELECT last_synced_block FROM sync_status LIMIT 1
    `
    return result.length > 0 ? Number(result[0].last_synced_block || 0) : 0
  } catch {
    return 0
  }
}

/**
 * Update last synced block number
 */
async function updateLastSyncedBlock(blockNumber: number) {
  try {
    const sql = (await import("@/lib/db")).sql
    if (!sql) return

    await sql`
      INSERT INTO sync_status (id, last_synced_block, updated_at)
      VALUES (1, ${blockNumber}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        last_synced_block = ${blockNumber},
        updated_at = NOW()
    `
  } catch (error) {
    // Table might not exist yet, that's okay
    console.warn("[RealtimeSync] Could not update last synced block:", error)
  }
}

// Helper to get read-only contract (re-export from blockchain.ts)
function getReadOnlyContract(): Contract {
  const { getReadOnlyContract } = require("@/lib/blockchain")
  return getReadOnlyContract()
}

function getReadOnlyProvider(): JsonRpcProvider {
  // Use centralized RPC provider (which uses blockchain.ts's getReadOnlyProvider)
  const { getReadOnlyProvider } = require("@/lib/blockchain")
  return getReadOnlyProvider()
}

// Import blockchain functions
async function getReadOnlyContractAsync(): Promise<Contract> {
  const { getReadOnlyContract } = await import("@/lib/blockchain")
  return getReadOnlyContract()
}

// Export singleton instance
export const realtimeSync = {
  start: startRealtimeSync,
  stop: stopRealtimeSync,
  performFullSync,
  isRunning: () => isRunning,
}
