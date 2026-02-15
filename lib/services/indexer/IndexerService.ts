/**
 * Indexer Service - WebSocket-First Event Ingestion
 * 
 * Primary responsibility: Ingest blockchain events into chain_events table (event store)
 * 
 * Architecture:
 * - Primary: WebSocket subscription via eth_subscribe (real-time)
 * - Fallback: HTTP polling via eth_getLogs (reconciliation)
 * - Idempotent: Uses (chain_id, tx_hash, log_index) as unique key
 * - Non-blocking: Ingestion is separate from projection
 */

import { JsonRpcProvider, Contract, EventLog } from "ethers"
import { getActiveContractAddress, getCoreContractABI, CHAIN_ID } from "@/lib/contracts/abi"
import { sql } from "@/lib/db"
import { eventProjector } from "./EventProjector"

// ✅ Upgradable RPC Configuration
import { getRpcHttpUrl, getRpcWsUrl } from "@/lib/config/rpc-provider"
import { getPrimaryRpcHttpUrl, getPrimaryRpcWsUrl } from "@/lib/config/rpc-config"
import { getRpcRequestDelay, getPollingInterval, getIndexerBatchDelayMs } from "@/lib/config/sync-config"

// Use centralized RPC configuration (upgradable via environment variables)
const BASE_RPC_HTTP_URL = getPrimaryRpcHttpUrl()
const BASE_RPC_WS_URL = getPrimaryRpcWsUrl()
const CONFIRMATION_DEPTH = parseInt(process.env.CONFIRMATION_DEPTH || "10", 10)
// ✅ Tier-aware: Free=60s/1000ms, Paid=15s/100ms (set RPC_PAID_TIER=true for Infura paid)
const POLLING_INTERVAL = getPollingInterval()
const RPC_REQUEST_DELAY = getRpcRequestDelay()
const INDEXER_BATCH_DELAY = getIndexerBatchDelayMs()

interface IndexerState {
  isRunning: boolean
  mode: "websocket" | "polling" | "manual"
  wsProvider: JsonRpcProvider | null
  wsSubscriptionId: string | null
  pollingInterval: NodeJS.Timeout | null
  lastProcessedBlock: number
  finalizedBlock: number
  reconnectAttempts: number
  lastError: string | null
  lastErrorAt: Date | null
}

const state: IndexerState = {
  isRunning: false,
  mode: "polling", // Default to polling (Base RPC may not support WS)
  wsProvider: null,
  wsSubscriptionId: null,
  pollingInterval: null,
  lastProcessedBlock: 0,
  finalizedBlock: 0,
  reconnectAttempts: 0,
  lastError: null,
  lastErrorAt: null,
}

