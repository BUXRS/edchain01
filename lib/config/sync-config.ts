/**
 * Sync Configuration - Tier-Aware RPC Throttling
 *
 * Optimizes sync and fetch delays based on RPC provider tier.
 * Free tier: Conservative delays to avoid rate limits (429).
 * Paid tier (Infura Growth/Scale): Tuned for paid capacity (100k+ req/day, higher throughput).
 *
 * Set RPC_PAID_TIER=true or INFURA_TIER=paid when using Infura paid plan.
 * Optional: INFURA_PLAN=scale for even faster values on Scale tier.
 */

const isPaidTier = (): boolean => {
  return (
    process.env.RPC_PAID_TIER === "true" ||
    process.env.NEXT_PUBLIC_RPC_PAID_TIER === "true" ||
    process.env.INFURA_TIER === "paid" ||
    process.env.RPC_PROVIDER_TIER === "paid"
  )
}

/** Scale tier = more aggressive (Infura Scale has higher rate limits) */
const isScalePlan = (): boolean => isPaidTier() && process.env.INFURA_PLAN === "scale"

/** Delay between RPC calls in indexer (ms). Free: 1000, Paid: 100, Scale: 50 */
export function getRpcRequestDelay(): number {
  const env = process.env.RPC_REQUEST_DELAY
  if (env) return parseInt(env, 10)
  if (isScalePlan()) return 50
  return isPaidTier() ? 100 : 1000
}

/** Polling interval for indexer (ms). Free: 60000, Paid: 15000, Scale: 10000 */
export function getPollingInterval(): number {
  const env = process.env.POLLING_INTERVAL
  if (env) return parseInt(env, 10)
  if (isScalePlan()) return 10000
  return isPaidTier() ? 15000 : 60000
}

/** Delay between university syncs (ms). Free: 2000, Paid: 250, Scale: 150 */
export function getSyncDelayUniversity(): number {
  const env = process.env.SYNC_DELAY_UNIVERSITY_MS
  if (env) return parseInt(env, 10)
  if (isScalePlan()) return 150
  return isPaidTier() ? 250 : 2000
}

/** Delay between entity syncs (ms). Free: 1000, Paid: 150, Scale: 100 */
export function getSyncDelayEntity(): number {
  const env = process.env.SYNC_DELAY_ENTITY_MS
  if (env) return parseInt(env, 10)
  if (isScalePlan()) return 100
  return isPaidTier() ? 150 : 1000
}

/** Min delay between fetchUniversityFromBlockchain calls (ms). Free: 30000, Paid: 2000, Scale: 1000 */
export function getFetchThrottleMinMs(): number {
  const env = process.env.FETCH_THROTTLE_MIN_MS
  if (env) return parseInt(env, 10)
  if (isScalePlan()) return 1000
  return isPaidTier() ? 2000 : 30000
}

/** Max delay for fetch throttle (ms). Free: 60000, Paid: 5000, Scale: 3000 */
export function getFetchThrottleMaxMs(): number {
  const env = process.env.FETCH_THROTTLE_MAX_MS
  if (env) return parseInt(env, 10)
  if (isScalePlan()) return 3000
  return isPaidTier() ? 5000 : 60000
}

/** Real-time sync polling interval (ms). Free: 30000, Paid: 10000, Scale: 5000 */
export function getRealtimeSyncInterval(): number {
  const env = process.env.REALTIME_SYNC_INTERVAL
  if (env) return parseInt(env, 10)
  if (isScalePlan()) return 5000
  return isPaidTier() ? 10000 : 30000
}

/** Defer RPC on page load (ms). Free: 2000, Paid: 0. Use NEXT_PUBLIC_ for client. */
export function getPageLoadRpcDeferMs(): number {
  const env = process.env.PAGE_LOAD_RPC_DEFER_MS ?? process.env.NEXT_PUBLIC_PAGE_LOAD_RPC_DEFER_MS
  if (env) return parseInt(env, 10)
  return isPaidTier() ? 0 : 2000
}

/** Delay every N events in indexer batch (ms). Free: 500, Paid: 200, Scale: 100 */
export function getIndexerBatchDelayMs(): number {
  const env = process.env.INDEXER_BATCH_DELAY_MS
  if (env) return parseInt(env, 10)
  if (isScalePlan()) return 100
  return isPaidTier() ? 200 : 500
}
