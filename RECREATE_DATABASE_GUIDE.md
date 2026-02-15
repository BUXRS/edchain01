# Complete Database Recreation Guide

This guide will help you recreate your entire database schema from scratch.

## ⚠️ **IMPORTANT WARNING**

**The recreation script will DROP ALL EXISTING TABLES AND DATA!**

Make sure you:
1. ✅ Have a backup of your database (if you need to preserve any data)
2. ✅ Are ready to lose all existing data
3. ✅ Have your `DATABASE_URL` environment variable configured

## 📋 **What This Script Creates**

The script recreates all 16 tables with complete schema:

1. **universities** - University records with blockchain sync support
2. **university_registrations** - Registration and onboarding tracking
3. **issuers** - Issuer wallets and information
4. **revokers** - Revoker wallets and information
5. **verifiers** - Verifier wallets and information
6. **degrees** - Degree records with blockchain verification
7. **degree_requests** - Pending degree issuance requests
8. **degree_request_approvals** - Verifier approvals for degree requests
9. **revocation_requests** - Pending revocation requests
10. **revocation_request_approvals** - Verifier approvals for revocations
11. **pending_approvals** - Wallet role approval requests
12. **admin_users** - Super admin users
13. **activity_logs** - Audit trail for all actions
14. **sync_status** - Blockchain sync progress tracking
15. **sync_logs** - Detailed sync operation logs
16. **pending_transactions** - Pending blockchain transactions

## 🚀 **How to Run the Script**

### **Option 1: Using psql (Command Line)**

```bash
# For PostgreSQL/Neon
psql $DATABASE_URL -f scripts/000-recreate-complete-database.sql

# Or with explicit connection
psql -U postgres -d your_database_name -f scripts/000-recreate-complete-database.sql
```

### **Option 2: Using pgAdmin**

1. Open pgAdmin
2. Connect to your database
3. Right-click on your database → **Query Tool**
4. Click **Open File** (or press Ctrl+O)
5. Select `scripts/000-recreate-complete-database.sql`
6. Click **Execute** (or press F5)

### **Option 3: Using Neon Console**

1. Go to your Neon project dashboard
2. Click on **SQL Editor**
3. Copy the entire contents of `scripts/000-recreate-complete-database.sql`
4. Paste into the SQL editor
5. Click **Run**

### **Option 4: Using Node.js Script**

If you prefer to run it programmatically:

```bash
node scripts/run-recreate-database.js
```

(You may need to create this script if it doesn't exist)

## ✅ **Verification**

After running the script, verify that all tables were created:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should return 16 tables:
-- activity_logs
-- admin_users
-- degree_request_approvals
-- degree_requests
-- degrees
-- issuers
-- pending_approvals
-- pending_transactions
-- revocation_request_approvals
-- revocation_requests
-- revokers
-- sync_logs
-- sync_status
-- university_registrations
-- universities
-- verifiers
```

## 🔍 **Check Specific Table Structure**

To verify a specific table was created correctly:

```sql
-- Check universities table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'universities'
ORDER BY ordinal_position;
```

## 📝 **Next Steps**

After recreating the database:

1. **Set up initial admin user** (if needed):
   ```sql
   INSERT INTO admin_users (clerk_user_id, email, name, is_super_admin)
   VALUES ('your-clerk-id', 'admin@example.com', 'Admin User', true);
   ```

2. **Verify sync status table**:
   ```sql
   SELECT * FROM sync_status;
   -- Should show: id=1, last_synced_block=0
   ```

3. **Test database connection**:
   ```bash
   node scripts/test-database-connection.js
   ```

4. **Start your application**:
   ```bash
   npm run dev
   ```

## 🆘 **Troubleshooting**

### Error: "relation already exists"
- The script uses `DROP TABLE IF EXISTS`, so this shouldn't happen
- If it does, manually drop tables or check for dependencies

### Error: "permission denied"
- Make sure your database user has CREATE and DROP permissions
- For Neon, use the connection string from your dashboard

### Error: "connection refused"
- Check your `DATABASE_URL` environment variable
- Verify your database is running and accessible

### Tables created but missing columns
- Check if the script ran completely (no errors)
- Compare with the expected schema in the script comments

## 📚 **Additional Resources**

- Original migration files are in `scripts/` directory
- Database connection code: `lib/db.ts`
- Migration guides: See `MIGRATION_TO_POSTGRESQL.md`

---

**Need Help?** Check the individual migration files in `scripts/` for more details on specific tables.
