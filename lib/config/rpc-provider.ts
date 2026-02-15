/**
 * RPC Provider Manager - Smart RPC Selection & Failover
 * 
 * This module provides intelligent RPC provider management with:
 * - Automatic failover on errors
 * - Health monitoring
 * - Load balancing (for multiple endpoints)
 * - Rate limit detection and switching
 * - Performance metrics
 */

import { JsonRpcProvider } from "ethers"
import { getRpcConfig, getPrimaryRpcHttpUrl, getPrimaryRpcWsUrl, getAllRpcProviders, getNextFallbackRpc, type RpcProvider } from "./rpc-config"

interface ProviderHealth {
  provider: RpcProvider
  isHealthy: boolean
  lastChecked: Date
  lastError?: string
  responseTime?: number
  consecutiveFailures: number
}

class RpcProviderManager {
  private providers: Map<string, ProviderHealth> = new Map()
  private currentProvider: RpcProvider | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    this.initializeProviders()
  }

  /**
   * Initialize all RPC providers
   */
  private initializeProviders(): void {
    const allProviders = getAllRpcProviders()
    
    for (const provider of allProviders) {
      this.providers.set(provider.httpUrl, {
        provider,
        isHealthy: true,
        lastChecked: new Date(),
        consecutiveFailures: 0,
      })
    }

    // Set primary as current
    const config = getRpcConfig()
    this.currentProvider = config.primary
  }

  /**
   * Get current RPC provider (with automatic failover)
   */
  getCurrentProvider(): RpcProvider {
    if (!this.currentProvider) {
      const config = getRpcConfig()
      this.currentProvider = config.primary
    }
    return this.currentProvider
  }

  /**
   * Get HTTP provider instance
   * Uses primary HTTP provider (Base public for large block ranges)
   */
  getHttpProvider(): JsonRpcProvider {
    // For HTTP, prefer Base public (allows large block ranges)
    // But use configured primary if explicitly set
    const config = getRpcConfig()
    const httpProvider = this.getHttpProviderForRequest()
    
    return new JsonRpcProvider(httpProvider.httpUrl, {
      chainId: 8453,
      name: "base",
    })
  }

  /**
   * Get WebSocket provider instance
   * Uses Infura for WebSocket (primary provider)
   */
  getWsProvider(): JsonRpcProvider {
    // For WebSocket, prefer Infura (primary provider)
    const wsProvider = this.getWsProviderForRequest()
    const wsUrl = wsProvider.wsUrl || wsProvider.httpUrl.replace("https://", "wss://").replace("http://", "ws://")
    
    return new JsonRpcProvider(wsUrl, {
      chainId: 8453,
      name: "base",
    })
  }

  /**
   * Get HTTP provider for requests (uses Infura as primary)
   */
  private getHttpProviderForRequest(): RpcProvider {
    const config = getRpcConfig()
    
    // ✅ INFURA ONLY: Always use primary (which is Infura)
    return config.primary
  }

  /**
   * Get WebSocket provider for requests (uses Infura exclusively)
   */
  private getWsProviderForRequest(): RpcProvider {
    const config = getRpcConfig()
    
    // ✅ INFURA ONLY: Always use primary (which is Infura)
    return config.primary
  }

  /**
   * Handle RPC error and switch to fallback if needed
   */
  async handleError(error: any, currentUrl: string): Promise<boolean> {
    const health = this.providers.get(currentUrl)
    if (health) {
      health.consecutiveFailures++
      health.lastError = error?.message || "Unknown error"
      health.lastChecked = new Date()

      // Mark as unhealthy after 3 consecutive failures
      if (health.consecutiveFailures >= 3) {
        health.isHealthy = false
        console.warn(`[RpcProviderManager] Provider ${health.provider.name} marked as unhealthy after ${health.consecutiveFailures} failures`)
      }
    }

    // Check if we should switch to fallback
    const isRateLimit = 
      error?.code === "CALL_EXCEPTION" && 
      (error?.info?.error?.code === -32016 || 
       error?.message?.includes("rate limit"))

    const isConnectionError = 
      error?.code === "NETWORK_ERROR" ||
      error?.code === "TIMEOUT" ||
      error?.message?.includes("ECONNREFUSED")

    if (isRateLimit || isConnectionError || (health && health.consecutiveFailures >= 3)) {
      return await this.switchToFallback(currentUrl)
    }

    return false
  }

  /**
   * Switch to next fallback provider
   */
  private async switchToFallback(currentUrl: string): Promise<boolean> {
    const fallback = getNextFallbackRpc(currentUrl)
    
    if (!fallback) {
      console.error(`[RpcProviderManager] No fallback available for ${currentUrl}`)
      return false
    }

    console.log(`[RpcProviderManager] Switching from ${this.currentProvider?.name} to ${fallback.name}`)
    this.currentProvider = fallback
    return true
  }

  /**
   * Mark provider as healthy (after successful request)
   */
  markHealthy(url: string, responseTime?: number): void {
    const health = this.providers.get(url)
    if (health) {
      health.isHealthy = true
      health.consecutiveFailures = 0
      health.lastChecked = new Date()
      if (responseTime) {
        health.responseTime = responseTime
      }
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    const config = getRpcConfig()
    if (!config.healthCheck.enabled) return

    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllProvidersHealth()
    }, config.healthCheck.interval)

    // Initial check
    this.checkAllProvidersHealth()
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /**
   * Check health of all providers
   */
  private async checkAllProvidersHealth(): Promise<void> {
    const config = getRpcConfig()
    const allProviders = getAllRpcProviders()

    for (const provider of allProviders) {
      try {
        const startTime = Date.now()
        const testProvider = new JsonRpcProvider(provider.httpUrl, {
          chainId: 8453,
          name: "base",
        })
        
        // Simple health check: get latest block number
        await Promise.race([
          testProvider.getBlockNumber(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), config.healthCheck.timeout)
          )
        ])

        const responseTime = Date.now() - startTime
        this.markHealthy(provider.httpUrl, responseTime)
      } catch (error: any) {
        const health = this.providers.get(provider.httpUrl)
        if (health) {
          health.isHealthy = false
          health.lastError = error?.message
          health.lastChecked = new Date()
        }
      }
    }

    // Switch to healthy provider if current is unhealthy
    const currentHealth = this.currentProvider ? this.providers.get(this.currentProvider.httpUrl) : null
    if (currentHealth && !currentHealth.isHealthy) {
      const healthyProvider = allProviders.find(p => {
        const h = this.providers.get(p.httpUrl)
        return h && h.isHealthy && p.priority < this.currentProvider!.priority
      })
      
      if (healthyProvider) {
        console.log(`[RpcProviderManager] Auto-switching to healthy provider: ${healthyProvider.name}`)
        this.currentProvider = healthyProvider
      }
    }
  }

  /**
   * Get provider statistics
   */
  getStats(): {
    current: string
    providers: Array<{
      name: string
      healthy: boolean
      failures: number
      responseTime?: number
    }>
  } {
    return {
      current: this.currentProvider?.name || "Unknown",
      providers: Array.from(this.providers.values()).map(h => ({
        name: h.provider.name,
        healthy: h.isHealthy,
        failures: h.consecutiveFailures,
        responseTime: h.responseTime,
      })),
    }
  }
}

// Singleton instance
export const rpcProviderManager = new RpcProviderManager()

// Export convenience functions
export function getRpcHttpProvider(): JsonRpcProvider {
  return rpcProviderManager.getHttpProvider()
}

export function getRpcWsProvider(): JsonRpcProvider {
  return rpcProviderManager.getWsProvider()
}

export function getRpcHttpUrl(): string {
  // ✅ INFURA ONLY: Always use primary (which is Infura)
  return rpcProviderManager.getCurrentProvider().httpUrl
}

export function getRpcWsUrl(): string {
  // ✅ INFURA ONLY: Always use primary (which is Infura)
  const provider = rpcProviderManager.getCurrentProvider()
  return provider.wsUrl || provider.httpUrl.replace("https://", "wss://").replace("http://", "ws://")
}
