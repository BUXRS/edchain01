/**
 * Next.js Instrumentation Hook
 * 
 * This file runs once when the server starts.
 * Used to initialize real-time blockchain sync.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on server-side
    try {
      // ✅ Require database to be reachable before starting indexer (avoids ECONNREFUSED spam)
      const { pingDatabase } = await import('./lib/db')
      const dbOk = await pingDatabase().catch(() => false)
      if (!dbOk) {
        console.warn('[Instrumentation] Database not available (PostgreSQL not running or DATABASE_URL wrong). Indexer and reconciler disabled.')
        console.warn('[Instrumentation] Start PostgreSQL and set DATABASE_URL in .env.local, then restart the dev server.')
        return
      }

      // ✅ PRODUCTION-GRADE: Start new IndexerService (WebSocket-first + CQRS)
      const { indexerService } = await import('./lib/services/indexer/IndexerService')
      const { reconcilerService } = await import('./lib/services/indexer/ReconcilerService')
      
      console.log('[Instrumentation] Starting production-grade blockchain indexer (Event Sourcing + CQRS)...')
      
      // Start RPC health monitoring (if enabled)
      try {
        const { rpcProviderManager } = await import('./lib/config/rpc-provider')
        rpcProviderManager.startHealthMonitoring()
        console.log('[Instrumentation] ✅ RPC health monitoring started')
      } catch (error: any) {
        console.warn('[Instrumentation] ⚠️ RPC health monitoring not available:', error?.message || error)
      }
      
      // Start indexer (primary ingestion)
      try {
        await indexerService.start()
        console.log('[Instrumentation] ✅ Indexer started successfully')
      } catch (indexerError: any) {
        console.error('[Instrumentation] ❌ Indexer failed to start:', indexerError)
        console.error('[Instrumentation] Error details:', indexerError?.message || String(indexerError))
        console.error('[Instrumentation] Stack:', indexerError?.stack)
        // Indexer can be restarted via /api/admin/indexer/start
        console.log('[Instrumentation] 💡 Use POST /api/admin/indexer/start with action="restart" to restart the indexer')
      }
      
      // Start reconciler (secondary backfill)
      try {
        await reconcilerService.start()
        console.log('[Instrumentation] ✅ Reconciler started successfully')
      } catch (reconcilerError: any) {
        console.error('[Instrumentation] ❌ Reconciler failed to start:', reconcilerError)
        // Reconciler failure is less critical - indexer can work without it
      }

      // Backfill degrees from degree_requests (ISSUED but missing in degrees table)
      try {
        const { backfillIssuedDegrees } = await import('./lib/db')
        const { synced, errors } = await backfillIssuedDegrees()
        if (synced > 0) {
          console.log(`[Instrumentation] ✅ Backfilled ${synced} issued degree(s) from degree_requests into degrees table`)
        }
        if (errors.length > 0) {
          console.warn('[Instrumentation] Backfill issued degrees had errors:', errors)
        }
      } catch (backfillErr: any) {
        console.warn('[Instrumentation] Backfill issued degrees failed:', backfillErr?.message || backfillErr)
      }
      
      console.log('[Instrumentation] ✅ Blockchain indexer initialization complete')
    } catch (error: any) {
      console.error('[Instrumentation] ❌ Critical error during initialization:', error)
      console.error('[Instrumentation] Error details:', error?.message || String(error))
      // Don't throw - allow server to start even if indexer fails
    }
  }
}
