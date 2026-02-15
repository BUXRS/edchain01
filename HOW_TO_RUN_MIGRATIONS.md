# How to Run SQL Migration Scripts on Windows

## 🎯 **Option 1: Using pgAdmin (Easiest - Recommended)**

### Steps:
1. **Open pgAdmin**
   - Launch pgAdmin from your Start menu or desktop

2. **Connect to Database**
   - Expand "Servers" in the left panel
   - Expand your PostgreSQL server
   - Expand "Databases"
   - Right-click on `bubd` database
   - Select "Query Tool"

3. **Open SQL Script**
   - In the Query Tool, click the folder icon (Open File) or press `Ctrl+O`
   - Navigate to: `C:\Users\USER\Desktop\vercel23126update\scripts\`
   - Select the script you want to run:
     - `023-fix-email-constraint.sql` (quick fix for email error)
     - `022-complete-sync-setup.sql` (complete sync setup - recommended)

4. **Execute Script**
   - Click the "Execute" button (play icon) or press `F5`
   - Wait for "Query returned successfully" message

5. **Verify**
   - Check the Messages tab for any errors
   - Should see "ALTER TABLE" or "CREATE TABLE" success messages

---

## 🎯 **Option 2: Using Command Prompt (PowerShell)**

### Prerequisites:
- PostgreSQL must be installed
- `psql` must be in your PATH

### Steps:

1. **Open PowerShell**
   - Press `Win + X` and select "Windows PowerShell" or "Terminal"
   - Or search for "PowerShell" in Start menu

2. **Navigate to Project Directory**
   ```powershell
   cd C:\Users\USER\Desktop\vercel23126update
   ```

3. **Run the Script**
   ```powershell
   # Quick fix for email error
   psql -U postgres -d bubd -f scripts\023-fix-email-constraint.sql
   
   # Complete sync setup (recommended)
   psql -U postgres -d bubd -f scripts\022-complete-sync-setup.sql
   ```

4. **Enter Password**
   - When prompted, enter your PostgreSQL password: `BU@Blck2025`
   - (Password is URL-encoded as `BU%40Blck2025` in connection string, but use `BU@Blck2025` when prompted)

### If psql is not found:
Add PostgreSQL to your PATH:
```powershell
# Find PostgreSQL installation (usually in Program Files)
# Then add to PATH, or use full path:
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d bubd -f scripts\023-fix-email-constraint.sql
```

---

## 🎯 **Option 3: Using VS Code / Cursor (If you have SQL extension)**

### Steps:

1. **Install SQL Extension** (if not already installed)
   - Open Extensions (Ctrl+Shift+X)
   - Search for "PostgreSQL" or "SQL Tools"
   - Install one of them

2. **Connect to Database**
   - Open Command Palette (Ctrl+Shift+P)
   - Type "PostgreSQL: Add Connection" or "SQL: Connect"
   - Enter connection details:
     - Host: `localhost`
     - Port: `5432`
     - Database: `bubd`
     - User: `postgres`
     - Password: `BU@Blck2025`

3. **Open and Run Script**
   - Open the SQL file: `scripts/023-fix-email-constraint.sql`
   - Right-click in the editor
   - Select "Run Query" or "Execute Query"
   - Or use the extension's execute button

---

## 🎯 **Option 4: Copy-Paste SQL Directly**

If you prefer, you can copy the SQL and paste it directly:

### Steps:

1. **Open pgAdmin Query Tool**
   - Follow Option 1, steps 1-2

2. **Open the SQL File**
   - Open `scripts/023-fix-email-constraint.sql` in Notepad or any text editor
   - Copy all the SQL code

3. **Paste and Execute**
   - Paste into pgAdmin Query Tool
   - Click Execute (F5)

---

## 📋 **Recommended Order**

Run these scripts in this order:

1. **First:** `023-fix-email-constraint.sql` (quick fix)
   - Fixes the immediate email constraint error

2. **Then:** `022-complete-sync-setup.sql` (complete setup)
   - Adds all missing columns and tables
   - Sets up everything for sync

**OR** just run `022-complete-sync-setup.sql` alone (it includes the email fix)

---

## ✅ **Verification After Running**

After running the scripts, verify they worked:

### In pgAdmin Query Tool, run:

```sql
-- Check if email is nullable
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'universities'
AND column_name = 'email';
-- Should show is_nullable = 'YES'

-- Check if admin_password_hash exists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'universities'
AND column_name = 'admin_password_hash';
-- Should return 1 row

-- Check if sync tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('sync_logs', 'pending_transactions', 'sync_status');
-- Should return 3 rows
```

---

## 🚨 **Troubleshooting**

### Error: "psql: command not found"
**Solution:** Use pgAdmin (Option 1) instead, or add PostgreSQL to PATH

### Error: "password authentication failed"
**Solution:** 
- Check your password is correct: `BU@Blck2025`
- Or check your `.env.local` file for the actual password

### Error: "database does not exist"
**Solution:**
- Verify database name is `bubd`
- Or check your `.env.local` for the correct database name

### Error: "permission denied"
**Solution:**
- Make sure you're using the `postgres` user
- Or use a user with sufficient privileges

---

## 🎬 **Quick Start (Easiest Method)**

1. Open **pgAdmin**
2. Right-click `bubd` database → **Query Tool**
3. Click **Open File** (folder icon)
4. Navigate to: `C:\Users\USER\Desktop\vercel23126update\scripts\`
5. Select: `022-complete-sync-setup.sql`
6. Click **Execute** (F5)
7. Done! ✅

This single script fixes everything.
