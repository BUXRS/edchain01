# Automatic Blockchain Sync Setup

This document explains how to set up automatic synchronization between the blockchain (smart contracts) and the database.

## Overview

The automatic sync system ensures that all data from the blockchain is automatically fetched and inserted into the database. It includes:

1. **Periodic Sync**: Automatically syncs all blockchain data at regular intervals
2. **Event-Driven Sync**: Listens to blockchain events and syncs immediately when changes occur
3. **Real-time Updates**: Uses WebSocket connections for instant synchronization

## Components

### 1. Auto Sync Worker (`lib/services/auto-sync-worker.ts`)
- Runs periodic syncs at configurable intervals
- Listens to blockchain events via WebSocket
- Automatically syncs universities, issuers, revokers, verifiers, and degrees

### 2. Realtime Sync Service (`lib/services/realtime-sync.ts`)
- Continuous monitoring of blockchain events
- Real-time sync when events occur
- Incremental sync for efficiency

### 3. Blockchain Sync Service (`lib/services/blockchain-sync.ts`)
- Core sync logic for each entity type
- Handles database insertions and updates
- Maintains sync logs

## Setup Instructions

### Option 1: Automatic Startup (Recommended)

The sync will automatically start when the server starts if:
- `NODE_ENV=production` OR
- `ENABLE_AUTO_SYNC=true` is set

Add to your `.env` file:
```env
ENABLE_AUTO_SYNC=true
```

### Option 2: Manual Start via API

Call the startup endpoint:
```bash
curl -X POST http://localhost:3000/api/startup
```

Or start via the auto-sync API:
```bash
curl -X POST http://localhost:3000/api/auto-sync \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### Option 3: Cron Job (Vercel/External)

Set up a cron job to call the sync endpoint periodically:

**Vercel Cron** (add to `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**External Cron** (call this URL):
```
POST https://your-domain.com/api/cron/sync
Authorization: Bearer YOUR_CRON_SECRET
```

## API Endpoints

### Get Sync Status
```bash
GET /api/auto-sync
```

### Start Auto Sync
```bash
POST /api/auto-sync
{
  "action": "start",
  "config": {
    "syncInterval": 300000,  // 5 minutes in milliseconds
    "eventListenerEnabled": true,
    "syncUniversities": true,
    "syncIssuers": true,
    "syncRevokers": true,
    "syncVerifiers": true,
    "syncDegrees": true
  }
}
```

### Stop Auto Sync
```bash
POST /api/auto-sync
{
  "action": "stop"
}
```

### Start Realtime Sync
```bash
POST /api/auto-sync
{
  "action": "start_realtime"
}
```

### Trigger Manual Full Sync
```bash
POST /api/auto-sync
{
  "action": "full_sync"
}
```

### Sync Specific Entity
```bash
POST /api/sync
{
  "action": "full_university",
  "universityId": 1
}
```

## What Gets Synced

### Universities
- Fetches all universities from blockchain
- Inserts/updates in `universities` table
- Syncs: name, name_ar, admin wallet, is_active status

### Issuers
- Fetches all issuers for each university
- Inserts/updates in `issuers` table
- Syncs: wallet_address, university_id, is_active

### Revokers
- Fetches all revokers for each university
- Inserts/updates in `revokers` table
- Syncs: wallet_address, university_id, is_active

### Verifiers (V2 Contract Only)
- Fetches all verifiers for each university
- Inserts/updates in `verifiers` table
- Syncs: wallet_address, university_id, is_active

### Degrees
- Fetches all degrees for each university
- Inserts/updates in `degrees` table
- Syncs: token_id, student info, major, graduation date, revocation status

## Event Listeners

The system listens to these blockchain events and syncs immediately:

- `UniversityRegistered` - New university registered
- `IssuerGranted` / `IssuerUpdated` - Issuer added/removed
- `RevokerGranted` / `RevokerUpdated` - Revoker added/removed
- `VerifierGranted` / `VerifierAdded` / `VerifierRemoved` - Verifier changes (V2)
- `DegreeIssued` - New degree issued
- `DegreeRevoked` - Degree revoked

## Configuration

### Environment Variables

```env
# Enable auto sync (default: enabled in production)
ENABLE_AUTO_SYNC=true

# Cron secret for secure cron job calls
CRON_SECRET=your-secret-key

# Infura API key for WebSocket connections
NEXT_PUBLIC_INFURA_API_KEY=your-infura-key
```

### Sync Configuration

Default sync interval: **5 minutes**

You can customize:
- `syncInterval`: How often to run periodic sync (milliseconds)
- `eventListenerEnabled`: Enable/disable event listeners
- `syncUniversities`, `syncIssuers`, etc.: Enable/disable specific entity syncs

## Monitoring

### Check Sync Status
```bash
GET /api/auto-sync
```

Response includes:
- `isRunning`: Whether sync is active
- `lastSyncTime`: Last successful sync
- `totalSyncs`: Total number of syncs performed
- `successfulSyncs`: Number of successful syncs
- `failedSyncs`: Number of failed syncs
- `lastError`: Last error message (if any)

### View Sync Logs
```bash
GET /api/sync?action=logs
```

## Troubleshooting

### Sync Not Starting

1. Check environment variables:
   ```bash
   echo $ENABLE_AUTO_SYNC
   ```

2. Check server logs for errors

3. Manually trigger sync:
   ```bash
   curl -X POST http://localhost:3000/api/startup
   ```

### Data Not Syncing

1. Verify blockchain connection:
   - Check RPC endpoints are accessible
   - Verify contract address is correct

2. Check database connection:
   - Verify `DATABASE_URL` is set
   - Test database connectivity

3. Review sync logs:
   ```bash
   GET /api/sync?action=logs
   ```

### WebSocket Connection Issues

If WebSocket fails, the system falls back to:
- HTTP polling (periodic sync)
- Manual sync via API

The sync will still work, just without real-time event updates.

## Best Practices

1. **Start sync on server startup** - Use the startup endpoint or environment variable
2. **Monitor sync status** - Regularly check sync logs and status
3. **Set appropriate intervals** - Balance between freshness and RPC rate limits
4. **Use cron jobs** - For production, use Vercel Cron or external cron service
5. **Handle errors gracefully** - Sync failures don't block the application

## Database Tables

The sync system populates these tables:

- `universities` - University data
- `issuers` - Issuer wallets per university
- `revokers` - Revoker wallets per university
- `verifiers` - Verifier wallets per university (V2)
- `degrees` - Degree records
- `sync_logs` - Sync operation logs
- `pending_transactions` - Transaction tracking

## Next Steps

1. Set `ENABLE_AUTO_SYNC=true` in your environment
2. Deploy and verify sync is running
3. Set up cron job for periodic sync (optional but recommended)
4. Monitor sync status and logs regularly

For questions or issues, check the sync logs or review the code in `lib/services/blockchain-sync.ts`.
