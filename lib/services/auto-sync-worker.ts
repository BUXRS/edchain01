/**
 * Automatic Blockchain Sync Worker
 * 
 * This service automatically fetches data from smart contracts and syncs to database.
 * It runs periodically and listens to blockchain events for real-time updates.
 * 
 * Features:
 * - Periodic sync of all universities, issuers, revokers, verifiers, and degrees
 * - Event-driven sync when blockchain events occur
 * - Automatic retry on failures
 * - Configurable sync intervals
 */

import { JsonRpcProvider, Contract, EventLog } from "ethers"
import { 
  getActiveContractAddress, 
  getCoreContractABI,
  CHAIN_ID 
} from "@/lib/contracts/abi"
import { blockchainSync } from "./blockchain-sync"
import { transactionManager } from "./transaction-manager"
// ✅ CRITICAL: Use the SHARED connection pool from lib/db.ts, don't create a new one!
import { sql } from "@/lib/db"

// ✅ Upgradable RPC Configuration
import { getPrimaryRpcHttpUrl } from "@/lib/config/rpc-config"

// Use centralized RPC configuration (upgradable via environment variables)
const BASE_RPC_URL = getPrimaryRpcHttpUrl()

interface SyncConfig {
  enabled: boolean
  syncInterval: number // milliseconds
  eventListenerEnabled: boolean
  syncUniversities: boolean
  syncIssuers: boolean
  syncRevokers: boolean
  syncVerifiers: boolean
  syncDegrees: boolean
}

const defaultConfig: SyncConfig = {
  enabled: true,
  syncInterval: 5 * 60 * 1000, // 5 minutes default
  eventListenerEnabled: true,
  syncUniversities: true,
  syncIssuers: true,
  syncRevokers: true,
  syncVerifiers: true,
  syncDegrees: true,
}

