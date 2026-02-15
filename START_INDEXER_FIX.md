# 🚨 CRITICAL: Indexer Not Running - Fix Guide

## Problem

The WebSocket indexer is **NOT running** (`indexerActive: false`, `isRunning: false`), which is why the database is empty.

## Root Cause

The indexer should start automatically via `instrumentation.ts` when the server starts, but it's not running. Possible reasons:
1. Instrumentation hook not being called
2. Indexer failing to start silently
3. Next.js config missing instrumentation flag

## ✅ Immediate Fix

### Step 1: Manually Start the Indexer

**Option A: Via API Endpoint (NEW)**

```javascript
// In browser console
fetch('/api/sync/indexer/start', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('Indexer Start Result:', data)
    if (data.success) {
      alert('Indexer started! Check /api/sync/status')
    } else {
      alert('Failed: ' + data.error)
    }
  })
```

**Option B: Check Server Logs**

Look for these messages in your terminal where `npm run dev` is running:
- `[Instrumentation] Starting WebSocket-first blockchain indexer...`
- `[WebSocketIndexer] Starting WebSocket-first blockchain indexer...`
- `[WebSocketIndexer] Indexer started successfully`

If you DON'T see these messages, the instrumentation hook is not running.

### Step 2: Verify Next.js Config

Check `next.config.mjs` - it should have:

```javascript
export default {
  experimental: {
    instrumentationHook: true, // ✅ This is required!
  },
}
```

### Step 3: Restart the Server

After fixing the config, restart your dev server:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### Step 4: Check Indexer Status

```javascript
// In browser console
fetch('/api/sync/status').then(r => r.json()).then(data => {
  console.log('Indexer Status:', data.indexer)
  console.log('Is Running:', data.indexer.isRunning)
  console.log('Mode:', data.indexer.mode)
})
```

## 🔧 Permanent Fix

### Fix 1: Ensure Next.js Config Has Instrumentation

**File:** `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true, // ✅ Enable instrumentation
  },
}

export default nextConfig
```

### Fix 2: Check for Startup Errors

The indexer might be failing to start. Check server logs for:
- `[Instrumentation] Failed to start blockchain indexer:`
- `[WebSocketIndexer] Failed to start:`

If you see errors, they will tell you why it's failing.

### Fix 3: Manual Start Endpoint

I've created `/api/sync/indexer/start` endpoint that you can call to manually start the indexer if automatic startup fails.

## 📊 Verification

After starting the indexer, verify it's working:

```javascript
// 1. Check status
fetch('/api/sync/status').then(r => r.json()).then(data => {
  console.log('Indexer Running:', data.indexer.isRunning)
  console.log('Universities:', data.counts.universities)
  console.log('Degrees:', data.counts.degrees)
})

// 2. If DB is still empty, trigger full sync
fetch('/api/sync/full', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('Sync Results:', data.summary)
  })
```

## 🐛 Troubleshooting

### Problem: Indexer Still Not Starting

**Check 1: Server Logs**
- Look for `[Instrumentation]` messages
- Look for `[WebSocketIndexer]` messages
- Check for error messages

**Check 2: Next.js Version**
- Instrumentation hook requires Next.js 13.2+
- Check: `package.json` → `"next": "^13.2.0"` or higher

**Check 3: Database Connection**
- Indexer needs DB connection to start
- Check: `DATABASE_URL` in `.env` is correct
- Test: `SELECT NOW()` in database

### Problem: Indexer Starts But No Data

**Solution:**
1. Indexer is running but database is empty
2. Trigger full sync: `POST /api/sync/full`
3. Check if universities exist on blockchain: `GET /api/sync/debug`

## ✅ Success Indicators

You'll know it's working when:

1. **Server logs show:**
   ```
   [Instrumentation] Starting WebSocket-first blockchain indexer...
   [WebSocketIndexer] Starting WebSocket-first blockchain indexer...
   [WebSocketIndexer] Indexer started successfully in websocket mode
   ```

2. **API status shows:**
   ```json
   {
     "indexer": {
       "isRunning": true,
       "mode": "websocket" | "polling"
     }
   }
   ```

3. **Database has data:**
   ```sql
   SELECT COUNT(*) FROM universities; -- > 0
   SELECT COUNT(*) FROM degrees; -- > 0
   ```

---

**Last Updated:** 2026-01-25
**Status:** Indexer not running - needs manual start or config fix
