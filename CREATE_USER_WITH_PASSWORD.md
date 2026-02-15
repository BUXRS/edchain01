# Create PostgreSQL User with Password: BU@Blck2025

## 🎯 Step-by-Step: Create User with Your Password

### Step 1: Click "Login/Group Role..." (You're Already There!)

1. You have **"Login/Group Role..."** highlighted in the menu
2. **Click on it** to open the creation dialog

### Step 2: Fill in the User Details

A dialog will open. Fill it in like this:

#### **General Tab:**
- **Name**: `postgres` (or `app_user` if you prefer)
- **Comments**: Optional - "Main database user"

#### **Definition Tab:**
- **Password**: `BU@Blck2025`
- **Password (again)**: `BU@Blck2025` (enter again to confirm)
- **Can login?**: ✅ **Check this box** (very important!)
- **Password expiration**: Leave empty

#### **Privileges Tab:**
- ✅ **Can login?** - Make sure this is checked
- ✅ **Superuser** - Check this if you want full admin access
- ✅ **Create databases** - Check this
- ✅ **Create roles** - Check this

#### **Click "Save"**

---

## ⚠️ Important: Password Has Special Character!

Your password `BU@Blck2025` contains `@` which needs special handling in connection strings.

### For .env.local file, use URL-encoded version:

**Regular password:** `BU@Blck2025`  
**URL-encoded:** `BU%40Blck2025` (the `@` becomes `%40`)

---

## 📝 Update .env.local

After creating the user, update your `.env.local` file:

### If you created user named "postgres":
```env
DATABASE_URL=postgresql://postgres:BU%40Blck2025@localhost:5432/bubd
```

### If you created user named "app_user" (or other name):
```env
DATABASE_URL=postgresql://app_user:BU%40Blck2025@localhost:5432/bubd
```

**Note:** The `@` in password is encoded as `%40` in the connection string!

---

## ✅ Verify Connection

### Test 1: In pgAdmin
1. Right-click your server → **Properties** → **Connection** tab
2. Enter:
   - **Username**: `postgres` (or your user name)
   - **Password**: `BU@Blck2025`
   - ✅ Check **"Save password?"**
3. Click **"Save"**
4. Try connecting - should work!

### Test 2: From Your App
```bash
pnpm dev
```

Check console - no database errors = success! ✅

---

## 🔧 If User Already Exists

If you get an error "role already exists", you need to:

### Option A: Change Existing User Password
1. In Query Tool, run:
```sql
ALTER USER postgres WITH PASSWORD 'BU@Blck2025';
```

### Option B: Drop and Recreate
1. In Query Tool, run:
```sql
DROP USER IF EXISTS postgres;
CREATE USER postgres WITH PASSWORD 'BU@Blck2025' SUPERUSER CREATEDB CREATEROLE;
```

---

## 📋 Quick Checklist

- [ ] Clicked "Login/Group Role..."
- [ ] Filled in name (postgres or app_user)
- [ ] Entered password: BU@Blck2025 (twice)
- [ ] Checked "Can login?"
- [ ] Set privileges (Superuser, Create DB, etc.)
- [ ] Clicked Save
- [ ] Updated .env.local with URL-encoded password (BU%40Blck2025)
- [ ] Tested connection in pgAdmin
- [ ] Tested connection from app (pnpm dev)

---

## 🎯 Your Connection String

**For .env.local:**
```env
DATABASE_URL=postgresql://postgres:BU%40Blck2025@localhost:5432/bubd
```

**Remember:** `@` in password = `%40` in connection string!
