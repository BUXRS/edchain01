/**
 * RPC Configuration - Centralized & Upgradable
 * 
 * This module provides a centralized, upgradable RPC configuration system.
 * 
 * Features:
 * - Environment-based configuration
 * - Multiple RPC provider support (primary + fallbacks)
 * - Automatic failover
 * - Health monitoring
 * - Easy upgrades without code changes
 * - Support for scaling (load balancing, multiple endpoints)
 * 
 * Usage:
 * - Development: Use Infura free tier
 * - Production: Use Infura or multiple providers
 * - Scaling: Add multiple RPC endpoints for load balancing
 */

export interface RpcProvider {
  name: string
  httpUrl: string
  wsUrl?: string
  priority: number // Lower = higher priority
  enabled: boolean
  rateLimit?: {
    requestsPerSecond?: number
    requestsPerMinute?: number
    requestsPerDay?: number
  }
}

export interface RpcConfig {
  primary: RpcProvider
  fallbacks: RpcProvider[]
  healthCheck: {
    enabled: boolean
    interval: number // milliseconds
    timeout: number // milliseconds
  }
  retry: {
    maxAttempts: number
    backoffMultiplier: number
  }
}

/**
 * Get RPC configuration from environment variables
 * 
 * Priority:
 * 1. Explicit BASE_RPC_HTTP_URL / BASE_RPC_WS_URL
 * 2. NEXT_PUBLIC_BASE_RPC_URL (for client-side)
 * 3. Default to Infura (recommended) or Base public
 */
function getRpcConfigFromEnv(): RpcConfig {
  // ✅ INFURA ONLY MODE: Use Infura as the EXCLUSIVE RPC provider
  // HTTP: Use Infura (reliable, good performance)
  // WebSocket: Use Infura (if WebSocket supported) or fallback to HTTP polling
  // No other providers - Infura only
  
  // Primary HTTP RPC - Infura BUCERT (Paid Plan)
  const httpUrl = 
    process.env.BASE_RPC_HTTP_URL || 
    process.env.NEXT_PUBLIC_BASE_RPC_URL || 
    process.env.INFURA_BASE_RPC_URL ||
    "https://base-mainnet.infura.io/v3/cdeeed182e95467591b66019ed6ea32a" // Infura BUCERT default

  // Primary WebSocket RPC - Infura uses /ws/ path for WebSocket
  let wsUrl = 
    process.env.BASE_RPC_WS_URL || 
    process.env.INFURA_BASE_WS_URL
  
  // If Infura is configured, use it for WebSocket (Infura WS uses /ws/v3/ path)
  if (process.env.INFURA_BASE_RPC_URL || process.env.INFURA_BASE_WS_URL) {
    wsUrl = wsUrl || process.env.INFURA_BASE_WS_URL || 
            process.env.INFURA_BASE_RPC_URL?.replace("https://base-mainnet.infura.io/v3/", "wss://base-mainnet.infura.io/ws/v3/")
  }
  
  // Fallback WebSocket - Infura uses /ws/ path (not just https->wss)
  if (!wsUrl) {
    wsUrl = httpUrl.includes("infura.io") 
      ? httpUrl.replace("https://base-mainnet.infura.io/v3/", "wss://base-mainnet.infura.io/ws/v3/")
      : httpUrl.replace("https://", "wss://").replace("http://", "ws://")
  }

  // Determine provider name from URL
  let providerName = "Base Public"
  if (httpUrl.includes("infura.io")) providerName = "Infura"
  else if (httpUrl.includes("alchemy.com")) providerName = "Alchemy"
  else if (httpUrl.includes("quiknode.pro")) providerName = "QuickNode"
  else if (httpUrl.includes("ankr.com")) providerName = "Ankr"

  const primary: RpcProvider = {
    name: providerName,
    httpUrl,
    wsUrl,
    priority: 1,
    enabled: true,
  }

  // ✅ INFURA ONLY MODE: No fallbacks - Infura is the exclusive provider
  // Only add fallbacks if explicitly configured via environment variables
  // and ONLY if they are NOT Infura (to prevent duplicate Infura entries)
  const fallbacks: RpcProvider[] = []

  // Only add fallbacks if explicitly requested via INFURA_FALLBACK_ENABLED=false
  // By default, we use Infura exclusively
  const allowFallbacks = process.env.INFURA_FALLBACK_ENABLED === "true"
  
  if (allowFallbacks) {
    // Add Alchemy as fallback ONLY if explicitly enabled and not primary
    if (process.env.ALCHEMY_BASE_RPC_URL && !httpUrl.includes("alchemy.com")) {
      const alchemyHttpUrl = process.env.ALCHEMY_BASE_RPC_URL
      const alchemyWsUrl = process.env.ALCHEMY_BASE_WS_URL || alchemyHttpUrl.replace("https://", "wss://").replace("http://", "ws://")
      
      fallbacks.push({
        name: "Alchemy (Fallback)",
        httpUrl: alchemyHttpUrl,
        wsUrl: alchemyWsUrl,
        priority: 2,
        enabled: true,
      })
    }
    
    // Add Base public as fallback ONLY if explicitly enabled
    if (process.env.BASE_PUBLIC_FALLBACK_ENABLED === "true" && !httpUrl.includes("mainnet.base.org")) {
      fallbacks.push({
        name: "Base Public (Fallback)",
        httpUrl: "https://mainnet.base.org",
        wsUrl: "wss://mainnet.base.org",
        priority: 3,
        enabled: true,
      })
    }

    // Add QuickNode as fallback ONLY if explicitly enabled
    if (process.env.QUICKNODE_BASE_RPC_URL) {
      fallbacks.push({
        name: "QuickNode (Fallback)",
        httpUrl: process.env.QUICKNODE_BASE_RPC_URL,
        wsUrl: process.env.QUICKNODE_BASE_WS_URL || process.env.QUICKNODE_BASE_RPC_URL.replace("https://", "wss://"),
        priority: 4,
        enabled: true,
      })
    }
  }
  
  // By default: No fallbacks - Infura only

  return {
    primary,
    fallbacks: fallbacks.sort((a, b) => a.priority - b.priority),
    healthCheck: {
      enabled: process.env.RPC_HEALTH_CHECK_ENABLED !== "false",
      interval: parseInt(process.env.RPC_HEALTH_CHECK_INTERVAL || "60000", 10), // 1 minute
      timeout: parseInt(process.env.RPC_HEALTH_CHECK_TIMEOUT || "5000", 10), // 5 seconds
    },
    retry: {
      maxAttempts: parseInt(process.env.RPC_MAX_RETRIES || "3", 10),
      backoffMultiplier: parseFloat(process.env.RPC_BACKOFF_MULTIPLIER || "2", 10),
    },
  }
}

