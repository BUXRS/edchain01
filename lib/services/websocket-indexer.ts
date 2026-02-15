/**
 * WebSocket-First Blockchain Indexer
 * 
 * Authoritative ingestion service that:
 * - Subscribes to Core contract events via WebSocket (primary)
 * - Falls back to HTTP polling if WebSocket fails
 * - Implements reorg detection and rollback
 * - Stores events in chain_events table (idempotent)
 * - Applies projections to materialized tables
 * 
 * ✅ MANDATORY: Blockchain is source of truth - DB is always synced from blockchain
 */

import { JsonRpcProvider, Contract, EventLog, Block } from "ethers"
import { getActiveContractAddress, getCoreContractABI, CHAIN_ID, CORE_CONTRACT_ADDRESS } from "@/lib/contracts/abi"
import { sql } from "@/lib/db"
import { blockchainSync } from "./blockchain-sync"

// ✅ Upgradable RPC Configuration
import { getPrimaryRpcHttpUrl, getPrimaryRpcWsUrl } from "@/lib/config/rpc-config"

// Use centralized RPC configuration (upgradable via environment variables)
const BASE_RPC_URL = getPrimaryRpcHttpUrl()
const BASE_WS_URL = getPrimaryRpcWsUrl()

// Configuration
const CONFIRMATION_DEPTH = 10 // Blocks to wait before considering finalized
const POLLING_INTERVAL = 30000 // 30 seconds fallback polling
const RECONNECT_DELAY = 5000 // 5 seconds initial reconnect delay
const MAX_RECONNECT_DELAY = 60000 // 1 minute max reconnect delay

interface IndexerState {
  isRunning: boolean
  mode: "websocket" | "polling" | "manual"
  lastProcessedBlock: number
  finalizedBlock: number
  lastFinalizedBlockHash: string | null
  reconnectAttempts: number
  wsProvider: JsonRpcProvider | null
  pollingInterval: NodeJS.Timeout | null
  eventListeners: Map<string, () => void>
}

const state: IndexerState = {
  isRunning: false,
  mode: "websocket",
  lastProcessedBlock: 0,
  finalizedBlock: 0,
  lastFinalizedBlockHash: null,
  reconnectAttempts: 0,
  wsProvider: null,
  pollingInterval: null,
  eventListeners: new Map(),
}

/**
 * Start the WebSocket indexer
 */
export async function startWebSocketIndexer() {
  if (state.isRunning) {
    console.log("[WebSocketIndexer] Already running")
    return
  }

  console.log("[WebSocketIndexer] Starting WebSocket-first blockchain indexer...")
  state.isRunning = true

  try {
    // Load checkpoint state
    await loadCheckpointState()

    // CRITICAL: Perform initial full sync if database is empty
    await performInitialFullSyncIfNeeded()

    // Base RPC doesn't support WebSocket - use polling directly
    // Note: Base mainnet RPC (https://mainnet.base.org) only supports HTTP, not WebSocket
    console.log("[WebSocketIndexer] Base RPC doesn't support WebSocket, using polling mode")
    await startPollingListener()
    state.mode = "polling"

    // Start periodic reconciliation (backfill gaps)
    startPeriodicReconciliation()

    // Start periodic comprehensive sync (every 1 hour) to ensure all data is synced
    startPeriodicComprehensiveSync()

    console.log("[WebSocketIndexer] Indexer started successfully in", state.mode, "mode")
  } catch (error) {
    console.error("[WebSocketIndexer] Failed to start:", error)
    state.isRunning = false
  }
}

/**
 * Perform initial full sync if database appears empty
 */
