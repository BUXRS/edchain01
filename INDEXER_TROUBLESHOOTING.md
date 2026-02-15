# Indexer Troubleshooting Guide

## Why the Real-Time Indexer Stopped

The indexer may stop for several reasons:

### Common Causes

1. **Startup Error**: If the indexer encounters an error during initialization (in `instrumentation.ts`), it sets `isRunning = false` and stops.

2. **Database Connection Issues**: If the database is unavailable or `chain_events` table doesn't exist, the indexer may fail to start.

3. **RPC Connection Issues**: If the Base RPC endpoint is unreachable, the indexer cannot poll for events.

4. **Missing Tables**: If `sync_status` or `chain_events` tables don't exist, the indexer will fail.

5. **Error During Polling**: Critical errors during event polling can cause the indexer to stop (though we've improved error handling to prevent this).

## How to Restart the Indexer

### Option 1: Via Dashboard (Recommended)

1. Go to the Super Admin Dashboard (`/admin`)
2. Look for the "Indexer Health" widget
3. If status shows "Stopped", click the **"Start Indexer"** button
4. The page will automatically refresh after 2 seconds to show updated status

### Option 2: Via API Endpoint

```bash
# Restart the indexer
curl -X POST http://localhost:3000/api/admin/indexer/start \
  -H "Content-Type: application/json" \
  -d '{"action": "restart"}'

# Check indexer status
curl http://localhost:3000/api/admin/indexer/start
```

### Option 3: Restart the Server

If the indexer fails to start on server startup, restart the Next.js dev server:

```bash
# Stop the server (Ctrl+C)
# Then restart
pnpm run dev
```

The indexer will attempt to start automatically via `instrumentation.ts`.

## Checking Indexer Status

The dashboard shows:
- **Status**: Running or Stopped
- **Last Event**: Timestamp of last processed event
- **Total Events**: Count of events in `chain_events` table
- **Sync Mode**: WebSocket or Polling

## Debugging Steps

1. **Check Server Logs**: Look for errors starting with `[IndexerService]` or `[Instrumentation]`

2. **Verify Database Tables**:
   ```sql
   SELECT * FROM sync_status WHERE id = 1;
   SELECT COUNT(*) FROM chain_events;
   ```

3. **Check RPC Connectivity**:
   - Verify `BASE_RPC_HTTP_URL` is set correctly
   - Test: `curl https://mainnet.base.org` should return JSON-RPC response

4. **Verify Environment Variables**:
   - `DATABASE_URL` must be set
   - `BASE_RPC_HTTP_URL` (optional, defaults to `https://mainnet.base.org`)

## Prevention

The indexer now has improved error handling:
- Non-critical errors don't stop the indexer
- Polling errors are logged but don't stop the service
- Database errors are caught and logged
- The indexer can be restarted without server restart

## Next Steps

If the indexer continues to stop:
1. Check server console logs for specific error messages
2. Verify database connectivity
3. Ensure `chain_events` table exists (run migration if needed)
4. Check RPC endpoint availability
5. Use the "Start Indexer" button in the dashboard to restart
