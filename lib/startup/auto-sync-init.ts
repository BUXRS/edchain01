/**
 * Auto Sync Initialization
 * 
 * This module automatically starts blockchain sync services when the server starts.
 * Import this in your app initialization or middleware.
 */

let syncStarted = false

/**
 * Initialize and start automatic blockchain sync
 * Call this during app startup
 */
export async function initializeAutoSync() {
  if (syncStarted) {
    console.log("[AutoSyncInit] Sync already started")
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

// Auto-start in server environments
if (typeof window === "undefined" && process.env.ENABLE_AUTO_SYNC !== "false") {
  // Delay initialization to avoid blocking server startup
  setTimeout(() => {
    initializeAutoSync().catch(console.error)
  }, 5000) // Start after 5 seconds
}