// Cache the configuration
let cachedConfig: RpcConfig | null = null

/**
 * Get RPC configuration (cached)
 */
export function getRpcConfig(): RpcConfig {
  if (!cachedConfig) {
    cachedConfig = getRpcConfigFromEnv()
  }
  return cachedConfig
}

/**
 * Get primary HTTP RPC URL
 */
export function getPrimaryRpcHttpUrl(): string {
  return getRpcConfig().primary.httpUrl
}

/**
 * Get primary WebSocket RPC URL
 */
export function getPrimaryRpcWsUrl(): string {
  return getRpcConfig().primary.wsUrl || getRpcConfig().primary.httpUrl.replace("https://", "wss://").replace("http://", "ws://")
}

/**
 * Get all available RPC providers (primary + fallbacks)
 */
export function getAllRpcProviders(): RpcProvider[] {
  const config = getRpcConfig()
  return [config.primary, ...config.fallbacks].filter(p => p.enabled)
}

/**
 * Get next fallback RPC provider
 */
export function getNextFallbackRpc(currentUrl: string): RpcProvider | null {
  const config = getRpcConfig()
  const allProviders = getAllRpcProviders()
  const currentIndex = allProviders.findIndex(p => p.httpUrl === currentUrl)
  
  if (currentIndex === -1 || currentIndex >= allProviders.length - 1) {
    return null
  }
  
  return allProviders[currentIndex + 1]
}

/**
 * Reset cached configuration (useful for testing or dynamic updates)
 */
export function resetRpcConfig(): void {
  cachedConfig = null
}

/**
 * Get recommended RPC configuration for different stages
 */
export function getRecommendedRpcConfig(stage: "development" | "staging" | "production"): {
  provider: string
  httpUrl: string
  wsUrl: string
  notes: string
} {
  switch (stage) {
    case "development":
      return {
        provider: "Infura (Free Tier)",
        httpUrl: "https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID",
        wsUrl: "wss://base-mainnet.infura.io/v3/YOUR_PROJECT_ID",
        notes: "Free tier: 100,000 requests/day. Perfect for development."
      }
    
    case "staging":
      return {
        provider: "Infura (Growth Tier)",
        httpUrl: "https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID",
        wsUrl: "wss://base-mainnet.infura.io/v3/YOUR_PROJECT_ID",
        notes: "Growth tier: Higher limits, better for testing production-like load."
      }
    
    case "production":
      return {
        provider: "Infura (Scale Tier) + Alchemy (Fallback)",
        httpUrl: "https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID",
        wsUrl: "wss://base-mainnet.infura.io/v3/YOUR_PROJECT_ID",
        notes: "Scale tier: Higher limits. Add Alchemy as fallback for redundancy."
      }
    
    default:
      return {
        provider: "Base Public",
        httpUrl: "https://mainnet.base.org",
        wsUrl: "wss://mainnet.base.org",
        notes: "Free but rate-limited. Not recommended for production."
      }
  }
}
