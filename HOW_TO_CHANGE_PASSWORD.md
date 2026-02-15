# How to Change PostgreSQL Password - Step by Step

## 🎯 You're in the Wrong Dialog!

You're currently in the **"Group Role"** dialog. To change a password, you need to edit the **"postgres" user** instead.

---

## ✅ Correct Steps to Change Password

### Step 1: Close the Current Dialog
1. Click **"Close"** button in the Group Role dialog
2. You'll return to the main pgAdmin interface

### Step 2: Navigate to the postgres User
1. In the **left panel** (Object Explorer):
   - Expand **"PostgreSQL 18"** (your server)
   - Expand **"Login/Group Roles"**
   - You should see **"postgres"** listed

### Step 3: Open postgres User Properties
1. **Right-click** on **"postgres"** (the user, not a group role)
2. Select **"Properties"** from the menu

### Step 4: Change Password
1. A dialog will open with tabs at the top
2. Click on the **"Definition"** tab
3. You'll see password fields:
   - **Password**: Enter your new password here
   - **Password (again)**: Enter the same password again to confirm
4. Enter your desired password in both fields
5. Click **"Save"** button

### Step 5: Update Server Connection (Optional)
If you want to save this password for the server connection:
1. Right-click **"PostgreSQL 18"** server → **Properties**
2. Go to **"Connection"** tab
3. Toggle **"Save password?"** to ON
4. Enter your password
5. Click **"Save"**

---

## 📝 After Changing Password

### Step 1: Update .env.local File

Open your `.env.local` file and update line 20:

```env
DATABASE_URL=postgresql://postgres:YOUR_NEW_PASSWORD@localhost:5432/bubd
```

**Replace `YOUR_NEW_PASSWORD` with the password you just set.**

### Step 2: Test Connection

```bash
# Start your app
pnpm dev
```

Check the console - if there are no database errors, you're connected! ✅

---

## 🔍 Visual Guide: Where to Find postgres User

```
pgAdmin Left Panel:
├── Servers (1)
│   └── PostgreSQL 18
│       ├── Databases (2)
│       ├── Login/Group Roles  ← CLICK HERE
│       │   └── postgres       ← RIGHT-CLICK THIS
│       │       └── Properties  ← SELECT THIS
│       └── Tablespaces
```

---

## ⚠️ Important Notes

1. **Group Role vs Login Role:**
   - **Group Role**: For managing groups (what you're currently in)
   - **Login Role/User**: For individual users (what you need - "postgres")

2. **Password Requirements:**
   - Use a strong password
   - Remember it - you'll need it for your `.env.local` file
   - If password has special characters, you may need to URL-encode them in the connection string

3. **Special Characters in Password:**
   If your password contains special characters, encode them in the connection string:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`
   - `&` → `%26`

---

## 🐛 Troubleshooting

### Problem: Can't find "postgres" user
- Make sure you're looking under "Login/Group Roles"
- It might be listed as "postgres" or your username
- If you don't see it, you might need to connect as a superuser first

### Problem: "Permission denied"
- Make sure you're connected as a user with admin privileges
- Try connecting as the postgres superuser

### Problem: Password field is still inactive
- Make sure you're in the **"Definition"** tab
- You're editing a **Login Role**, not a Group Role
- Try right-clicking on "postgres" under "Login/Group Roles"

---

## 📋 Quick Checklist

- [ ] Closed Group Role dialog
- [ ] Navigated to Login/Group Roles → postgres
- [ ] Right-clicked postgres → Properties
- [ ] Went to Definition tab
- [ ] Entered new password (twice)
- [ ] Clicked Save
- [ ] Updated `.env.local` with new password
- [ ] Tested connection with `pnpm dev`

---

**Next:** Once you've changed the password, update your `.env.local` file and test the connection!
