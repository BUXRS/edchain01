# 🚨 IMMEDIATE ACTION REQUIRED: Indexer Not Running

## Problem Identified

The WebSocket indexer is **NOT running** because Next.js configuration is missing the `instrumentationHook` flag.

## ✅ Fix Applied

I've fixed `next.config.mjs` to enable the instrumentation hook. **You need to restart your dev server** for the fix to take effect.

## 🔧 What I Fixed

**File:** `next.config.mjs`

Added:
```javascript
experimental: {
  instrumentationHook: true, // ✅ Required for instrumentation.ts to run
}
```

## 📋 Next Steps (REQUIRED)

### Step 1: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### Step 2: Check Server Logs

After restart, you should see these messages in your terminal:

```
[Instrumentation] Starting WebSocket-first blockchain indexer...
[WebSocketIndexer] Starting WebSocket-first blockchain indexer...
[WebSocketIndexer] Database appears empty, performing initial full sync...
[WebSocketIndexer] Indexer started successfully in websocket mode
```

### Step 3: Verify Indexer is Running

```javascript
// In browser console
fetch('/api/sync/status').then(r => r.json()).then(data => {
  console.log('Indexer Running:', data.indexer.isRunning) // Should be true
  console.log('Mode:', data.indexer.mode) // Should be "websocket" or "polling"
})
```

### Step 4: If DB is Still Empty, Trigger Full Sync

```javascript
// In browser console
fetch('/api/sync/full', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('Sync Results:', data.summary)
    alert(`Added: ${data.summary.totalAdded}, Updated: ${data.summary.totalUpdated}`)
  })
```

## 🆘 Alternative: Manual Start (If Auto-Start Fails)

If after restart the indexer still doesn't start automatically, you can manually start it:

```javascript
// In browser console
fetch('/api/sync/indexer/start', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('Indexer Start Result:', data)
    if (data.success) {
      alert('Indexer started!')
    }
  })
```

## ✅ Success Indicators

You'll know it's working when:

1. **Server logs show indexer started**
2. **API status shows `isRunning: true`**
3. **Database gets populated with data**

## 📊 Expected Results

After restart and sync:

- `GET /api/sync/status` → `indexer.isRunning: true`
- `GET /api/sync/status` → `counts.universities > 0` (if universities exist on blockchain)
- `GET /api/sync/status` → `counts.degrees > 0` (if degrees exist on blockchain)

---

**CRITICAL:** Restart your dev server now for the fix to take effect!
