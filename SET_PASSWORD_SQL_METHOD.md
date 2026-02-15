# Set Password Using SQL (When Toggle Won't Work)

## 🎯 Problem: Can't Toggle "Save password?" Switch

If the toggle switch won't turn ON, don't worry! Use SQL instead - it's actually easier and more reliable.

---

## ✅ Solution: Use SQL to Set Password

### Step 1: Open Query Tool
1. In pgAdmin left panel:
   - Expand **"PostgreSQL 18"** (your server)
   - Expand **"Databases"**
   - Expand **"bubd"**
   - **Right-click** on **"bubd"**
   - Select **"Query Tool"**

### Step 2: Run SQL Command
In the Query Tool, paste this SQL:

```sql
ALTER USER postgres WITH PASSWORD 'BU@Blck2025';
```

### Step 3: Execute
1. Click **"Execute"** button (▶) in the toolbar
2. Or press **F5** on your keyboard
3. You should see: **"ALTER ROLE"** - success message

**That's it! Password is now set!** ✅

---

## ✅ Verify Password Works

### Test 1: Close and Reopen Server Connection
1. **Right-click** on **"PostgreSQL 18"** server
2. Select **"Disconnect Server"**
3. **Right-click** again → **"Connect Server"**
4. When prompted for password, enter: `BU@Blck2025`
5. Should connect successfully!

### Test 2: Update Server Properties (Optional)
1. **Right-click** server → **Properties** → **Connection** tab
2. Even if toggle doesn't work, you can:
   - Enter password when connecting manually
   - The SQL method already set it, so it will work

### Test 3: Test from Your App
```bash
pnpm dev
```

Check console - no database errors = success! ✅

---

## 📝 Your .env.local is Ready

Your `.env.local` file already has the correct connection string:
```env
DATABASE_URL=postgresql://postgres:BU%40Blck2025@localhost:5432/bubd
```

**Note:** The `@` in password is encoded as `%40` in connection string.

---

## 🎯 Why SQL Method is Better

✅ **Works every time** - No toggle switches needed  
✅ **Direct database command** - Changes password immediately  
✅ **No UI issues** - Doesn't depend on pgAdmin interface  
✅ **Faster** - One command and done  

---

## 🔧 Alternative: Try Different Connection Method

If you still want to use the UI:

### Method 1: Disconnect and Reconnect
1. **Disconnect** the server
2. **Reconnect** - you'll be prompted for password
3. Enter: `BU@Blck2025`
4. Check "Save password?" during connection

### Method 2: Create New Server Connection
1. **Right-click** "Servers" → **Create** → **Server**
2. Fill in connection details
3. Check "Save password?" when creating new connection
4. Enter password: `BU@Blck2025`

---

## 📋 Quick Checklist

- [ ] Opened Query Tool (right-click "bubd" → Query Tool)
- [ ] Ran SQL: `ALTER USER postgres WITH PASSWORD 'BU@Blck2025';`
- [ ] Saw "ALTER ROLE" success message
- [ ] Tested connection (disconnect/reconnect)
- [ ] Tested from app (`pnpm dev`)

---

## ✅ Summary

**Don't worry about the toggle!** The SQL method is:
- ✅ More reliable
- ✅ Faster
- ✅ Works regardless of UI issues

**Just run the SQL command and you're done!**

---

**Next Steps:**
1. Open Query Tool
2. Run: `ALTER USER postgres WITH PASSWORD 'BU@Blck2025';`
3. Execute (F5)
4. Test connection
5. Done! ✅