export class IndexerService {
  /**
   * Start the indexer (WebSocket-first, fallback to polling)
   */
  async start(): Promise<void> {
    if (state.isRunning) {
      console.log("[IndexerService] Already running")
      return
    }

    console.log("[IndexerService] Starting blockchain indexer...")
    state.isRunning = true

    try {
      // Load checkpoint
      await this.loadCheckpoint()

      // ✅ Perform initial comprehensive sync if needed
      await this.performInitialSyncIfNeeded()

      // Try WebSocket first (only if WS URL is configured and supported)
      // Base mainnet RPC typically doesn't support WebSocket, so we'll likely fall back to polling
      if (BASE_RPC_WS_URL && BASE_RPC_WS_URL.startsWith("wss://")) {
        try {
          await this.startWebSocketListener()
          state.mode = "websocket"
          console.log("[IndexerService] ✅ WebSocket listener started")
        } catch (wsError: any) {
          // ✅ EXPECTED BEHAVIOR: Base mainnet RPC doesn't support WebSocket - this is normal
          const errorMessage = wsError?.message || String(wsError) || ""
          const isUnsupportedProtocol = 
            wsError?.code === "UNSUPPORTED_OPERATION" || 
            errorMessage.toLowerCase().includes("unsupported protocol") ||
            errorMessage.toLowerCase().includes("protocol not supported") ||
            errorMessage.toLowerCase().includes("protocol nott supported") // Handle typo in provider error
          
          if (isUnsupportedProtocol) {
            console.log("[IndexerService] ℹ️ WebSocket not supported by provider (expected for Base RPC), using polling mode")
          } else {
            console.log("[IndexerService] ℹ️ WebSocket unavailable, using polling mode (this is normal for Base mainnet):", errorMessage)
          }
          await this.startPollingListener()
          state.mode = "polling"
        }
      } else {
        // No WebSocket URL configured, use polling directly
        console.log("[IndexerService] No WebSocket URL configured, using polling mode")
        await this.startPollingListener()
        state.mode = "polling"
      }

      // Start projection processor (runs independently)
      this.startProjectionProcessor()

      // Start finalization processor
      this.startFinalizationProcessor()

      // Start periodic comprehensive sync (every 1 hour) to ensure all data stays in sync
      this.startPeriodicComprehensiveSync()

      console.log("[IndexerService] ✅ Indexer started in", state.mode, "mode")
      // Clear any previous errors on successful start
      state.lastError = null
      state.lastErrorAt = null
    } catch (error: any) {
      console.error("[IndexerService] ❌ Failed to start:", error)
      state.isRunning = false
      state.lastError = error?.message || String(error) || "Unknown error"
      state.lastErrorAt = new Date()
      // Don't throw - allow graceful degradation
      // The indexer can be restarted manually via API
      console.error("[IndexerService] Indexer failed to start. Use /api/admin/indexer/start to restart.")
      console.error("[IndexerService] Error details:", state.lastError)
    }
  }

  /**
   * Perform initial comprehensive sync - Runs in background to not block server startup
   * This ensures the database is fully populated with all blockchain data
   */
  private async performInitialSyncIfNeeded(): Promise<void> {
    // ✅ Run sync in background to not block server startup
    // This allows Next.js to compile and serve pages while sync runs
    console.log("[IndexerService] 🔄 Scheduling comprehensive blockchain data sync (non-blocking)...")
    
    // Start sync in background after a short delay to let server start first
    setImmediate(async () => {
      try {
        console.log("[IndexerService] 🔄 Starting comprehensive blockchain data sync...")
        
        // ✅ ALWAYS run comprehensive sync on startup to ensure all data is fetched
        // This fetches ALL universities, issuers, revokers, verifiers, degrees, and requests
        const { blockchainSync } = await import("../blockchain-sync")
        
        const syncResult = await blockchainSync.performComprehensiveFullSync().catch(err => {
          console.error("[IndexerService] ❌ Comprehensive sync failed:", err)
          throw err
        })

        console.log("[IndexerService] ✅ Comprehensive sync completed:", {
          universities: `${syncResult.universities.added} added, ${syncResult.universities.updated} updated`,
          issuers: `${syncResult.issuers.added} added, ${syncResult.issuers.updated} updated`,
          revokers: `${syncResult.revokers.added} added, ${syncResult.revokers.updated} updated`,
          verifiers: `${syncResult.verifiers.added} added, ${syncResult.verifiers.updated} updated`,
          degrees: `${syncResult.degrees.added} added, ${syncResult.degrees.updated} updated`,
          requests: `${syncResult.requests.degreeRequests} degree requests, ${syncResult.requests.revocationRequests} revocation requests`
        })

        // Update last full sync timestamp
        await sql`
          UPDATE sync_status
          SET last_full_sync_at = NOW()
          WHERE id = 1
        `
      } catch (error) {
        console.error("[IndexerService] ❌ Error during comprehensive sync:", error)
        // Don't fail startup - indexer can still work for new events
        // But log the error so it can be retried
      }
    })
  }

