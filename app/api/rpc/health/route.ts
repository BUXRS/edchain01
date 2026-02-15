/**
 * RPC Health Check Endpoint
 * 
 * Returns the current RPC provider status and health information
 */

import { rpcProviderManager } from "@/lib/config/rpc-provider"
import { getRpcConfig, getAllRpcProviders } from "@/lib/config/rpc-config"

export async function GET() {
  try {
    const stats = rpcProviderManager.getStats()
    const config = getRpcConfig()
    const allProviders = getAllRpcProviders()

    return Response.json({
      success: true,
      current: {
        name: stats.current,
        httpUrl: config.primary.httpUrl,
        wsUrl: config.primary.wsUrl,
      },
      providers: stats.providers,
      allConfigured: allProviders.map(p => ({
        name: p.name,
        httpUrl: p.httpUrl,
        wsUrl: p.wsUrl,
        priority: p.priority,
        enabled: p.enabled,
      })),
      healthCheck: {
        enabled: config.healthCheck.enabled,
        interval: config.healthCheck.interval,
        timeout: config.healthCheck.timeout,
      },
      retry: config.retry,
    })
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error?.message || "Unknown error",
    }, { status: 500 })
  }
}
