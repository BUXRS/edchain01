# Fix: "Too Many Clients Already" Error

## Problem
PostgreSQL error: `"sorry, too many clients already"`

This happens when the application creates too many database connections instead of reusing a shared connection pool.

## Root Cause
Multiple files were creating separate `postgres` clients:
1. `lib/db.ts` - Creates one pool (max: 10)
2. `lib/services/auto-sync-worker.ts` - Created ANOTHER pool (max: 10)
3. Total: 20+ connections possible, exceeding PostgreSQL's default limit

## Fix Applied

### 1. ✅ Single Shared Connection Pool
- All code now uses the **SAME** connection pool from `lib/db.ts`
- Removed duplicate `postgres()` client creation in `auto-sync-worker.ts`
- Reduced pool size from 10 to 5 to be safer

### 2. ✅ Connection Pool Configuration
```typescript
postgres(url, {
  max: 5,                    // Maximum 5 connections in pool
  idle_timeout: 20,          // Close idle connections after 20s
  connect_timeout: 10,        // Connection timeout
  max_lifetime: 60 * 30,      // Close connections after 30 minutes
})
```

### 3. ✅ Graceful Shutdown
Added handlers to properly close connections on server shutdown.

## Immediate Actions Required

### Step 1: Restart PostgreSQL (if needed)
If connections are still stuck, you may need to restart PostgreSQL:

```powershell
# Windows - Restart PostgreSQL service
Restart-Service postgresql-x64-XX  # Replace XX with your version
```

### Step 2: Check Current Connections
Connect to PostgreSQL and check active connections:

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- See all connections
SELECT pid, usename, application_name, client_addr, state 
FROM pg_stat_activity 
WHERE datname = 'bubd';

-- Kill idle connections (if needed)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'bubd' 
  AND state = 'idle' 
  AND pid <> pg_backend_pid();
```

### Step 3: Increase PostgreSQL Max Connections (Optional)
If you need more connections, edit `postgresql.conf`:

```conf
max_connections = 100  # Default is usually 100
```

Then restart PostgreSQL.

### Step 4: Restart Your Application
After fixing the code:
1. Stop the Next.js server (Ctrl+C)
2. Wait a few seconds for connections to close
3. Restart: `npm run dev`

## Verification

After restart, check:
1. Visit `/api/debug/db-check` - Should work without connection errors
2. Check server logs - Should not see connection errors
3. Dashboard should load data correctly

## Prevention

- ✅ All code now uses `import { sql } from "@/lib/db"` 
- ✅ No duplicate `postgres()` client creation
- ✅ Single shared connection pool
- ✅ Proper connection lifecycle management