  /**
   * Start WebSocket listener (primary method)
   */
  private async startWebSocketListener(): Promise<void> {
    // Check if WebSocket URL is valid and supported
    if (!BASE_RPC_WS_URL || !BASE_RPC_WS_URL.startsWith("wss://")) {
      throw new Error("WebSocket URL not configured or unsupported protocol")
    }

    // Check if WebSocket is supported in this environment
    if (typeof WebSocket === "undefined" && typeof globalThis.WebSocket === "undefined") {
      throw new Error("WebSocket not supported in this environment")
    }

    // Use centralized RPC provider for WebSocket
    const { getRpcWsProvider } = await import("@/lib/config/rpc-provider")
    const provider = getRpcWsProvider()

    // Test connection - this will throw if WebSocket is not supported
    try {
      await provider.getNetwork()
    } catch (error: any) {
      // If it's an unsupported protocol error, throw to trigger fallback
      if (error?.code === "UNSUPPORTED_OPERATION" || error?.shortMessage?.includes("unsupported protocol")) {
        throw new Error("WebSocket protocol not supported by provider")
      }
      throw error
    }
    
    state.wsProvider = provider

    const contractAddress = getActiveContractAddress().toLowerCase()

    // Subscribe to logs for Core contract
    // Note: Base RPC may not support eth_subscribe - this will fail gracefully
    try {
      const subscriptionId = await provider.send("eth_subscribe", [
        "logs",
        {
          address: contractAddress,
        }
      ])

      state.wsSubscriptionId = subscriptionId
      console.log("[IndexerService] WebSocket subscription created:", subscriptionId)

      // Listen for new logs
      provider.on(subscriptionId, async (log: any) => {
        await this.ingestLog(log, provider)
      })

      // Handle disconnection
      provider.on("error", (error) => {
        console.error("[IndexerService] WebSocket error:", error)
        this.handleWebSocketDisconnect()
      })
    } catch (error) {
      // WebSocket subscription not supported - throw to trigger fallback
      throw new Error(`WebSocket subscription not supported: ${error}`)
    }
  }

  /**
   * Start polling listener (fallback method)
   */
  private async startPollingListener(): Promise<void> {
    // Use centralized RPC provider for smart failover
    const { getRpcHttpProvider } = await import("@/lib/config/rpc-provider")
    const provider = getRpcHttpProvider()

    state.wsProvider = provider

    // Initial poll
    await this.pollForNewEvents(provider)

    // Set up periodic polling
    state.pollingInterval = setInterval(async () => {
      if (!state.isRunning) {
        console.warn("[IndexerService] Polling skipped - indexer not running")
        return
      }
      try {
        await this.pollForNewEvents(provider)
      } catch (error: any) {
        // ✅ RATE LIMIT DETECTION: Check for Infura rate limit errors
        const isRateLimit = this.isRateLimitError(error)
        
        if (isRateLimit) {
          console.error("[IndexerService] ⚠️ Rate limit detected (Infura -32005). Stopping indexer to prevent further rate limiting.")
          console.error("[IndexerService] Error details:", error?.message || error)
          state.lastError = `Rate limit exceeded: ${error?.message || "Too Many Requests"}`
          state.lastErrorAt = new Date()
          state.isRunning = false
          
          // Stop polling interval
          if (state.pollingInterval) {
            clearInterval(state.pollingInterval)
            state.pollingInterval = null
          }
          
          console.error("[IndexerService] Indexer stopped due to rate limiting. Please wait before restarting or upgrade your Infura plan.")
          return
        }
        
        console.error("[IndexerService] Polling error:", error)
        // Don't stop the indexer on other errors - they might be transient
        if (error?.code === "UNKNOWN_ERROR" || error?.message?.includes("too many clients")) {
          console.error("[IndexerService] Critical polling error - may need restart")
        }
      }
    }, POLLING_INTERVAL)

    console.log("[IndexerService] Polling listener started (interval:", POLLING_INTERVAL, "ms)")
  }

