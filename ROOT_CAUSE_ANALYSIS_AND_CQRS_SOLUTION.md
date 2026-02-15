# Root Cause Analysis: Why Issuers/Revokers Not Inserted to DB

## 🔍 Root Cause Identified

### Problem 1: **Polling Window Too Small**
**Location**: `lib/services/websocket-indexer.ts:314`
```typescript
const fromBlock = Math.max(state.lastProcessedBlock + 1, currentBlock - 100) // Look back max 100 blocks
```

**Issue**: 
- Polling only looks back **100 blocks** (≈20 minutes on Base)
- If issuers/revokers were added more than 100 blocks ago, they're **never fetched**
- Historical events are missed entirely

### Problem 2: **Initial Sync Only Runs on Empty DB**
**Location**: `lib/services/websocket-indexer.ts:101`
```typescript
if (universitiesCount === 0) {
  // Only syncs if DB is completely empty
}
```

**Issue**:
- If universities exist but issuers/revokers don't, initial sync **doesn't run**
- Comprehensive sync runs hourly, but might miss historical data

### Problem 3: **Event Processing Requires Confirmation Depth**
**Location**: `lib/services/websocket-indexer.ts:476`
```typescript
if (confirmations >= CONFIRMATION_DEPTH) { // 10 blocks
  await applyProjection(eventName, event, blockNumber, block.hash)
}
```

**Issue**:
- Events need 10 confirmations before projection is applied
- Historical events might never get processed if they're too old

---

## ✅ CQRS-Based Solution

### What is CQRS?
**Command Query Responsibility Segregation** separates:
- **Command Side (Write)**: Ingests blockchain events → stores in `chain_events` table
- **Query Side (Read)**: Projects `chain_events` → materialized views (issuers, revokers, degrees tables)

### Current Architecture (Partial CQRS)
✅ **Command Side**: Already implemented
- `pollForNewEvents()` → stores events in `chain_events` table
- Events are stored idempotently (ON CONFLICT DO NOTHING)

❌ **Query Side**: Needs improvement
- `applyProjection()` processes events, but:
  - Only processes events with 10+ confirmations
  - Doesn't backfill historical events
  - Polling window too small

---

## 🚀 Proposed Fix

### 1. **Expand Polling Window for Historical Sync**
```typescript
// Instead of only 100 blocks, scan from contract deployment or last known good block
const CONTRACT_DEPLOYMENT_BLOCK = 0 // Or actual deployment block
const fromBlock = Math.max(
  state.lastProcessedBlock + 1, 
  CONTRACT_DEPLOYMENT_BLOCK,
  currentBlock - 10000 // Look back 10,000 blocks for initial sync
)
```

### 2. **Always Run Comprehensive Sync on Startup**
```typescript
// Instead of: if (universitiesCount === 0)
// Always run comprehensive sync, but skip if already synced recently
const lastSync = await sql`SELECT last_synced_at FROM sync_status WHERE id = 1`
if (!lastSync || Date.now() - lastSync > 3600000) { // 1 hour
  await performComprehensiveFullSync()
}
```

### 3. **Separate Event Ingestion from Projection (True CQRS)**
```typescript
// Command Side: Always ingest events (no confirmation depth required)
async function ingestEvent(event: EventLog) {
  await sql`INSERT INTO chain_events ... ON CONFLICT DO NOTHING`
  // No projection here - just store the event
}

// Query Side: Project events independently (can run async, retry, backfill)
async function projectEvents() {
  // Process all unprocessed events (regardless of confirmation depth)
  const events = await sql`
    SELECT * FROM chain_events 
    WHERE projection_applied = false
    ORDER BY block_number ASC
  `
  for (const event of events) {
    await applyProjection(event.event_name, event)
  }
}
```

### 4. **Backfill Historical Events**
```typescript
async function backfillHistoricalEvents() {
  const contract = getReadOnlyContract()
  const provider = getReadOnlyProvider()
  const deploymentBlock = 0 // Or actual deployment block
  const currentBlock = await provider.getBlockNumber()
  
  // Fetch ALL historical IssuerUpdated and RevokerUpdated events
  const issuerEvents = await contract.queryFilter(
    contract.filters.IssuerUpdated(),
    deploymentBlock,
    currentBlock
  )
  const revokerEvents = await contract.queryFilter(
    contract.filters.RevokerUpdated(),
    deploymentBlock,
    currentBlock
  )
  
  // Store all events in chain_events
  for (const event of [...issuerEvents, ...revokerEvents]) {
    await ingestEvent(event)
  }
  
  // Then project them
  await projectEvents()
}
```

---

## 📋 Implementation Plan

### Phase 1: Fix Polling Window (Immediate)
1. Expand polling window from 100 to 10,000 blocks for initial sync
2. Add contract deployment block tracking
3. Always run comprehensive sync on startup (not just when DB is empty)

### Phase 2: Implement True CQRS (Recommended)
1. Separate event ingestion from projection
2. Create background worker for projection (can run async)
3. Add backfill job for historical events
4. Implement retry logic for failed projections

### Phase 3: Add Monitoring & Alerts
1. Track sync lag (current block vs last processed)
2. Alert if events are more than 1000 blocks behind
3. Dashboard showing sync status per entity type

---

## 🎯 Why CQRS Solves This

### Benefits:
1. **Resilience**: If projection fails, event is still stored (can retry)
2. **Performance**: Ingestion is fast (just store), projection can be async
3. **Backfill**: Can reproject all events from scratch if needed
4. **Scalability**: Can have multiple projection workers
5. **Auditability**: All events stored in `chain_events` (immutable log)

### Current vs CQRS:

**Current (Tightly Coupled)**:
```
Blockchain Event → Store + Project (same transaction)
  ↓
If projection fails → Event might be lost
If too old → Never processed
```

**CQRS (Decoupled)**:
```
Blockchain Event → Store in chain_events (always succeeds)
  ↓
Background Worker → Project events (can retry, backfill)
  ↓
Materialized Views (issuers, revokers tables)
```

---

## 🔧 Quick Fix (Without Full CQRS)

If you want a quick fix without full CQRS refactoring:

1. **Expand polling window**:
```typescript
const fromBlock = Math.max(
  state.lastProcessedBlock + 1,
  currentBlock - 10000 // 10,000 blocks instead of 100
)
```

2. **Always run comprehensive sync on startup**:
```typescript
// Remove the `if (universitiesCount === 0)` check
// Always run comprehensive sync
await performComprehensiveFullSync()
```

3. **Backfill historical events**:
```typescript
// Add to performInitialFullSyncIfNeeded()
await backfillHistoricalIssuersAndRevokers()
```

---

## 📊 Expected Results

After implementing the fix:
- ✅ All historical issuers/revokers will be fetched and inserted
- ✅ Future events will be processed in real-time
- ✅ System will be more resilient to failures
- ✅ Can rebuild entire DB from `chain_events` if needed

---

**Status**: Ready to implement. Choose:
1. **Quick Fix**: Expand polling window + always run comprehensive sync
2. **Full CQRS**: Separate ingestion from projection (recommended for production)
