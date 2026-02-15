# Quick Start Guide

Get your University Degree Protocol app running in 5 minutes!

## ✅ Prerequisites Check

- [x] Node.js 18+ installed
- [x] `.env.local` file configured (already done!)
- [x] Neon database URL (already configured!)
- [x] Stripe keys (already configured!)

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Setup Database

Run the database setup script:

```bash
pnpm run setup:db
```

This will:
- ✅ Create all required tables
- ✅ Add missing fields
- ✅ Set up indexes
- ✅ Verify the setup

**Alternative:** If the script doesn't work, run SQL files manually in Neon console:
1. Go to https://console.neon.tech
2. Open SQL Editor
3. Run these files in order:
   - `scripts/001-create-schema.sql`
   - `scripts/002-add-missing-fields.sql`
   - `scripts/add-onboarding-fields.sql`

### Step 3: Create Admin Account & Start App

```bash
# Create admin account (run once)
curl http://localhost:3000/api/auth/setup

# Start the development server
pnpm dev
```

**Default Admin Credentials** (from auto-setup):
- Email: `admin@university-protocol.com`
- Password: `admin`
- ⚠️ **Change this password immediately after first login!**

## 🎯 Access Points

Once running, access:

- **Homepage:** http://localhost:3000
- **Admin Login:** http://localhost:3000/admin/login
- **University Login:** http://localhost:3000/university/login
- **Issuer Login:** http://localhost:3000/issuer/login
- **Revoker Login:** http://localhost:3000/revoker/login
- **Subscribe:** http://localhost:3000/subscribe

## 🔧 Troubleshooting

### Database Connection Error

```bash
# Test connection
node -e "const {neon}=require('@neondatabase/serverless');neon(process.env.DATABASE_URL)\`SELECT NOW()\`.then(r=>console.log('✓ Connected')).catch(e=>console.error('✗',e.message))"
```

### Missing Tables

Run the setup script again:
```bash
pnpm run setup:db
```

### Port Already in Use

Change the port:
```bash
pnpm dev -- -p 3001
```

## 📚 Next Steps

1. **Change Admin Password** - Login and update your password
2. **Configure Stripe Webhook** - For production, set up webhook endpoint
3. **Add Resend API Key** (optional) - For email functionality
4. **Read Full Setup Guide** - See `SETUP.md` for detailed instructions

## 🆘 Need Help?

Check `SETUP.md` for:
- Detailed database setup instructions
- Environment variable explanations
- Production deployment guide
- Troubleshooting tips