async function performInitialFullSyncIfNeeded() {
  try {
    // ✅ CQRS FIX: Always check if comprehensive sync is needed
    // Don't just check if DB is empty - check if issuers/revokers/verifiers are missing
    const universitiesCount = await sql`
      SELECT COUNT(*) as count FROM universities WHERE blockchain_verified = true
    `.then(r => Number(r[0]?.count || 0))
    
    const issuersCount = await sql`
      SELECT COUNT(*) as count FROM issuers WHERE is_active = true AND blockchain_verified = true
    `.then(r => Number(r[0]?.count || 0))
    
    const revokersCount = await sql`
      SELECT COUNT(*) as count FROM revokers WHERE is_active = true AND blockchain_verified = true
    `.then(r => Number(r[0]?.count || 0))

    // ✅ ALWAYS run comprehensive sync on startup to ensure all data is synced
    // This ensures issuers/revokers/verifiers are always fetched, even if they exist
    const needsFullSync = true // Always sync on startup
    
    if (needsFullSync) {
      console.log("[WebSocketIndexer] Database appears empty, performing initial full sync...")
      
      // Import and trigger full sync
      const { fetchAllUniversities } = await import("@/lib/blockchain")
      const universities = await fetchAllUniversities()
      
      console.log(`[WebSocketIndexer] Found ${universities.length} universities, syncing...`)
      
      for (const uni of universities) {
        try {
          const uniId = Number(uni.id)
          console.log(`[WebSocketIndexer] Starting sync for university ${uniId}...`)
          
          const syncResult = await blockchainSync.syncUniversity(uniId)
          console.log(`[WebSocketIndexer] University ${uniId} sync result:`, {
            success: syncResult.success,
            added: syncResult.added,
            updated: syncResult.updated,
            errors: syncResult.errors
          })
          
          // Verify the university was actually saved to DB
          if (syncResult.success) {
            const verifyCount = await sql`
              SELECT COUNT(*) as count FROM universities WHERE blockchain_id = ${uniId} AND blockchain_verified = true
            `.then(r => Number(r[0]?.count || 0))
            console.log(`[WebSocketIndexer] Verification: ${verifyCount} universities with blockchain_id=${uniId} in DB`)
            
            if (verifyCount === 0 && syncResult.added > 0) {
              console.error(`[WebSocketIndexer] ⚠️ WARNING: Sync reported added=1 but university not found in DB!`)
            }
          }
          
          if (syncResult.success) {
            await blockchainSync.syncIssuersForUniversity(uniId).catch(err => console.warn(`[WebSocketIndexer] Issuers sync failed for ${uniId}:`, err))
            await blockchainSync.syncRevokersForUniversity(uniId).catch(err => console.warn(`[WebSocketIndexer] Revokers sync failed for ${uniId}:`, err))
            await blockchainSync.syncVerifiersForUniversity(uniId).catch(err => console.warn(`[WebSocketIndexer] Verifiers sync failed for ${uniId}:`, err))
            await blockchainSync.syncDegreesForUniversity(uniId).catch(err => console.warn(`[WebSocketIndexer] Degrees sync failed for ${uniId}:`, err))
            console.log(`[WebSocketIndexer] ✅ Successfully synced university ${uniId}`)
          } else {
            console.error(`[WebSocketIndexer] ❌ Failed to sync university ${uniId}:`, syncResult.errors)
          }
        } catch (err) {
          console.error(`[WebSocketIndexer] ❌ Error syncing university ${uni.id}:`, err)
          if (err instanceof Error) {
            console.error(`[WebSocketIndexer] Error stack:`, err.stack)
          }
        }
      }
      
      // ✅ CQRS: Backfill historical events for issuers/revokers
      console.log("[WebSocketIndexer] Backfilling historical IssuerUpdated and RevokerUpdated events...")
      await backfillHistoricalIssuersAndRevokers()
      
      // Update checkpoint
      const provider = await import("@/lib/blockchain").then(m => m.getReadOnlyProvider())
      const currentBlock = await provider.getBlockNumber()
      state.lastProcessedBlock = currentBlock
      await updateCheckpointState()
      
      console.log("[WebSocketIndexer] ✅ Initial full sync completed")
    }
    
    // ✅ ALWAYS run comprehensive sync for ALL universities, regardless of DB state
    // This ensures issuers/revokers/verifiers are ALWAYS synced on startup
    console.log(`[WebSocketIndexer] Running comprehensive sync for ALL universities (ensuring issuers/revokers/verifiers are synced)...`)
    
    try {
      const { fetchAllUniversities } = await import("@/lib/blockchain")
      const universities = await fetchAllUniversities()
      
      console.log(`[WebSocketIndexer] Found ${universities.length} universities on-chain, syncing ALL entities for each...`)
      
      for (const uni of universities) {
        try {
          const uniId = Number(uni.id)
          console.log(`[WebSocketIndexer] Comprehensive sync for university ${uniId}...`)
          
          // Sync university (in case it was updated)
          await blockchainSync.syncUniversity(uniId).catch(err => 
            console.warn(`[WebSocketIndexer] University sync failed for ${uniId}:`, err)
          )
          
          // ✅ ALWAYS sync issuers, revokers, verifiers, and degrees
          console.log(`[WebSocketIndexer] Syncing issuers for university ${uniId}...`)
          const issuersResult = await blockchainSync.syncIssuersForUniversity(uniId).catch(err => {
            console.error(`[WebSocketIndexer] ❌ Issuers sync failed for ${uniId}:`, err)
            return { added: 0, updated: 0, removed: 0, errors: [err instanceof Error ? err.message : 'Unknown error'] }
          })
          console.log(`[WebSocketIndexer] ✅ Issuers sync for ${uniId}: added=${issuersResult.added}, updated=${issuersResult.updated}, removed=${issuersResult.removed}`)
          
          console.log(`[WebSocketIndexer] Syncing revokers for university ${uniId}...`)
          const revokersResult = await blockchainSync.syncRevokersForUniversity(uniId).catch(err => {
            console.error(`[WebSocketIndexer] ❌ Revokers sync failed for ${uniId}:`, err)
            return { added: 0, updated: 0, removed: 0, errors: [err instanceof Error ? err.message : 'Unknown error'] }
          })
          console.log(`[WebSocketIndexer] ✅ Revokers sync for ${uniId}: added=${revokersResult.added}, updated=${revokersResult.updated}, removed=${revokersResult.removed}`)
          
          console.log(`[WebSocketIndexer] Syncing verifiers for university ${uniId}...`)
          const verifiersResult = await blockchainSync.syncVerifiersForUniversity(uniId).catch(err => {
            console.error(`[WebSocketIndexer] ❌ Verifiers sync failed for ${uniId}:`, err)
            return { added: 0, updated: 0, removed: 0, errors: [err instanceof Error ? err.message : 'Unknown error'] }
          })
          console.log(`[WebSocketIndexer] ✅ Verifiers sync for ${uniId}: added=${verifiersResult.added}, updated=${verifiersResult.updated}, removed=${verifiersResult.removed}`)
          
          console.log(`[WebSocketIndexer] Syncing degrees for university ${uniId}...`)
          const degreesResult = await blockchainSync.syncDegreesForUniversity(uniId).catch(err => {
            console.error(`[WebSocketIndexer] ❌ Degrees sync failed for ${uniId}:`, err)
            return { added: 0, updated: 0, removed: 0, errors: [err instanceof Error ? err.message : 'Unknown error'] }
          })
          console.log(`[WebSocketIndexer] ✅ Degrees sync for ${uniId}: added=${degreesResult.added}, updated=${degreesResult.updated}, removed=${degreesResult.removed}`)
          
          console.log(`[WebSocketIndexer] ✅ Completed comprehensive sync for university ${uniId}`)
        } catch (err) {
          console.error(`[WebSocketIndexer] ❌ Error in comprehensive sync for university ${uni.id}:`, err)
        }
      }
      
      // ✅ CQRS: Backfill historical events for issuers/revokers
      console.log("[WebSocketIndexer] Backfilling historical IssuerUpdated and RevokerUpdated events...")
      await backfillHistoricalIssuersAndRevokers()
      
      // Sync all requests from chain_events
      console.log("[WebSocketIndexer] Syncing all requests from chain_events...")
      await syncAllRequestsFromEvents().catch(err => 
        console.warn("[WebSocketIndexer] Requests sync failed:", err)
      )
      
      console.log("[WebSocketIndexer] ✅ Comprehensive sync completed for all universities")
    } catch (error) {
      console.error("[WebSocketIndexer] ❌ Error in comprehensive sync:", error)
      // Don't fail startup if sync fails - will retry later
    }
  } catch (error) {
    console.error("[WebSocketIndexer] Error during initial sync check:", error)
    // Don't fail startup if initial sync fails - will retry later
  }
}

