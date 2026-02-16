# Database setup

One script recreates the full app schema (all tables, indexes, seed row): **`setup-database.js`**.  
It uses **`000-recreate-complete-database.sql`** and optionally creates the database when running locally.

## Commands (npm)

| Command | Use case |
|--------|----------|
| `npm run db:setup` | Run schema. Uses `DATABASE_URL` from env or `.env.local` / `.env`. For **production** set `DATABASE_URL` to Neon **DIRECT** URL in the shell first. |
| `npm run db:setup:local` | Run schema **against local** DB (same as above but allows localhost). **Drops all local tables and data.** |
| `npm run db:setup:local:create` | Same as `db:setup:local` but also **creates the database** if it doesn’t exist (local only). |
| `npm run db:setup:production` | Same as `db:setup`; you must set `DATABASE_URL` in the shell to your Neon DIRECT URL. |

## Examples

**Local – reset schema (DB must already exist):**
```powershell
npm run db:setup:local
```

**Local – create DB if missing, then apply schema:**
```powershell
npm run db:setup:local:create
```

**Production (Neon) – set DIRECT URL then run:**
```powershell
$env:DATABASE_URL="postgresql://user:pass@your-branch.neon.tech/neondb?sslmode=require"
npm run db:setup
# or: node scripts/run-production-schema.js
```

## Safety

- If `DATABASE_URL` points to **localhost** and you run `npm run db:setup` (without `:local`), the script **exits** and tells you to use `db:setup:local` or set a production URL.
- `run-production-schema.js` is a thin wrapper that calls `setup-database.js`; behavior is the same.

## What gets created

- All tables from `000-recreate-complete-database.sql`: universities, university_registrations, issuers, revokers, verifiers, degrees, degree_requests, degree_request_approvals, revocation_requests, revocation_request_approvals, pending_approvals, admin_users, activity_logs, sync_status (with one seed row), sync_logs, pending_transactions.
- Table **admin_notifications** (if not in the SQL file).
- All indexes and comments from the schema file.
