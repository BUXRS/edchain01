/**
 * Auto Sync Initialization
 *
 * This module automatically starts blockchain sync services when the server starts.
 * On Vercel / RPC_ON_DEMAND_ONLY: auto sync is skipped to save Infura credits.
 * Sync then runs only via cron (/api/cron/sync) and on-demand (admin "Sync now", etc.).
 */

let syncStarted = false

const isOnDemandOnly =
  process.env.VERCEL === "1" || process.env.RPC_ON_DEMAND_ONLY === "true"

/**
 * Initialize and start automatic blockchain sync
 * Call this during app startup
 */
export async function initializeAutoSync() {
  if (syncStarted) {
    console.log("[AutoSyncInit] Sync already started")
    return
  }

  // Skip auto sync on Vercel / on-demand mode (saves RPC credits)
  if (isOnDemandOnly) {
    console.log("[AutoSyncInit] RPC on-demand only: auto sync disabled. Use cron or manual sync.")
    return
  }

  // Only start in production or when explicitly enabled
  const shouldStart =
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_AUTO_SYNC === "true"

  if (!shouldStart) {
    console.log("[AutoSyncInit] Auto sync disabled (set ENABLE_AUTO_SYNC=true to enable)")
    return
  }

  try {
    console.log("[AutoSyncInit] Starting automatic blockchain sync...")

    // Start realtime sync (event listeners + periodic sync)
    const { realtimeSync } = await import("@/lib/services/realtime-sync")
    await realtimeSync.start()

    // Optionally start auto sync worker (if you want separate worker)
    // const { startAutoSync } = await import("@/lib/services/auto-sync-worker")
    // await startAutoSync({
    //   enabled: true,
    //   syncInterval: 5 * 60 * 1000, // 5 minutes
    //   eventListenerEnabled: true,
    // })

    syncStarted = true
    console.log("[AutoSyncInit] Automatic blockchain sync started successfully")
  } catch (error) {
    console.error("[AutoSyncInit] Failed to start auto sync:", error)
    // Don't throw - allow app to continue without sync
  }
}

/**
 * Stop automatic blockchain sync
 */
export async function shutdownAutoSync() {
  if (!syncStarted) return

  try {
    const { realtimeSync } = await import("@/lib/services/realtime-sync")
    realtimeSync.stop()

    const { stopAutoSync } = await import("@/lib/services/auto-sync-worker")
    await stopAutoSync()

    syncStarted = false
    console.log("[AutoSyncInit] Automatic blockchain sync stopped")
  } catch (error) {
    console.error("[AutoSyncInit] Error stopping auto sync:", error)
  }
}

// Auto-start in server environments (skipped when isOnDemandOnly)
if (
  typeof window === "undefined" &&
  process.env.ENABLE_AUTO_SYNC !== "false" &&
  !isOnDemandOnly
) {
  setTimeout(() => {
    initializeAutoSync().catch(console.error)
  }, 5000)
}