  /**
   * Poll for new events via HTTP
   * ✅ Enhanced: On first run (lastProcessedBlock = 0), looks back much further to catch all historical events
   * ✅ RATE LIMIT PROTECTION: Added throttling and error handling for Infura rate limits
   */
  private async pollForNewEvents(provider: JsonRpcProvider): Promise<void> {
    try {
      // ✅ Add delay before making RPC call to prevent burst requests
      await this.delay(RPC_REQUEST_DELAY)
      
      const currentBlock = await this.getBlockNumberWithRetry(provider)
      
      // ✅ Enhanced lookback logic:
      // - If we haven't synced yet (lastProcessedBlock = 0), look back up to 50k blocks (reduced from 100k)
      // - Otherwise, look back max 5k blocks (reduced from 10k) to reduce RPC calls
      const maxLookback = state.lastProcessedBlock === 0 ? 50000 : 5000
      const fromBlock = Math.max(state.lastProcessedBlock + 1, currentBlock - maxLookback)

      if (fromBlock > currentBlock) return

      const contractAddress = getActiveContractAddress()
      const abi = getCoreContractABI()
      const contract = new Contract(contractAddress, abi, provider)

      // ✅ Add delay before querying events
      await this.delay(RPC_REQUEST_DELAY)

      // Fetch all events in range (with rate limit protection)
      const events = await this.queryFilterWithRetry(contract, "*", fromBlock, currentBlock)

      // Diagnostics: raw log count, decoded event count, event breakdown
      const eventCounts: Record<string, number> = {}
      events.forEach((e: any) => {
        const name = e.eventName || "Unknown"
        eventCounts[name] = (eventCounts[name] || 0) + 1
      })
      console.log(`[IndexerService] Polling: blocks ${fromBlock}-${currentBlock}, raw logs=${events.length}, decoded=${events.length}`)
      if (Object.keys(eventCounts).length > 0) {
        console.log(`[IndexerService]   Event breakdown:`, eventCounts)
      }
      
      // Alert on UniversityDeleted events
      const deletedEvents = events.filter((e: any) => e.eventName === "UniversityDeleted")
      if (deletedEvents.length > 0) {
        console.log(`[IndexerService] 🔴 CRITICAL: Found ${deletedEvents.length} UniversityDeleted event(s) in this polling cycle`)
        deletedEvents.forEach((e: any) => {
          console.log(`[IndexerService]   - Block ${e.blockNumber}, tx ${e.transactionHash}, universityId: ${e.args?.[0]?.toString() || 'unknown'}`)
        })
      }

      // ✅ RATE LIMIT PROTECTION: Process events with delays to prevent burst requests
      for (let i = 0; i < events.length; i++) {
        const event = events[i]
        await this.ingestEvent(event as EventLog, provider)
        
        // Tier-aware delay every 10 events (Free: 500ms, Paid: 200ms, Scale: 100ms)
        if ((i + 1) % 10 === 0) {
          await this.delay(INDEXER_BATCH_DELAY)
        }
      }

      // Update checkpoint
      if (currentBlock > state.lastProcessedBlock) {
        state.lastProcessedBlock = currentBlock
        await this.updateCheckpoint()
      }
    } catch (error: any) {
      // ✅ RATE LIMIT DETECTION: Check for rate limit errors
      if (this.isRateLimitError(error)) {
        console.error("[IndexerService] ⚠️ Rate limit detected during polling. Stopping indexer.")
        state.lastError = `Rate limit exceeded: ${error?.message || "Too Many Requests"}`
        state.lastErrorAt = new Date()
        state.isRunning = false
        
        // Stop polling interval
        if (state.pollingInterval) {
          clearInterval(state.pollingInterval)
          state.pollingInterval = null
        }
        
        throw error // Re-throw to stop the indexer
      }
      throw error // Re-throw other errors
    }
  }