/**
 * Stop the indexer
 */
export async function stopWebSocketIndexer() {
  if (!state.isRunning) return

  console.log("[WebSocketIndexer] Stopping indexer...")
  state.isRunning = false

  // Stop polling
  if (state.pollingInterval) {
    clearInterval(state.pollingInterval)
    state.pollingInterval = null
  }

  // Remove event listeners
  state.eventListeners.forEach((cleanup) => cleanup())
  state.eventListeners.clear()

  // Destroy provider
  if (state.wsProvider) {
    await state.wsProvider.destroy()
    state.wsProvider = null
  }

  console.log("[WebSocketIndexer] Stopped")
}

/**
 * Start WebSocket event listener
 */
async function startWebSocketListener() {
  try {
    // Use centralized RPC provider for WebSocket
    const { getRpcWsProvider } = await import("@/lib/config/rpc-provider")
    const provider = getRpcWsProvider()

    // Test connection
    await Promise.race([
      provider.getNetwork(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5000))
    ])

    state.wsProvider = provider
    const contractAddress = getActiveContractAddress()
    const abi = getCoreContractABI()
    const contract = new Contract(contractAddress, abi, provider)

    // Set up event listeners for all Core contract events
    await setupEventListeners(contract)

    // Set up reconnection handler
    provider.on("error", handleProviderError)
    
    console.log("[WebSocketIndexer] WebSocket listener connected")
  } catch (error) {
    throw new Error(`WebSocket connection failed: ${error}`)
  }
}

