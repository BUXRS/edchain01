# How to Set Password in pgAdmin - Complete Guide

## 🎯 You're Almost There!

You have the "Login/Group Role..." option highlighted. Here are your options:

---

## Option 1: Change Existing postgres User Password (Recommended)

### Step 1: Cancel Current Action
1. Click outside the menu to close it
2. Or press ESC to cancel

### Step 2: Find Existing postgres User
1. In left panel, expand **"PostgreSQL"** server
2. Expand **"Login/Group Roles"**
3. You should see **"postgres"** listed there

### Step 3: Edit postgres User
1. **Right-click** on **"postgres"** (the existing user)
2. Select **"Properties"**

### Step 4: Change Password
1. Click on **"Definition"** tab
2. Enter your new password in **"Password"** field
3. Enter it again in **"Password (again)"** field
4. Click **"Save"**

---

## Option 2: Create New User (Alternative)

If you prefer to create a new user instead of using postgres:

### Step 1: Create New Login Role
1. With **"Login/Group Role..."** highlighted, click it
2. A dialog will open

### Step 2: Fill in User Details
1. **General Tab:**
   - **Name**: `app_user` (or any name you prefer)
   - **Comments**: Optional description

2. **Definition Tab:**
   - **Password**: Enter your password
   - **Password (again)**: Enter again to confirm
   - **Can login?**: Make sure this is checked ✅
   - **Password expiration**: Leave empty (or set a date)

3. **Privileges Tab:**
   - Check **"Can login?"** ✅
   - Check other privileges as needed

4. Click **"Save"**

### Step 3: Grant Permissions
After creating the user, you need to grant permissions:

1. In pgAdmin Query Tool, run:
```sql
GRANT ALL PRIVILEGES ON DATABASE bubd TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

---

## 📝 After Setting Password

### Update .env.local File

**If using postgres user:**
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/bubd
```

**If using new user (e.g., app_user):**
```env
DATABASE_URL=postgresql://app_user:YOUR_PASSWORD@localhost:5432/bubd
```

### Test Connection
```bash
pnpm dev
```

---

## 🎯 Quick Decision Guide

**Use Option 1 (Edit postgres) if:**
- ✅ You want to use the default postgres user
- ✅ You just need to set/change the password
- ✅ You want the simplest solution

**Use Option 2 (Create new user) if:**
- ✅ You want a separate user for your application
- ✅ You want better security (not using postgres superuser)
- ✅ You prefer application-specific credentials

---

## ⚠️ Important Notes

1. **Password Requirements:**
   - Use a strong password
   - Remember it - you'll need it for `.env.local`
   - If it has special characters, URL-encode them in connection string

2. **Special Characters:**
   If password contains: `@ # $ % &`
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`
   - `&` → `%26`

3. **Connection String Format:**
   ```
   postgresql://username:password@host:port/database
   ```

---

## 📋 Checklist

**For Option 1:**
- [ ] Found postgres under Login/Group Roles
- [ ] Right-clicked → Properties
- [ ] Went to Definition tab
- [ ] Entered password (twice)
- [ ] Clicked Save
- [ ] Updated `.env.local`
- [ ] Tested connection

**For Option 2:**
- [ ] Clicked "Login/Group Role..."
- [ ] Filled in name and password
- [ ] Set "Can login?" to true
- [ ] Clicked Save
- [ ] Granted permissions via SQL
- [ ] Updated `.env.local`
- [ ] Tested connection

---

**Recommendation:** Use **Option 1** (edit existing postgres user) - it's simpler and faster!
