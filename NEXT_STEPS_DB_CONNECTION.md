# Next Steps: Connect Your Database to the App

You're already connected to PostgreSQL in pgAdmin! Here's what to do next:

## ✅ What You've Done So Far
- ✅ Connected to PostgreSQL 18 in pgAdmin
- ✅ Created/accessed `bubd` database
- ✅ Started running SQL scripts

## 📋 Step-by-Step: Complete Database Setup

### Step 1: Finish Running All SQL Scripts

You need to run **3 SQL scripts** in order. I can see you've started, but let's make sure all are complete:

#### Script 1: Create Main Schema
1. In pgAdmin Query Tool (where you are now)
2. Click **"Open File"** icon (📁 folder icon in toolbar)
3. Navigate to: `c:\Users\USER\Desktop\vercel23126update\scripts\`
4. Open: **`001-create-schema.sql`**
5. Click **"Execute"** (▶) or press **F5**
6. Wait for "Query returned successfully"

#### Script 2: Add Missing Fields
1. Still in Query Tool, click **"Open File"** again
2. Open: **`002-add-missing-fields.sql`**
3. Click **"Execute"** (▶) or press **F5**
4. Wait for success message

#### Script 3: Add Onboarding Fields
1. Click **"Open File"** again
2. Open: **`add-onboarding-fields.sql`**
3. Click **"Execute"** (▶) or press **F5**
4. Wait for success message

### Step 2: Verify Tables Were Created

1. In the **left panel** (Object Explorer):
   - Expand **"bubd"** database
   - Expand **"Schemas"**
   - Expand **"public"**
   - Expand **"Tables"**

2. You should see these **8 tables**:
   - ✅ `admin_users`
   - ✅ `activity_logs`
   - ✅ `degrees`
   - ✅ `issuers`
   - ✅ `pending_approvals`
   - ✅ `revokers`
   - ✅ `universities`
   - ✅ `university_registrations`

If you see all 8 tables, your database is set up correctly! 🎉

---

## 🔌 Step 3: Get Connection String from pgAdmin

### Method 1: From Server Properties (Recommended)

1. In **left panel**, right-click on **"PostgreSQL 18"** (your server)
2. Select **"Properties"**
3. Click on **"Connection"** tab
4. You'll see:
   - **Host**: `localhost` (or your server address)
   - **Port**: `5432` (usually)
   - **Username**: `postgres` (or your username)
   - **Maintenance database**: `postgres`

5. **Note these values down**

### Method 2: From Current Connection

Looking at your Query Tool tab, I can see:
- Database: `bubd`
- User: `postgres@PostgreSQL 18`

So your connection details are likely:
- Host: `localhost`
- Port: `5432`
- Username: `postgres`
- Database: `bubd`
- Password: (the one you used to connect)

---

## 📝 Step 4: Update .env.local File

1. Open your `.env.local` file in your editor
2. Find the `DATABASE_URL` line (around line 12)
3. Replace it with your PostgreSQL connection string

### Connection String Format:
```
postgresql://[username]:[password]@[host]:[port]/[database]
```

### Example (for local PostgreSQL):
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/bubd
```

**⚠️ Important:** 
- Replace `your_password` with your actual PostgreSQL password
- If your password has special characters, you may need to URL-encode them
- Keep the format exactly as shown

### If Your Password Has Special Characters:

Special characters that need encoding:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- `&` becomes `%26`
- `:` becomes `%3A`
- `/` becomes `%2F`
- `?` becomes `%3F`
- `=` becomes `%3D`

**Example:**
If your password is `my@pass#123`, use:
```
postgresql://postgres:my%40pass%23123@localhost:5432/bubd
```

---

## ✅ Step 5: Test the Connection

### Test 1: From Terminal/Command Prompt

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d bubd
```

Enter your password when prompted. If you connect successfully, you're good!

### Test 2: From Your App

1. Make sure `.env.local` is updated with correct `DATABASE_URL`
2. Install dependencies (if not done):
   ```bash
   pnpm install
   ```
3. Start your app:
   ```bash
   pnpm dev
   ```
4. Check the console output:
   - ✅ No database errors = Success!
   - ❌ Connection errors = Check your connection string

---

## 🔍 Step 6: Verify Connection in App

Once your app is running:

1. Visit: http://localhost:3000
2. The app should load without database errors
3. Try accessing admin panel: http://localhost:3000/admin/login
4. If pages load, your database is connected! ✅

---

## 🐛 Troubleshooting

### Problem: "Connection refused" or "Can't connect"

**Check:**
1. PostgreSQL service is running:
   - **Windows**: Services → PostgreSQL → Start
   - **macOS**: `brew services start postgresql`
   - **Linux**: `sudo systemctl start postgresql`

2. Connection string is correct in `.env.local`
3. Password is correct (no typos)
4. Database `bubd` exists

### Problem: "Database does not exist"

**Solution:**
- Make sure database name in connection string matches: `bubd`
- Or create the database if it doesn't exist

### Problem: "Password authentication failed"

**Solutions:**
1. Double-check your password
2. Try resetting PostgreSQL password
3. Make sure username is correct (usually `postgres`)

### Problem: "Relation does not exist" (table errors)

**Solution:**
- Make sure you ran all 3 SQL scripts
- Check that all 8 tables exist in pgAdmin
- Re-run the SQL scripts if needed

---

## 📋 Quick Checklist

- [ ] All 3 SQL scripts executed successfully
- [ ] All 8 tables visible in pgAdmin
- [ ] Connection details noted (host, port, username, database)
- [ ] `.env.local` updated with `DATABASE_URL`
- [ ] Password correctly formatted in connection string
- [ ] PostgreSQL service is running
- [ ] App starts without database errors
- [ ] Can access admin panel

---

## 🎯 Your Current Status

Based on your pgAdmin screenshot:
- ✅ Connected to PostgreSQL 18
- ✅ Database `bubd` exists
- ✅ Query Tool is open
- ⏳ Need to: Complete SQL scripts → Get connection string → Update .env.local

---

## 💡 Quick Connection String Template

Copy this and fill in your password:

```env
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@localhost:5432/bubd
```

Replace `[YOUR_PASSWORD]` with your actual password.

---

**Next Action:** 
1. Finish running the SQL scripts in pgAdmin
2. Get your connection details
3. Update `.env.local` with the connection string
4. Test the connection!

Need help with any specific step? Let me know! 🚀