/**
 * Start HTTP polling listener (fallback)
 */
async function startPollingListener() {
  console.log("[WebSocketIndexer] Starting polling listener...")
  
  // Use centralized RPC provider for smart failover
  const { getRpcHttpProvider } = await import("@/lib/config/rpc-provider")
  const provider = getRpcHttpProvider()

  state.wsProvider = provider

  // Poll for new events
  state.pollingInterval = setInterval(async () => {
    if (!state.isRunning) return
    
    try {
      await pollForNewEvents(provider)
    } catch (error) {
      console.error("[WebSocketIndexer] Polling error:", error)
    }
  }, POLLING_INTERVAL)

  // Initial poll
  await pollForNewEvents(provider)
}

/**
 * Poll for new events from last processed block
 * ✅ CQRS Pattern: Expands polling window for initial sync to catch historical events
 */
async function pollForNewEvents(provider: JsonRpcProvider) {
  const currentBlock = await provider.getBlockNumber()
  
  // ✅ FIX: Expand polling window for initial sync (catch historical events)
  // If we haven't synced much, look back further to catch all historical events
  const blocksSinceLastSync = currentBlock - state.lastProcessedBlock
  const lookbackBlocks = blocksSinceLastSync > 10000 ? 10000 : Math.max(blocksSinceLastSync, 100)
  
  const fromBlock = Math.max(state.lastProcessedBlock + 1, currentBlock - lookbackBlocks)

  if (fromBlock > currentBlock) return

  const contractAddress = getActiveContractAddress()
  const abi = getCoreContractABI()
  const contract = new Contract(contractAddress, abi, provider)

  // Get all events from Core contract
  const events = await contract.queryFilter("*", fromBlock, currentBlock)

  for (const event of events) {
    await processEvent(event as EventLog, provider)
  }

  // Update checkpoint
  if (currentBlock > state.lastProcessedBlock) {
    state.lastProcessedBlock = currentBlock
    await updateCheckpointState()
  }
}

/**
 * Set up event listeners for Core contract
 */
