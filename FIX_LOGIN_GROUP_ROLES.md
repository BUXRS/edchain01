# Can't Find Login/Group Roles? Here's How to Fix It

## 🔍 Problem: Login/Group Roles Not Visible

If you can't see "Login/Group Roles" in pgAdmin, here are solutions:

---

## ✅ Solution 1: Make Sure You're Connected

### Step 1: Check Server Connection
1. In left panel, look for **"PostgreSQL"** or **"PostgreSQL 18"**
2. Is there a **red X** or error icon next to it?
3. If yes, you need to connect first:
   - **Right-click** on the server
   - Select **"Connect Server"**
   - Enter password if prompted
   - Wait for connection to establish

### Step 2: Expand Server Properly
1. Click the **arrow (▶)** next to your server to expand it
2. You should see:
   - Databases
   - Login/Group Roles ← Should be here!
   - Tablespaces
   - etc.

---

## ✅ Solution 2: Connect as Superuser

If you still don't see it, you might need to connect with proper permissions:

### Step 1: Check Current Connection
1. Right-click on your server → **Properties**
2. Go to **"Connection"** tab
3. Check the **Username** - it should be `postgres` or a superuser

### Step 2: Reconnect with postgres User
1. **Right-click** server → **"Disconnect Server"**
2. **Right-click** server → **"Connect Server"**
3. Enter password for `postgres` user
4. After connecting, expand server again
5. "Login/Group Roles" should now be visible

---

## ✅ Solution 3: Use SQL to Change Password (Alternative Method)

If you can't access Login/Group Roles, you can change the password directly via SQL:

### Step 1: Open Query Tool
1. In left panel, expand your server
2. Expand **"Databases"**
3. Expand **"bubd"** (or any database)
4. **Right-click** on **"bubd"** → **"Query Tool"**

### Step 2: Run SQL Command
In the Query Tool, paste and run this SQL:

```sql
-- Change postgres user password
ALTER USER postgres WITH PASSWORD 'your_new_password_here';
```

**Replace `your_new_password_here` with your actual password!**

### Step 3: Execute
1. Click **"Execute"** button (▶) or press **F5**
2. You should see: "ALTER ROLE" - success message

### Step 4: Update .env.local
```env
DATABASE_URL=postgresql://postgres:your_new_password_here@localhost:5432/bubd
```

---

## ✅ Solution 4: Create New User via SQL

If you can't find Login/Group Roles, create a user directly:

### Step 1: Open Query Tool
1. Right-click on **"bubd"** database → **"Query Tool"**

### Step 2: Create User
Run this SQL:

```sql
-- Create new user for your app
CREATE USER app_user WITH PASSWORD 'your_secure_password';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE bubd TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### Step 3: Update .env.local
```env
DATABASE_URL=postgresql://app_user:your_secure_password@localhost:5432/bubd
```

---

## ✅ Solution 5: Check PostgreSQL Version/Installation

Sometimes Login/Group Roles might be in a different location:

### For PostgreSQL 10 and below:
- Look for **"Roles"** instead of "Login/Group Roles"

### For PostgreSQL 11+:
- Should be **"Login/Group Roles"**

### Check Your Version:
1. Right-click server → **Properties** → **"General"** tab
2. Check the **"Server"** version number

---

## 🔧 Alternative: Use psql Command Line

If pgAdmin isn't working, use command line:

### Windows:
1. Open **Command Prompt** or **PowerShell**
2. Navigate to PostgreSQL bin:
   ```bash
   cd "C:\Program Files\PostgreSQL\18\bin"
   ```
3. Run:
   ```bash
   psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'your_password';"
   ```

### macOS/Linux:
```bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'your_password';"
```

---

## 📋 Quick Troubleshooting Checklist

- [ ] Server is connected (no red X)
- [ ] Server is fully expanded
- [ ] Connected as postgres user or superuser
- [ ] PostgreSQL version is correct
- [ ] Tried reconnecting to server
- [ ] Tried SQL method (ALTER USER)
- [ ] Tried command line method

---

## 🎯 Recommended: Use SQL Method (Easiest!)

**If Login/Group Roles is not visible, use SQL:**

1. **Open Query Tool:**
   - Right-click **"bubd"** database → **"Query Tool"**

2. **Run this SQL:**
   ```sql
   ALTER USER postgres WITH PASSWORD 'your_new_password';
   ```

3. **Update .env.local:**
   ```env
   DATABASE_URL=postgresql://postgres:your_new_password@localhost:5432/bubd
   ```

4. **Test:**
   ```bash
   pnpm dev
   ```

This method works even if Login/Group Roles is not visible!

---

## 🐛 Still Having Issues?

### Check These:
1. **Are you connected to the server?**
   - Look for connection status in pgAdmin
   - Try disconnecting and reconnecting

2. **Do you have permissions?**
   - Make sure you're connecting as a superuser
   - Try connecting as `postgres` user

3. **Is PostgreSQL running?**
   - Check Windows Services
   - Make sure PostgreSQL service is started

4. **Try refreshing:**
   - Right-click server → **"Refresh"**
   - Or press F5

---

**Best Solution:** Use the **SQL method** (Solution 3) - it works regardless of whether Login/Group Roles is visible!
