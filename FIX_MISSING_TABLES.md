# Fix Missing Tables - Quick Guide

You currently have **5 tables** but need **8 tables**. Here's how to add the missing ones:

## 🔍 Current Status

**You have (5 tables):**
- ✅ activity_logs
- ✅ degrees
- ✅ issuers
- ✅ revokers
- ✅ universities

**Missing (3 tables):**
- ❌ admin_users
- ❌ pending_approvals
- ❌ university_registrations

---

## 🚀 Quick Fix: Create Missing Tables

### Option 1: Run the Missing Tables Script (Easiest)

1. **In pgAdmin Query Tool:**
   - Make sure you're connected to the `bubd` database
   - Click **"Open File"** icon (📁 folder)
   - Navigate to: `c:\Users\USER\Desktop\vercel23126update\scripts\`
   - Open: **`create-missing-tables.sql`**
   - Click **"Execute"** (▶) or press **F5**

2. **Verify:**
   - In left panel, expand: `bubd` → `Schemas` → `public` → `Tables`
   - You should now see **8 tables** total

### Option 2: Run All Scripts Again (Complete Setup)

If you want to ensure everything is set up correctly:

1. **Run Script 1:**
   - Open: `scripts/001-create-schema.sql`
   - Execute (F5)
   - This creates: admin_users, pending_approvals, and other tables

2. **Run Script 2:**
   - Open: `scripts/002-add-missing-fields.sql`
   - Execute (F5)
   - This creates: university_registrations and adds missing fields

3. **Run Script 3:**
   - Open: `scripts/add-onboarding-fields.sql`
   - Execute (F5)
   - This adds onboarding fields to existing tables

---

## ✅ After Creating Tables

### Step 1: Verify All Tables Exist

In pgAdmin left panel:
- Expand `bubd` → `Schemas` → `public` → `Tables`
- You should see **8 tables**:
  1. ✅ admin_users
  2. ✅ activity_logs
  3. ✅ degrees
  4. ✅ issuers
  5. ✅ pending_approvals
  6. ✅ revokers
  7. ✅ universities
  8. ✅ university_registrations

### Step 2: Get Connection String

1. Right-click **"PostgreSQL 18"** → **Properties** → **Connection** tab
2. Note: Host, Port, Username
3. Your connection string format:
   ```
   postgresql://postgres:[PASSWORD]@localhost:5432/bubd
   ```

### Step 3: Update .env.local

Open `.env.local` and update line 20:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/bubd
```

Replace `your_password` with your actual PostgreSQL password.

### Step 4: Test Connection

```bash
# Install dependencies
pnpm install

# Start the app
pnpm dev
```

Check console - no database errors = success! ✅

---

## 🐛 If Tables Already Exist

If you see errors like "relation already exists", that's OK! The `IF NOT EXISTS` clause means:
- ✅ Tables that don't exist will be created
- ✅ Tables that already exist will be skipped
- ✅ No harm in running the script multiple times

---

## 📋 Quick Checklist

- [ ] Run `create-missing-tables.sql` OR run all 3 scripts
- [ ] Verify 8 tables exist in pgAdmin
- [ ] Get connection string from pgAdmin
- [ ] Update `.env.local` with DATABASE_URL
- [ ] Test connection with `pnpm dev`

---

**Next:** Once all 8 tables exist, update your `.env.local` and test the connection!