  /**
   * Ingest a raw log (from WebSocket subscription)
   * Decode failures are logged (no silent skip).
   */
  private async ingestLog(log: any, provider: JsonRpcProvider): Promise<void> {
    try {
      const contractAddress = getActiveContractAddress()
      const abi = getCoreContractABI()
      const contract = new Contract(contractAddress, abi, provider)

      const parsedLog = contract.interface.parseLog({
        topics: log.topics,
        data: log.data,
      })

      if (!parsedLog) {
        console.warn(`[IndexerService] Log decode returned null tx=${log.transactionHash} logIndex=${log.logIndex} topics=${log.topics?.length}`)
        return
      }

      const block = await provider.getBlock(log.blockNumber)
      if (!block) return

      const eventLog: EventLog = {
        ...log,
        eventName: parsedLog.name,
        args: parsedLog.args,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        index: log.logIndex,
        address: log.address,
      } as EventLog

      await this.ingestEvent(eventLog, provider)
    } catch (error: any) {
      console.error(`[IndexerService] Log decode FAILED tx=${log?.transactionHash} logIndex=${log?.logIndex}:`, error?.message || error)
    }
  }

  /**
   * Ingest an event (idempotent storage in chain_events)
   */
  private async ingestEvent(event: EventLog, provider: JsonRpcProvider): Promise<void> {
    try {
      // Validate chain ID
      const network = await provider.getNetwork()
      if (Number(network.chainId) !== CHAIN_ID) {
        console.warn(`[IndexerService] Wrong chain ID: ${network.chainId}, expected ${CHAIN_ID}`)
        return
      }

      const txHash = event.transactionHash
      const logIndex = event.index
      const blockNumber = event.blockNumber
      const eventName = event.eventName || "Unknown"
      const contractAddress = event.address.toLowerCase()

      // ✅ RATE LIMIT PROTECTION: Add delay before fetching block
      await this.delay(RPC_REQUEST_DELAY)
      
      // Get block hash for reorg detection (with retry)
      let block
      try {
        block = await this.getBlockWithRetry(provider, blockNumber)
        if (!block) {
          console.warn(`[IndexerService] Block ${blockNumber} not found`)
          return
        }
      } catch (blockError: any) {
        if (this.isRateLimitError(blockError)) {
          console.error(`[IndexerService] Rate limited while fetching block ${blockNumber}. Stopping indexer.`)
          state.isRunning = false
          state.lastError = `Rate limit exceeded while fetching block ${blockNumber}`
          state.lastErrorAt = new Date()
          throw blockError // Re-throw to stop the indexer
        }
        console.warn(`[IndexerService] Error fetching block ${blockNumber}:`, blockError)
        return
      }

      // Store event in chain_events (idempotent); event.args may be Result (array-like with named keys)
      // Convert BigInt to string for JSON serialization
      const argsJson = JSON.stringify(event.args || {}, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
      try {
        await sql`
          INSERT INTO chain_events (
            chain_id, tx_hash, log_index, event_name, contract_address,
            block_number, block_hash, event_data, is_finalized, confirmation_depth,
            processed, projection_applied, created_at
          ) VALUES (
            ${CHAIN_ID}, ${txHash}, ${logIndex}, ${eventName}, ${contractAddress || ""},
            ${blockNumber}, ${block.hash || ""}, ${argsJson}::jsonb,
            false, 0, false, false, NOW()
          )
          ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING
        `
      } catch (dbError: any) {
        if (dbError?.code === "42P01") {
          console.warn("[IndexerService] chain_events table not found. Run migration first.")
          return
        }
        throw dbError
      }

      // Check for reorgs (non-blocking)
      this.checkForReorg(blockNumber, block.hash).catch(err => {
        console.warn(`[IndexerService] Reorg check failed:`, err)
      })

      // Enhanced logging for critical events
      if (eventName === "UniversityDeleted") {
        console.log(`[IndexerService] 🔴 CRITICAL: Ingested UniversityDeleted event at block ${blockNumber}, tx ${txHash}`)
        console.log(`[IndexerService]   Event data:`, argsJson)
      } else {
        console.log(`[IndexerService] ✅ Ingested event: ${eventName} at block ${blockNumber}`)
      }
    } catch (error) {
      console.error(`[IndexerService] Error ingesting event:`, error)
    }
  }

  /**
   * Check for blockchain reorganizations
   */
  private async checkForReorg(blockNumber: number, blockHash: string): Promise<void> {
    try {
      // Check if we've seen this block before with a different hash
      const existing = await sql`
        SELECT block_hash FROM chain_events
        WHERE chain_id = ${CHAIN_ID} AND block_number = ${blockNumber}
        LIMIT 1
      `

      if (existing.length > 0 && existing[0]?.block_hash && existing[0].block_hash !== blockHash) {
        console.warn(`[IndexerService] ⚠️ REORG DETECTED at block ${blockNumber}!`)
        console.warn(`  Expected: ${existing[0].block_hash}`)
        console.warn(`  Got: ${blockHash}`)

        // Mark reorg in sync_status
        try {
          await sql`
            UPDATE sync_status
            SET reorg_detected = true, last_reorg_at = NOW()
            WHERE id = 1
          `
        } catch (err) {
          console.warn("[IndexerService] Could not update reorg status:", err)
        }

        // Trigger reorg recovery
        await this.handleReorg(blockNumber, blockHash)
      }
    } catch (error) {
      console.error("[IndexerService] Error checking for reorg:", error)
    }
  }

  /**
   * Handle reorg: rewind and replay
   */
  private async handleReorg(affectedBlock: number, newBlockHash: string): Promise<void> {
    try {
      const rewindBlock = Math.max(affectedBlock - 50, state.finalizedBlock) // Rewind 50 blocks or to last finalized

      console.log(`[IndexerService] Rewinding to block ${rewindBlock} and replaying events...`)

      // Delete events from rewind block onwards
      try {
        await sql`
          DELETE FROM chain_events
          WHERE chain_id = ${CHAIN_ID}
            AND block_number >= ${rewindBlock}
            AND block_hash != ${newBlockHash}
        `

        // Mark events as needing reprojection
        await sql`
          UPDATE chain_events
          SET projection_applied = false, processed = false
          WHERE chain_id = ${CHAIN_ID} AND block_number >= ${rewindBlock}
        `
      } catch (err) {
        console.error("[IndexerService] Error during reorg cleanup:", err)
        throw err
      }

      // Replay events from rewind block
      await eventProjector.replayFromBlock(rewindBlock)

      console.log(`[IndexerService] ✅ Reorg recovery completed`)
    } catch (error) {
      console.error("[IndexerService] Error handling reorg:", error)
    }
  }

  /**
   * Start projection processor (runs independently, processes unprocessed events)
   */
  private startProjectionProcessor(): void {
    setInterval(async () => {
      if (!state.isRunning) return

      try {
        const result = await eventProjector.processUnprocessedEvents(100) // Process 100 events at a time
        if (result.eventsProcessed > 0) {
          console.log(`[IndexerService] Projected ${result.eventsProcessed} events`)
        }
      } catch (error) {
        console.error("[IndexerService] Projection processor error:", error)
      }
    }, 5000) // Run every 5 seconds
  }

  /**
   * Start finalization processor (marks events as finalized after confirmation depth)
   */
  private startFinalizationProcessor(): void {
    setInterval(async () => {
      if (!state.isRunning) return

      try {
        const currentBlock = state.lastProcessedBlock
        const finalizedBlock = currentBlock - CONFIRMATION_DEPTH

        // Mark events as finalized
        try {
          await sql`
            UPDATE chain_events
            SET 
              is_finalized = true,
              finalized_at = NOW(),
              confirmation_depth = ${CONFIRMATION_DEPTH}
            WHERE chain_id = ${CHAIN_ID}
              AND block_number <= ${finalizedBlock}
              AND is_finalized = false
          `
        } catch (err) {
          console.warn("[IndexerService] Error finalizing events:", err)
        }

        if (finalizedBlock > state.finalizedBlock) {
          state.finalizedBlock = finalizedBlock
          await this.updateCheckpoint()
        }
      } catch (error) {
        console.error("[IndexerService] Finalization processor error:", error)
      }
    }, 10000) // Run every 10 seconds
  }

  /**
   * Start periodic comprehensive sync (runs every hour to ensure all data stays in sync)
   * This ensures that even if events were missed, all data is periodically re-synced
   */
  private startPeriodicComprehensiveSync(): void {
    // Run first comprehensive sync 5 minutes after startup (after initial sync completes)
    setTimeout(async () => {
      if (!state.isRunning) return
      
      try {
        console.log("[IndexerService] 🔄 Running first periodic comprehensive sync...")
        const { blockchainSync } = await import("../blockchain-sync")
        await blockchainSync.performComprehensiveFullSync()
        console.log("[IndexerService] ✅ First periodic comprehensive sync completed")
      } catch (error) {
        console.error("[IndexerService] ❌ First periodic comprehensive sync error:", error)
      }
    }, 5 * 60 * 1000) // 5 minutes after startup
    
    // Then run every hour
    setInterval(async () => {
      if (!state.isRunning) return
      
      try {
        console.log("[IndexerService] 🔄 Running periodic comprehensive sync...")
        const { blockchainSync } = await import("../blockchain-sync")
        await blockchainSync.performComprehensiveFullSync()
        console.log("[IndexerService] ✅ Periodic comprehensive sync completed")
        
        // Update last full sync timestamp
        await sql`
          UPDATE sync_status
          SET last_full_sync_at = NOW()
          WHERE id = 1
        `
      } catch (error) {
        console.error("[IndexerService] ❌ Periodic comprehensive sync error:", error)
      }
    }, 60 * 60 * 1000) // Every 1 hour
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleWebSocketDisconnect(): void {
    console.warn("[IndexerService] WebSocket disconnected, switching to polling...")
    state.mode = "polling"
    state.wsSubscriptionId = null

    // Start polling as fallback
    if (state.wsProvider) {
      this.startPollingListener().catch(console.error)
    }
  }

  /**
   * Load checkpoint from database
   */
  private async loadCheckpoint(): Promise<void> {
    try {
      const result = await sql`
        SELECT last_synced_block, finalized_block, sync_mode
        FROM sync_status WHERE id = 1
      `

      if (result && result.length > 0) {
        state.lastProcessedBlock = Number(result[0]?.last_synced_block || 0)
        state.finalizedBlock = Number(result[0]?.finalized_block || 0)
        state.mode = (result[0]?.sync_mode || "polling") as "websocket" | "polling" | "manual"
      }
    } catch (error) {
      console.warn("[IndexerService] Could not load checkpoint:", error)
      // Don't fail startup if checkpoint can't be loaded - start from current block
    }
  }

  /**
   * Update checkpoint in database
   */
  private async updateCheckpoint(): Promise<void> {
    try {
      await sql`
        UPDATE sync_status
        SET 
          last_synced_block = ${state.lastProcessedBlock},
          finalized_block = ${state.finalizedBlock},
          sync_mode = ${state.mode},
          updated_at = NOW()
        WHERE id = 1
      `
    } catch (error) {
      console.warn("[IndexerService] Could not update checkpoint:", error)
      // Don't throw - checkpoint update failure shouldn't stop the indexer
    }
  }

  /**
   * Stop the indexer
   */
  async stop(): Promise<void> {
    if (!state.isRunning) return

    console.log("[IndexerService] Stopping indexer...")
    state.isRunning = false

    // Clear polling interval
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval)
      state.pollingInterval = null
    }

    // Unsubscribe from WebSocket
    if (state.wsSubscriptionId && state.wsProvider) {
      try {
        await state.wsProvider.send("eth_unsubscribe", [state.wsSubscriptionId])
      } catch (error) {
        console.warn("[IndexerService] Error unsubscribing:", error)
      }
      state.wsSubscriptionId = null
    }

    // Destroy provider
    if (state.wsProvider) {
      await state.wsProvider.destroy()
      state.wsProvider = null
    }

    console.log("[IndexerService] Stopped")
  }