async function setupEventListeners(contract: Contract) {
  const contractAddress = getActiveContractAddress()

  // UniversityRegistered
  const universityListener = contract.on("UniversityRegistered", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("UniversityRegistered", () => contract.off("UniversityRegistered", universityListener))

  // DegreeIssued
  const degreeIssuedListener = contract.on("DegreeIssued", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("DegreeIssued", () => contract.off("DegreeIssued", degreeIssuedListener))

  // DegreeRevoked
  const degreeRevokedListener = contract.on("DegreeRevoked", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("DegreeRevoked", () => contract.off("DegreeRevoked", degreeRevokedListener))

  // IssuerUpdated
  const issuerUpdatedListener = contract.on("IssuerUpdated", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("IssuerUpdated", () => contract.off("IssuerUpdated", issuerUpdatedListener))

  // RevokerUpdated
  const revokerUpdatedListener = contract.on("RevokerUpdated", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("RevokerUpdated", () => contract.off("RevokerUpdated", revokerUpdatedListener))

  // VerifierAdded
  const verifierAddedListener = contract.on("VerifierAdded", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("VerifierAdded", () => contract.off("VerifierAdded", verifierAddedListener))

  // VerifierRemoved
  const verifierRemovedListener = contract.on("VerifierRemoved", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("VerifierRemoved", () => contract.off("VerifierRemoved", verifierRemovedListener))

  // DegreeRequested
  const degreeRequestedListener = contract.on("DegreeRequested", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("DegreeRequested", () => contract.off("DegreeRequested", degreeRequestedListener))

  // RevocationRequested
  const revocationRequestedListener = contract.on("RevocationRequested", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("RevocationRequested", () => contract.off("RevocationRequested", revocationRequestedListener))

  // DegreeRequestApproved
  const degreeApprovedListener = contract.on("DegreeRequestApproved", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("DegreeRequestApproved", () => contract.off("DegreeRequestApproved", degreeApprovedListener))

  // RevocationApproved
  const revocationApprovedListener = contract.on("RevocationApproved", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog
    await processEvent(event, contract.provider as JsonRpcProvider)
  })
  state.eventListeners.set("RevocationApproved", () => contract.off("RevocationApproved", revocationApprovedListener))
}

/**
 * Process a blockchain event (idempotent)
 */
async function processEvent(event: EventLog, provider: JsonRpcProvider) {
  try {
    // Validate chain ID
    const network = await provider.getNetwork()
    if (Number(network.chainId) !== CHAIN_ID) {
      console.warn(`[WebSocketIndexer] Wrong chain ID: ${network.chainId}, expected ${CHAIN_ID}`)
      return
    }

    const txHash = event.transactionHash
    const logIndex = event.index
    const blockNumber = event.blockNumber
    const eventName = event.eventName || "Unknown"

    // Get block hash for reorg detection
    const block = await provider.getBlock(blockNumber)
    if (!block) {
      console.warn(`[WebSocketIndexer] Block ${blockNumber} not found`)
      return
    }

    // Store event in chain_events table (idempotent)
    try {
      await sql`
        INSERT INTO chain_events (
          chain_id, tx_hash, log_index, event_name, contract_address,
          block_number, block_hash, event_data, is_finalized, confirmation_depth
        ) VALUES (
          ${CHAIN_ID}, ${txHash}, ${logIndex}, ${eventName}, ${event.address.toLowerCase()},
          ${blockNumber}, ${block.hash}, ${JSON.stringify(event.args || {})}::jsonb,
          false, 0
        )
        ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING
      `
    } catch (dbError: any) {
      // If table doesn't exist yet, log warning but continue
      if (dbError?.code === "42P01") {
        console.warn("[WebSocketIndexer] chain_events table not found. Run migration script first.")
        return
      }
      throw dbError
    }

    // Check for reorgs
    await checkForReorgs(blockNumber, block.hash, provider)

    // Process finalized events (apply projections)
    await processFinalizedEvents()

    // Apply projection for this event (if deep enough)
    const currentBlock = await provider.getBlockNumber()
    const confirmations = currentBlock - blockNumber

    if (confirmations >= CONFIRMATION_DEPTH) {
      await applyProjection(eventName, event, blockNumber, block.hash)
    }

    console.log(`[WebSocketIndexer] Processed event: ${eventName} at block ${blockNumber}`)
  } catch (error) {
    console.error(`[WebSocketIndexer] Error processing event:`, error)
  }
}

/**
 * Check for blockchain reorganizations
 */
async function checkForReorgs(blockNumber: number, blockHash: string, provider: JsonRpcProvider) {
  try {
    // Check if we've seen this block before with a different hash
    const existing = await sql`
      SELECT block_hash FROM chain_events
      WHERE block_number = ${blockNumber} AND chain_id = ${CHAIN_ID}
      LIMIT 1
    `

    if (existing.length > 0 && existing[0].block_hash !== blockHash) {
      console.warn(`[WebSocketIndexer] ⚠️ REORG DETECTED at block ${blockNumber}!`)
      console.warn(`  Expected: ${existing[0].block_hash}`)
      console.warn(`  Got: ${blockHash}`)

      // Mark reorg in sync_status
      await sql`
        UPDATE sync_status
        SET reorg_detected = true, last_reorg_at = NOW()
        WHERE id = 1
      `

      // Rollback affected events
      await rollbackReorgAffectedEvents(blockNumber, blockHash)
    }
  } catch (error) {
    console.error("[WebSocketIndexer] Error checking for reorgs:", error)
  }
}

/**
 * Rollback events affected by reorg
 */
async function rollbackReorgAffectedEvents(affectedBlock: number, newBlockHash: string) {
  try {
    // Delete events from affected block onwards that don't match new chain
    await sql`
      DELETE FROM chain_events
      WHERE block_number >= ${affectedBlock}
        AND chain_id = ${CHAIN_ID}
        AND block_hash != ${newBlockHash}
    `

    // Mark projections as needing re-application
    await sql`
      UPDATE chain_events
      SET projection_applied = false, processed = false
      WHERE block_number >= ${affectedBlock} AND chain_id = ${CHAIN_ID}
    `

    console.log(`[WebSocketIndexer] Rolled back events from block ${affectedBlock}`)
  } catch (error) {
    console.error("[WebSocketIndexer] Error rolling back reorg:", error)
  }
}

/**
 * Process finalized events (apply projections)
 */
async function processFinalizedEvents() {
  try {
    const currentBlock = await sql`SELECT last_synced_block FROM sync_status WHERE id = 1`.then(r => r[0]?.last_synced_block || 0)
    const finalizedBlock = currentBlock - CONFIRMATION_DEPTH

    // Get unprocessed finalized events
    const events = await sql`
      SELECT * FROM chain_events
      WHERE block_number <= ${finalizedBlock}
        AND is_finalized = false
        AND chain_id = ${CHAIN_ID}
      ORDER BY block_number ASC, log_index ASC
    `

    for (const event of events) {
      await applyProjection(event.event_name, event, event.block_number, event.block_hash)
      
      // Mark as finalized and processed
      await sql`
        UPDATE chain_events
        SET is_finalized = true, finalized_at = NOW(),
            processed = true, processed_at = NOW(),
            confirmation_depth = ${CONFIRMATION_DEPTH}
        WHERE id = ${event.id}
      `
    }

    // Update finalized block
    if (finalizedBlock > state.finalizedBlock) {
      state.finalizedBlock = finalizedBlock
      await sql`
        UPDATE sync_status
        SET finalized_block = ${finalizedBlock}
        WHERE id = 1
      `
    }
  } catch (error) {
    console.error("[WebSocketIndexer] Error processing finalized events:", error)
  }
}

/**
 * Apply projection to materialized tables
 */
async function applyProjection(eventName: string, event: any, blockNumber: number, blockHash: string) {
  try {
    const eventData = typeof event.event_data === 'string' ? JSON.parse(event.event_data) : (event.event_data || event.args || {})

    switch (eventName) {
      case "UniversityRegistered": {
        const universityId = Number(eventData.universityId || eventData[0])
        await blockchainSync.syncUniversity(universityId)
        break
      }
      case "DegreeIssued": {
        const tokenId = Number(eventData.tokenId || eventData[0])
        await blockchainSync.syncDegree(tokenId)
        break
      }
      case "DegreeRevoked": {
        const tokenId = Number(eventData.tokenId || eventData[0])
        await blockchainSync.syncDegree(tokenId)
        break
      }
      case "IssuerUpdated": {
        const universityId = Number(eventData.universityId || eventData[0])
        await blockchainSync.syncIssuersForUniversity(universityId)
        break
      }
      case "RevokerUpdated": {
        const universityId = Number(eventData.universityId || eventData[0])
        await blockchainSync.syncRevokersForUniversity(universityId)
        break
      }
      case "VerifierAdded":
      case "VerifierRemoved": {
        const universityId = Number(eventData.universityId || eventData[0])
        await blockchainSync.syncVerifiersForUniversity(universityId)
        break
      }
      case "DegreeRequested": {
        const requestId = Number(eventData.requestId || eventData[0])
        // Sync via realtime-sync helper
        const { syncDegreeRequest } = await import("./realtime-sync")
        await syncDegreeRequest(requestId)
        break
      }
      case "RevocationRequested": {
        const requestId = Number(eventData.requestId || eventData[0])
        const { syncRevocationRequest } = await import("./realtime-sync")
        await syncRevocationRequest(requestId)
        break
      }
      case "DegreeRequestApproved":
      case "RevocationApproved": {
        // Re-sync the request to update approval count
        const requestId = Number(eventData.requestId || eventData[0])
        if (eventName === "DegreeRequestApproved") {
          const { syncDegreeRequest } = await import("./realtime-sync")
          await syncDegreeRequest(requestId)
        } else {
          const { syncRevocationRequest } = await import("./realtime-sync")
          await syncRevocationRequest(requestId)
        }
        break
      }
    }

    // Mark projection as applied
    if (event.id) {
      await sql`
        UPDATE chain_events
        SET projection_applied = true
        WHERE id = ${event.id}
      `
    }
  } catch (error) {
    console.error(`[WebSocketIndexer] Error applying projection for ${eventName}:`, error)
  }
}

/**
 * Start periodic reconciliation (backfill gaps)
 */
function startPeriodicReconciliation() {
  setInterval(async () => {
    if (!state.isRunning) return
    
    try {
      await reconcileGaps()
    } catch (error) {
      console.error("[WebSocketIndexer] Reconciliation error:", error)
    }
  }, 5 * 60 * 1000) // Every 5 minutes
}

/**
 * Reconcile gaps in event processing
 */
async function reconcileGaps() {
  try {
    const currentBlock = state.wsProvider ? await state.wsProvider.getBlockNumber() : 0
    const lastProcessed = state.lastProcessedBlock

    if (currentBlock > lastProcessed + 10) {
      console.log(`[WebSocketIndexer] Gap detected: ${lastProcessed} -> ${currentBlock}, backfilling...`)
      await pollForNewEvents(state.wsProvider!)
    }
  } catch (error) {
    console.error("[WebSocketIndexer] Error reconciling gaps:", error)
  }
}

/**
 * Handle provider errors (reconnect logic)
 */
async function handleProviderError(error: Error) {
  console.error("[WebSocketIndexer] Provider error:", error)
  
  if (state.mode === "websocket") {
    // Try to reconnect with exponential backoff
    const delay = Math.min(RECONNECT_DELAY * Math.pow(2, state.reconnectAttempts), MAX_RECONNECT_DELAY)
    state.reconnectAttempts++

    console.log(`[WebSocketIndexer] Reconnecting in ${delay}ms (attempt ${state.reconnectAttempts})...`)
    
    setTimeout(async () => {
      try {
        await startWebSocketListener()
        state.reconnectAttempts = 0
        state.mode = "websocket"
      } catch {
        // Fallback to polling
        await startPollingListener()
        state.mode = "polling"
      }
    }, delay)
  }
}

/**
 * Load checkpoint state from database
 */
async function loadCheckpointState() {
  try {
    const result = await sql`
      SELECT last_synced_block, finalized_block, last_finalized_block_hash, sync_mode
      FROM sync_status WHERE id = 1
    `

    if (result.length > 0) {
      state.lastProcessedBlock = Number(result[0].last_synced_block || 0)
      state.finalizedBlock = Number(result[0].finalized_block || 0)
      state.lastFinalizedBlockHash = result[0].last_finalized_block_hash
      state.mode = (result[0].sync_mode || "websocket") as "websocket" | "polling" | "manual"
    }
  } catch (error) {
    console.warn("[WebSocketIndexer] Could not load checkpoint state:", error)
  }
}

/**
 * Update checkpoint state in database
 */
async function updateCheckpointState() {
  try {
    await sql`
      UPDATE sync_status
      SET last_synced_block = ${state.lastProcessedBlock},
          finalized_block = ${state.finalizedBlock},
          last_finalized_block_hash = ${state.lastFinalizedBlockHash},
          sync_mode = ${state.mode},
          updated_at = NOW()
      WHERE id = 1
    `
  } catch (error) {
    console.warn("[WebSocketIndexer] Could not update checkpoint state:", error)
  }
}

/**
 * Sync all requests from chain_events table
 * This backfills degree_requests and revocation_requests from historical events
 */
export async function syncAllRequestsFromEvents(): Promise<{
  degreeRequests: number
  revocationRequests: number
  errors: string[]
}> {
  const result = {
    degreeRequests: 0,
    revocationRequests: 0,
    errors: [] as string[]
  }

  try {
    // Get all DegreeRequested events
    const degreeRequestEvents = await sql`
      SELECT event_data, block_number, tx_hash
      FROM chain_events
      WHERE event_name = 'DegreeRequested'
        AND chain_id = ${CHAIN_ID}
      ORDER BY block_number ASC
    `

    for (const event of degreeRequestEvents) {
      try {
        const eventData = typeof event.event_data === 'string' ? JSON.parse(event.event_data) : (event.event_data || {})
        const requestId = Number(eventData.requestId || eventData[0])
        if (requestId) {
          const { syncDegreeRequest } = await import("./realtime-sync")
          await syncDegreeRequest(requestId)
          result.degreeRequests++
        }
      } catch (err) {
        result.errors.push(`DegreeRequest ${event.tx_hash}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    // Get all RevocationRequested events
    const revocationRequestEvents = await sql`
      SELECT event_data, block_number, tx_hash
      FROM chain_events
      WHERE event_name = 'RevocationRequested'
        AND chain_id = ${CHAIN_ID}
      ORDER BY block_number ASC
    `

    for (const event of revocationRequestEvents) {
      try {
        const eventData = typeof event.event_data === 'string' ? JSON.parse(event.event_data) : (event.event_data || {})
        const requestId = Number(eventData.requestId || eventData[0])
        if (requestId) {
          const { syncRevocationRequest } = await import("./realtime-sync")
          await syncRevocationRequest(requestId)
          result.revocationRequests++
        }
      } catch (err) {
        result.errors.push(`RevocationRequest ${event.tx_hash}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    console.log(`[WebSocketIndexer] Synced ${result.degreeRequests} degree requests and ${result.revocationRequests} revocation requests from events`)
  } catch (error) {
    console.error("[WebSocketIndexer] Error syncing requests from events:", error)
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

/**
 * Start periodic comprehensive sync (every 15 minutes)
 * This ensures all data stays in sync even if events were missed
 * ✅ Reduced from 1 hour to 15 minutes for more frequent syncing
 */
function startPeriodicComprehensiveSync() {
  // Run immediately on startup (after initial sync completes)
  setTimeout(async () => {
    if (!state.isRunning) return
    
    try {
      console.log("[WebSocketIndexer] Running first periodic comprehensive sync...")
      await blockchainSync.performComprehensiveFullSync()
      console.log("[WebSocketIndexer] First periodic comprehensive sync completed")
    } catch (error) {
      console.error("[WebSocketIndexer] First periodic comprehensive sync error:", error)
    }
  }, 60000) // 1 minute after startup
  
  // Then run every 15 minutes
  setInterval(async () => {
    if (!state.isRunning) return
    
    try {
      console.log("[WebSocketIndexer] Starting periodic comprehensive sync...")
      await blockchainSync.performComprehensiveFullSync()
      console.log("[WebSocketIndexer] Periodic comprehensive sync completed")
    } catch (error) {
      console.error("[WebSocketIndexer] Periodic comprehensive sync error:", error)
    }
  }, 15 * 60 * 1000) // Every 15 minutes
}

/**
 * Get indexer status
 */
/**
 * ✅ CQRS: Backfill historical IssuerUpdated and RevokerUpdated events
 * This ensures all historical issuers/revokers are fetched and inserted into DB
 */
async function backfillHistoricalIssuersAndRevokers() {
  try {
    console.log("[WebSocketIndexer] Starting historical backfill for issuers and revokers...")
    
    const { fetchAllUniversities } = await import("@/lib/blockchain")
    const universities = await fetchAllUniversities()
    
    console.log(`[WebSocketIndexer] Found ${universities.length} universities, backfilling issuers/revokers...`)
    
    // Fetch all historical events for all universities
    const { fetchAllIssuersAndRevokersFromEvents } = await import("@/lib/blockchain-fetch-issuers-revokers")
    const allData = await fetchAllIssuersAndRevokersFromEvents()
    
    // Sync each university's issuers and revokers
    for (const uni of universities) {
      const uniId = Number(uni.id)
      const uniData = allData[uniId]
      
      if (uniData) {
        console.log(`[WebSocketIndexer] Backfilling university ${uniId}: ${uniData.issuers.length} issuers, ${uniData.revokers.length} revokers`)
        
        // Sync issuers
        if (uniData.issuers.length > 0) {
          await blockchainSync.syncIssuersForUniversity(uniId).catch(err => 
            console.warn(`[WebSocketIndexer] Issuers backfill failed for ${uniId}:`, err)
          )
        }
        
        // Sync revokers
        if (uniData.revokers.length > 0) {
          await blockchainSync.syncRevokersForUniversity(uniId).catch(err => 
            console.warn(`[WebSocketIndexer] Revokers backfill failed for ${uniId}:`, err)
          )
        }
      } else {
        // No events found, but still try to sync (might be using direct contract calls)
        await blockchainSync.syncIssuersForUniversity(uniId).catch(() => {})
        await blockchainSync.syncRevokersForUniversity(uniId).catch(() => {})
      }
    }
    
    console.log("[WebSocketIndexer] ✅ Historical backfill completed")
  } catch (error) {
    console.error("[WebSocketIndexer] Error in historical backfill:", error)
  }
}

export function getIndexerStatus() {
  // Check if indexer is actually running by verifying polling interval exists
  // This handles cases where hot module reload resets state.isRunning but indexer is still active
  const actuallyRunning = state.isRunning || state.pollingInterval !== null
  
  return {
    isRunning: actuallyRunning,
    mode: state.mode,
    lastProcessedBlock: state.lastProcessedBlock,
    finalizedBlock: state.finalizedBlock,
    lastFinalizedBlockHash: state.lastFinalizedBlockHash,
    // Additional diagnostic info
    hasPollingInterval: state.pollingInterval !== null,
    stateIsRunning: state.isRunning, // Original state value for debugging
  }
}

// Export singleton
export const websocketIndexer = {
  start: startWebSocketIndexer,
  stop: stopWebSocketIndexer,
  getStatus: getIndexerStatus,
}
