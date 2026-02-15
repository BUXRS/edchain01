# University Degree Protocol - Setup Guide

Complete setup guide to get the application running.

## Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- Neon PostgreSQL database (or local PostgreSQL)
- Stripe account (for payments)
- Resend account (optional, for emails)

## Step 1: Install Dependencies

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install project dependencies
pnpm install
```

## Step 2: Environment Variables

Your `.env.local` file should already be configured with:
- ✅ DATABASE_URL
- ✅ JWT_SECRET
- ✅ PASSWORD_SALT
- ✅ Stripe keys
- ✅ Stripe webhook secret

**Optional:**
- RESEND_API_KEY (for email functionality)

## Step 3: Database Setup

### Option A: Using Neon Console (Recommended)

1. Go to your Neon dashboard: https://console.neon.tech
2. Open the SQL Editor
3. Run the following SQL scripts in order:

```sql
-- 1. Create main schema
-- Copy and paste contents of: scripts/001-create-schema.sql

-- 2. Add missing fields
-- Copy and paste contents of: scripts/002-add-missing-fields.sql

-- 3. Add onboarding fields
-- Copy and paste contents of: scripts/add-onboarding-fields.sql
```

### Option B: Using Command Line (psql)

```bash
# Connect to your Neon database
psql "postgresql://neondb_owner:npg_gF5j0AucepJx@ep-super-shadow-ahl06uqi-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Run scripts
\i scripts/001-create-schema.sql
\i scripts/002-add-missing-fields.sql
\i scripts/add-onboarding-fields.sql
```

### Option C: Using Node.js Script (Alternative)

Create a temporary script to run the SQL files:

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const files = [
    'scripts/001-create-schema.sql',
    'scripts/002-add-missing-fields.sql',
    'scripts/add-onboarding-fields.sql'
  ];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const statements = content.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql(statement + ';');
          console.log('✓ Executed:', statement.substring(0, 50) + '...');
        } catch (err) {
          console.error('✗ Error:', err.message);
        }
      }
    }
  }
}

run();
"
```

## Step 4: Create Initial Admin Account

After the database is set up, create your first admin account:

### Option A: Using the Setup API

```bash
# Make a POST request to the setup endpoint
curl -X POST http://localhost:3000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university-protocol.com",
    "password": "your-secure-password",
    "name": "Super Admin",
    "setupKey": "university-protocol-setup-2024"
  }'
```

### Option B: Using the Auto-Setup Endpoint (Development Only)

```bash
# Visit in browser or use curl
curl http://localhost:3000/api/auth/setup
```

This will create a demo admin with:
- Email: `admin@university-protocol.com`
- Password: `admin`
- **⚠️ Change this password immediately after first login!**

## Step 5: Run the Application

```bash
# Development mode
pnpm dev

# The app will be available at: http://localhost:3000
```

## Step 6: Verify Setup

1. **Check Database Connection:**
   - Visit: http://localhost:3000
   - The app should load without database errors

2. **Test Admin Login:**
   - Go to: http://localhost:3000/admin/login
   - Login with your admin credentials

3. **Check Stripe Integration:**
   - Visit: http://localhost:3000/subscribe
   - Should show subscription plans

4. **Verify Blockchain Connection:**
   - The app uses Base L2 (Chain ID: 8453)
   - Contract addresses are configured in `.env.local`

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT NOW()\`.then(r => console.log('✓ Connected:', r[0])).catch(e => console.error('✗ Error:', e.message));
"
```

### Missing Tables Error

If you see "relation does not exist" errors:
1. Check that all SQL scripts ran successfully
2. Verify tables exist: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

### Stripe Webhook Issues

For local development, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook secret and update `.env.local`.

### Email Not Working

If emails aren't sending:
- Check `RESEND_API_KEY` is set in `.env.local`
- The app will work without emails, but email features will be disabled

## Next Steps

1. **Configure Stripe Webhook** (if not done):
   - Production: https://dashboard.stripe.com/webhooks
   - Local: Use Stripe CLI

2. **Set up Resend** (optional):
   - Get API key from: https://resend.com/api-keys
   - Add to `.env.local`

3. **Deploy to Production:**
   - Update `NEXT_PUBLIC_APP_URL` in `.env.local`
   - Configure production Stripe keys
   - Set up production database

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure database schema is complete
4. Check that all dependencies are installed
