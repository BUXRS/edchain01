# Database Rebuild Guide

If you've lost your database tables, run this to rebuild everything from scratch.

## Quick Rebuild

```bash
node scripts/recreate-database.js
```

**Requirements:**
- `DATABASE_URL` must be set in `.env.local` (e.g. `postgresql://user:password@host:port/database`)
- Node.js with `postgres` package (already in project dependencies)

## What Gets Created

The script runs `REBUILD_DATABASE_COMPLETE.sql` which creates **17 tables**:

| Table | Purpose |
|-------|---------|
| universities | Registered universities with blockchain sync |
| university_registrations | Onboarding and subscription tracking |
| issuers | Issuer roles per university (onboarding flow) |
| revokers | Revoker roles per university |
| verifiers | Verifier roles per university |
| degrees | Issued degree records |
| degree_requests | Pending degree issuance requests |
| degree_request_approvals | Verifier approvals for degree requests |
| revocation_requests | Pending revocation requests |
| revocation_request_approvals | Verifier approvals for revocations |
| pending_approvals | Wallet role requests |
| admin_users | Super admin accounts |
| activity_logs | Audit trail |
| sync_status | Blockchain indexer state |
| sync_logs | Sync operation logs |
| pending_transactions | Pending blockchain txs |
| chain_events | Immutable blockchain event log |

## Important Columns Included

- **universities**: `name_en`, `admin_wallet`, `blockchain_id`, `is_deleted`, deletion fields
- **sync_status**: `finalized_block`, `sync_mode`, `confirmation_depth`, etc.
- **issuers/revokers/verifiers**: Full onboarding fields (name, email, password_hash, onboarding_token, etc.)

## After Rebuild

1. **Create Super Admin** (if needed):
   ```bash
   curl -X POST http://localhost:3000/api/auth/setup \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"your-password","name":"Admin","setupKey":"YOUR_ADMIN_SETUP_KEY"}'
   ```
   Set `ADMIN_SETUP_KEY` in `.env.local` first.

2. **Start the app**: `pnpm dev`

3. **Re-sync from blockchain** (if you have existing on-chain data): Use the admin sync tools at `/admin/sync`.