  /**
   * ✅ RATE LIMIT PROTECTION: Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false
    
    // Infura rate limit error code: -32005
    const errorCode = error?.code || error?.info?.error?.code || error?.error?.code
    const errorMessage = (error?.message || error?.info?.error?.message || error?.error?.message || "").toLowerCase()
    
    // Check for Infura-specific rate limit error
    if (errorCode === -32005 || errorCode === "-32005") {
      return true
    }
    
    // Check for "Too Many Requests" message
    if (errorMessage.includes("too many requests") || errorMessage.includes("rate limit")) {
      return true
    }
    
    // Check for rate limit in nested error structure
    if (error?.info?.error?.code === -32005 || error?.error?.code === -32005) {
      return true
    }
    
    return false
  }

  /**
   * ✅ RATE LIMIT PROTECTION: Get block number with retry and exponential backoff
   */
  private async getBlockNumberWithRetry(provider: JsonRpcProvider, maxRetries = 3): Promise<number> {
    let lastError: any
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.getBlockNumber()
      } catch (error: any) {
        lastError = error
        
        if (this.isRateLimitError(error)) {
          const waitTime = Math.min(Math.pow(2, attempt) * 2000, 30000) // Max 30 seconds
          console.warn(`[IndexerService] Rate limited on getBlockNumber, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`)
          await this.delay(waitTime)
          continue
        }
        
        // For other errors, retry with shorter delay
        if (attempt < maxRetries - 1) {
          await this.delay(1000 * (attempt + 1))
          continue
        }
      }
    }
    
    throw lastError || new Error("Failed to get block number after retries")
  }

  /**
   * ✅ RATE LIMIT PROTECTION: Query filter with retry and exponential backoff
   */
  private async queryFilterWithRetry(
    contract: Contract,
    eventFilter: string | any,
    fromBlock: number,
    toBlock: number,
    maxRetries = 3
  ): Promise<any[]> {
    let lastError: any
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await contract.queryFilter(eventFilter, fromBlock, toBlock)
      } catch (error: any) {
        lastError = error
        
        if (this.isRateLimitError(error)) {
          const waitTime = Math.min(Math.pow(2, attempt) * 2000, 30000) // Max 30 seconds
          console.warn(`[IndexerService] Rate limited on queryFilter, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`)
          await this.delay(waitTime)
          continue
        }
        
        // For other errors, retry with shorter delay
        if (attempt < maxRetries - 1) {
          await this.delay(1000 * (attempt + 1))
          continue
        }
      }
    }
    
    throw lastError || new Error("Failed to query filter after retries")
  }

  /**
   * ✅ RATE LIMIT PROTECTION: Get block with retry
   */
  private async getBlockWithRetry(provider: JsonRpcProvider, blockNumber: number, maxRetries = 3): Promise<any> {
    let lastError: any
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.getBlock(blockNumber)
      } catch (error: any) {
        lastError = error
        
        if (this.isRateLimitError(error)) {
          const waitTime = Math.min(Math.pow(2, attempt) * 2000, 30000) // Max 30 seconds
          console.warn(`[IndexerService] Rate limited on getBlock, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`)
          await this.delay(waitTime)
          continue
        }
        
        // For other errors, retry with shorter delay
        if (attempt < maxRetries - 1) {
          await this.delay(1000 * (attempt + 1))
          continue
        }
      }
    }
    
    throw lastError || new Error(`Failed to get block ${blockNumber} after retries`)
  }

  /**
   * ✅ RATE LIMIT PROTECTION: Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get indexer status
   */
  getStatus() {
    return {
      isRunning: state.isRunning,
      mode: state.mode,
      lastProcessedBlock: state.lastProcessedBlock,
      finalizedBlock: state.finalizedBlock,
      wsConnected: state.wsSubscriptionId !== null,
      lastError: state.lastError,
      lastErrorAt: state.lastErrorAt,
    }
  }
}

// Singleton instance
export const indexerService = new IndexerService()
