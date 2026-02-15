# 🚀 QUICK START: Make Database Sync from Blockchain

## The Problem
Database is empty and not automatically fetching from blockchain.

## The Solution (3 Steps)

### Step 1: Run Database Migration (CRITICAL)

```bash
psql -U postgres -d bubd -f scripts/024-create-chain-events-table.sql
```

**Or in pgAdmin:**
1. Open `scripts/024-create-chain-events-table.sql`
2. Execute it

### Step 2: Trigger Initial Full Sync

**Option A: Browser Console (Easiest)**
1. Open your app: `http://localhost:3000`
2. Press F12 (open console)
3. Paste and run:
```javascript
fetch('/api/sync/full', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('✅ Sync Complete!', data)
    alert(`Added: ${data.summary.totalAdded}, Updated: ${data.summary.totalUpdated}`)
  })
```

**Option B: Terminal**
```bash
curl -X POST http://localhost:3000/api/sync/full
```

### Step 3: Verify It Worked

```sql
-- Check universities
SELECT COUNT(*) FROM universities WHERE blockchain_verified = true;

-- Check degrees  
SELECT COUNT(*) FROM degrees WHERE blockchain_verified = true;
```

## ✅ That's It!

After Step 2, your database will be populated. The indexer will continue syncing automatically in the background.

## 🔍 Check Status

```bash
# Get sync status
curl http://localhost:3000/api/sync/status
```

## 🆘 Still Empty?

1. **Check server logs** - Look for `[FullSync]` or `[WebSocketIndexer]` messages
2. **Check contract address** in `.env`:
   ```
   NEXT_PUBLIC_CORE_CONTRACT_ADDRESS=0xBb51Dc84f0b35d3344f777543CA6549F9427B313
   ```
3. **Verify RPC works**:
   ```javascript
   // In browser console
   fetch('https://mainnet.base.org', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 })
   }).then(r => r.json()).then(console.log)
   ```

---

**The sync system uses:**
- ✅ WebSocket for real-time events (primary)
- ✅ HTTP polling as fallback
- ✅ Automatic initial sync when database is empty
- ✅ Periodic reconciliation every 5 minutes
- ✅ Reorg detection and rollback

**No manual intervention needed after initial setup!**
