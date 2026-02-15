# Reset PostgreSQL Password - Step by Step

Your PostgreSQL password is inactive or not working. Here's how to fix it:

## 🔧 Method 1: Reset Password via pgAdmin (Easiest)

### Step 1: Connect to PostgreSQL Server
1. In pgAdmin, if you're already connected, skip to Step 2
2. If not connected:
   - Right-click **"Servers"** → **Create** → **Server**
   - Use a different user or try connecting without password first

### Step 2: Change Password for postgres User
1. In left panel, expand **"PostgreSQL 18"**
2. Expand **"Login/Group Roles"**
3. Right-click on **"postgres"** user
4. Select **"Properties"**
5. Go to **"Definition"** tab
6. Enter a **new password** in the "Password" field
7. Enter it again in "Password (again)" field
8. Click **"Save"**

### Step 3: Update Connection String
1. Open your `.env.local` file
2. Update the `DATABASE_URL` with your new password:
   ```env
   DATABASE_URL=postgresql://postgres:NEW_PASSWORD@localhost:5432/bubd
   ```
3. Save the file

---

## 🔧 Method 2: Reset Password via Command Line (Windows)

### Step 1: Open Command Prompt as Administrator
1. Press `Windows Key + X`
2. Select **"Windows PowerShell (Admin)"** or **"Command Prompt (Admin)"**
3. Click **"Yes"** if prompted by UAC

### Step 2: Navigate to PostgreSQL bin directory
```bash
cd "C:\Program Files\PostgreSQL\18\bin"
```
*(Adjust version number if different - could be 15, 16, 17, etc.)*

### Step 3: Reset Password
```bash
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'your_new_password';"
```

You'll be prompted for the current password. If you don't know it, use Method 3.

---

## 🔧 Method 3: Reset Password via pg_hba.conf (If you forgot password)

### Step 1: Find pg_hba.conf File
**Windows:**
```
C:\Program Files\PostgreSQL\18\data\pg_hba.conf
```

**macOS:**
```
/usr/local/var/postgres/pg_hba.conf
```

**Linux:**
```
/etc/postgresql/18/main/pg_hba.conf
```

### Step 2: Edit pg_hba.conf
1. **Important:** Make a backup first!
2. Open the file in a text editor (as Administrator)
3. Find the line that looks like:
   ```
   host    all             all             127.0.0.1/32            scram-sha-256
   ```
4. Change `scram-sha-256` to `trust`:
   ```
   host    all             all             127.0.0.1/32            trust
   ```
5. Save the file

### Step 3: Restart PostgreSQL Service
**Windows:**
1. Press `Windows Key + R`
2. Type: `services.msc`
3. Find **"PostgreSQL"** service
4. Right-click → **Restart**

**macOS:**
```bash
brew services restart postgresql
```

**Linux:**
```bash
sudo systemctl restart postgresql
```

### Step 4: Connect and Reset Password
1. Open pgAdmin
2. Connect to server (no password needed now)
3. Follow **Method 1, Step 2** to change password
4. **Important:** Change `trust` back to `scram-sha-256` in pg_hba.conf
5. Restart PostgreSQL service again

---

## 🔧 Method 4: Use a Different User (Quick Workaround)

If you can't reset the postgres password, create a new user:

### Step 1: Connect to PostgreSQL
- Use pgAdmin or command line
- Connect as any user that works

### Step 2: Create New User
In pgAdmin Query Tool, run:
```sql
CREATE USER app_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bubd TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### Step 3: Update Connection String
```env
DATABASE_URL=postgresql://app_user:your_secure_password@localhost:5432/bubd
```

---

## ✅ After Resetting Password

### Step 1: Update .env.local
```env
DATABASE_URL=postgresql://postgres:YOUR_NEW_PASSWORD@localhost:5432/bubd
```

### Step 2: Test Connection
```bash
# Test from command line
psql -h localhost -U postgres -d bubd
# Enter your new password when prompted

# Or test from your app
pnpm dev
```

### Step 3: Verify in pgAdmin
1. Right-click server → **Properties** → **Connection**
2. Update password if needed
3. Click **"Save"**
4. Try connecting

---

## 🐛 Troubleshooting

### Problem: "Password authentication failed"
- Make sure you're using the correct password
- Check if password has special characters (may need URL encoding)
- Try resetting password again

### Problem: "Connection refused"
- PostgreSQL service might not be running
- Check services and start PostgreSQL

### Problem: Can't edit pg_hba.conf
- Make sure you're running as Administrator
- Check file permissions

### Problem: "User does not exist"
- Create a new user (Method 4)
- Or use existing user

---

## 🔐 Password Best Practices

- Use a strong password (mix of letters, numbers, symbols)
- Don't use spaces in passwords for connection strings
- If password has special characters, URL-encode them:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`
  - `&` → `%26`

---

## 📝 Quick Reference

**Connection String Format:**
```
postgresql://username:password@host:port/database
```

**Example:**
```
postgresql://postgres:mypassword123@localhost:5432/bubd
```

**With Special Characters:**
If password is `my@pass#123`:
```
postgresql://postgres:my%40pass%23123@localhost:5432/bubd
```

---

**Recommended:** Use **Method 1** (pgAdmin) as it's the easiest and safest way to reset your password.