class AutoSyncWorker {
  private config: SyncConfig
  private syncInterval: NodeJS.Timeout | null = null
  private eventProvider: JsonRpcProvider | null = null
  private eventListeners: Map<string, () => void> = new Map()
  private isRunning = false
  private lastSyncTime: Date | null = null
  private syncStats = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastError: null as string | null,
  }

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * Start the automatic sync worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[AutoSync] Worker already running")
      return
    }

    this.isRunning = true
    console.log("[AutoSync] Starting automatic blockchain sync worker...")

    // Start periodic sync
    if (this.config.enabled) {
      this.startPeriodicSync()
    }

    // Start event listener
    if (this.config.eventListenerEnabled) {
      await this.startEventListener()
    }

    // Run initial sync
    await this.runFullSync()
  }

  /**
   * Stop the automatic sync worker
   */
  async stop(): Promise<void> {
    this.isRunning = false
    console.log("[AutoSync] Stopping automatic blockchain sync worker...")

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    // Stop event listeners
    this.eventListeners.forEach((cleanup) => cleanup())
    this.eventListeners.clear()

    if (this.eventProvider) {
      await this.eventProvider.destroy()
      this.eventProvider = null
    }
  }

  /**
   * Start periodic sync interval
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.runFullSync()
      }
    }, this.config.syncInterval)

    console.log(`[AutoSync] Periodic sync started (interval: ${this.config.syncInterval / 1000}s)`)
  }

  /**
   * Start blockchain event listener
   */
  private async startEventListener(): Promise<void> {
    try {
      // Use centralized RPC provider for smart failover
      const { getRpcHttpProvider } = await import("@/lib/config/rpc-provider")
      this.eventProvider = getRpcHttpProvider()

      const contractAddress = getActiveContractAddress()
      // Use Core contract ABI for event listening
      const abi = getCoreContractABI()
      const contract = new Contract(contractAddress, abi, this.eventProvider)

      // Listen to UniversityRegistered event
      const universityRegisteredListener = async (
        universityId: bigint,
        admin: string,
        event: EventLog
      ) => {
        console.log(`[AutoSync] UniversityRegistered event: ID=${universityId}, Admin=${admin}`)
        await this.syncUniversity(Number(universityId))
        await this.broadcastEvent("university_registered", {
          universityId: Number(universityId),
          admin,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        })
      }

      // Listen to IssuerGranted event
      const issuerGrantedListener = async (
        universityId: bigint,
        issuer: string,
        event: EventLog
      ) => {
        console.log(`[AutoSync] IssuerGranted event: University=${universityId}, Issuer=${issuer}`)
        await this.syncIssuers(Number(universityId))
        await this.broadcastEvent("issuer_granted", {
          universityId: Number(universityId),
          issuer,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        })
      }

      // Listen to RevokerGranted event
      const revokerGrantedListener = async (
        universityId: bigint,
        revoker: string,
        event: EventLog
      ) => {
        console.log(`[AutoSync] RevokerGranted event: University=${universityId}, Revoker=${revoker}`)
        await this.syncRevokers(Number(universityId))
        await this.broadcastEvent("revoker_granted", {
          universityId: Number(universityId),
          revoker,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        })
      }

      // Listen to VerifierAdded event (Core contract)
      const verifierAddedListener = async (
        universityId: bigint,
        verifier: string,
        event: EventLog
      ) => {
        console.log(`[AutoSync] VerifierAdded event: University=${universityId}, Verifier=${verifier}`)
        await this.syncVerifiers(Number(universityId))
        await this.broadcastEvent("verifier_added", {
          universityId: Number(universityId),
          verifier,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        })
      }
      contract.on("VerifierAdded", verifierAddedListener)
      this.eventListeners.set("VerifierAdded", () => {
        contract.off("VerifierAdded", verifierAddedListener)
      })

      // Listen to VerifierRemoved event (Core contract)
      const verifierRemovedListener = async (
        universityId: bigint,
        verifier: string,
        event: EventLog
      ) => {
        console.log(`[AutoSync] VerifierRemoved event: University=${universityId}, Verifier=${verifier}`)
        await this.syncVerifiers(Number(universityId))
        await this.broadcastEvent("verifier_removed", {
          universityId: Number(universityId),
          verifier,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        })
      }
      contract.on("VerifierRemoved", verifierRemovedListener)
      this.eventListeners.set("VerifierRemoved", () => {
        contract.off("VerifierRemoved", verifierRemovedListener)
      })

      // Listen to DegreeIssued event
      const degreeIssuedListener = async (
        tokenId: bigint,
        universityId: bigint,
        recipient: string,
        event: EventLog
      ) => {
        console.log(`[AutoSync] DegreeIssued event: TokenID=${tokenId}, University=${universityId}`)
        await this.syncDegree(Number(tokenId))
        await this.syncDegrees(Number(universityId))
        await this.broadcastEvent("degree_issued", {
          tokenId: Number(tokenId),
          universityId: Number(universityId),
          recipient,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        })
      }

      // Listen to DegreeRevoked event
      const degreeRevokedListener = async (
        tokenId: bigint,
        event: EventLog
      ) => {
        console.log(`[AutoSync] DegreeRevoked event: TokenID=${tokenId}`)
        await this.syncDegree(Number(tokenId))
        await this.broadcastEvent("degree_revoked", {
          tokenId: Number(tokenId),
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        })
      }

      // Attach event listeners
      contract.on("UniversityRegistered", universityRegisteredListener)
      contract.on("IssuerUpdated", issuerUpdatedListener)
      contract.on("RevokerUpdated", revokerUpdatedListener)
      contract.on("DegreeIssued", degreeIssuedListener)
      contract.on("DegreeRevoked", degreeRevokedListener)

      // Store cleanup functions
      this.eventListeners.set("UniversityRegistered", () => {
        contract.off("UniversityRegistered", universityRegisteredListener)
      })
      this.eventListeners.set("IssuerUpdated", () => {
        contract.off("IssuerUpdated", issuerUpdatedListener)
      })
      this.eventListeners.set("RevokerUpdated", () => {
        contract.off("RevokerUpdated", revokerUpdatedListener)
      })
      this.eventListeners.set("DegreeIssued", () => {
        contract.off("DegreeIssued", degreeIssuedListener)
      })
      this.eventListeners.set("DegreeRevoked", () => {
        contract.off("DegreeRevoked", degreeRevokedListener)
      })

      console.log("[AutoSync] Event listeners started")
    } catch (error) {
      console.error("[AutoSync] Failed to start event listener:", error)
      // Continue without event listener - periodic sync will still work
    }
  }

  /**
   * Run full sync of all entities
   */
  private async runFullSync(): Promise<void> {
    if (!this.isRunning) return

    console.log("[AutoSync] Starting full sync...")
    this.syncStats.totalSyncs++

    try {
      // Get all universities from blockchain
      const { fetchAllUniversities } = await import("@/lib/blockchain")
      const blockchainUniversities = await fetchAllUniversities()

      console.log(`[AutoSync] Found ${blockchainUniversities.length} universities on blockchain`)

      // Sync each university and its related data
      for (const uni of blockchainUniversities) {
        const universityId = Number(uni.id)

        try {
          // Sync university
          if (this.config.syncUniversities) {
            await this.syncUniversity(universityId)
          }

          // Sync issuers
          if (this.config.syncIssuers) {
            await this.syncIssuers(universityId)
          }

          // Sync revokers
          if (this.config.syncRevokers) {
            await this.syncRevokers(universityId)
          }

          // Sync verifiers (Core contract always has verifiers)
          if (this.config.syncVerifiers) {
            await this.syncVerifiers(universityId)
          }

          // Sync degrees
          if (this.config.syncDegrees) {
            await this.syncDegrees(universityId)
          }
        } catch (error) {
          console.error(`[AutoSync] Error syncing university ${universityId}:`, error)
        }
      }

      this.syncStats.successfulSyncs++
      this.lastSyncTime = new Date()
      console.log("[AutoSync] Full sync completed successfully")
    } catch (error) {
      this.syncStats.failedSyncs++
      this.syncStats.lastError = error instanceof Error ? error.message : "Unknown error"
      console.error("[AutoSync] Full sync failed:", error)
    }
  }

  /**
   * Sync a single university
   */
  private async syncUniversity(universityId: number): Promise<void> {
    try {
      await blockchainSync.syncUniversity(universityId)
    } catch (error) {
      console.error(`[AutoSync] Error syncing university ${universityId}:`, error)
    }
  }

  /**
   * Sync issuers for a university
   */
  private async syncIssuers(universityId: number): Promise<void> {
    try {
      await blockchainSync.syncIssuersForUniversity(universityId)
    } catch (error) {
      console.error(`[AutoSync] Error syncing issuers for university ${universityId}:`, error)
    }
  }

  /**
   * Sync revokers for a university
   */
  private async syncRevokers(universityId: number): Promise<void> {
    try {
      await blockchainSync.syncRevokersForUniversity(universityId)
    } catch (error) {
      console.error(`[AutoSync] Error syncing revokers for university ${universityId}:`, error)
    }
  }

  /**
   * Sync verifiers for a university
   */
  private async syncVerifiers(universityId: number): Promise<void> {
    try {
      await blockchainSync.syncVerifiersForUniversity(universityId)
    } catch (error) {
      console.error(`[AutoSync] Error syncing verifiers for university ${universityId}:`, error)
    }
  }

  /**
   * Sync degrees for a university
   */
  private async syncDegrees(universityId: number): Promise<void> {
    try {
      await blockchainSync.syncDegreesForUniversity(universityId)
    } catch (error) {
      console.error(`[AutoSync] Error syncing degrees for university ${universityId}:`, error)
    }
  }

  /**
   * Sync a single degree
   */
  private async syncDegree(tokenId: number): Promise<void> {
    try {
      await blockchainSync.syncDegree(tokenId)
    } catch (error) {
      console.error(`[AutoSync] Error syncing degree ${tokenId}:`, error)
    }
  }

  /**
   * Broadcast event to connected clients via SSE
   */
  private async broadcastEvent(eventType: string, data: any): Promise<void> {
    try {
      // Use the existing events API to broadcast
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "blockchain_sync",
          data: {
            type: eventType,
            ...data,
            timestamp: new Date().toISOString(),
          },
        }),
      }).catch(() => {
        // Silently fail if events API is not available
      })
    } catch (error) {
      // Silently fail - event broadcasting is optional
    }
  }

  /**
   * Get sync statistics
   */
  getStats() {
    return {
      ...this.syncStats,
      lastSyncTime: this.lastSyncTime,
      isRunning: this.isRunning,
      config: this.config,
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Restart periodic sync if interval changed
    if (newConfig.syncInterval && this.isRunning) {
      this.startPeriodicSync()
    }
  }
}

// Singleton instance
let workerInstance: AutoSyncWorker | null = null

/**
 * Get or create the auto sync worker instance
 */
export function getAutoSyncWorker(config?: Partial<SyncConfig>): AutoSyncWorker {
  if (!workerInstance) {
    workerInstance = new AutoSyncWorker(config)
  }
  return workerInstance
}

/**
 * Start the auto sync worker (call this from API route or server startup)
 */
export async function startAutoSync(config?: Partial<SyncConfig>): Promise<void> {
  const worker = getAutoSyncWorker(config)
  await worker.start()
}

/**
 * Stop the auto sync worker
 */
export async function stopAutoSync(): Promise<void> {
  if (workerInstance) {
    await workerInstance.stop()
  }
}

export default getAutoSyncWorker
