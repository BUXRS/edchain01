# Login Troubleshooting Guide

## Issue 1: "Database not configured" Error

### Symptoms
- Error message: "Database not configured. Please contact support."
- Login page shows database error banner

### Causes & Solutions

#### ✅ Check 1: Is PostgreSQL Running?
```bash
# Windows (PowerShell)
Get-Service -Name postgresql*

# Or check if port 5432 is listening
netstat -an | findstr 5432
```

**Solution**: Start PostgreSQL service if not running
```bash
# Windows
net start postgresql-x64-XX  # Replace XX with your version
```

#### ✅ Check 2: Verify DATABASE_URL in .env.local
Your current DATABASE_URL:
```
DATABASE_URL=postgresql://postgres:BU%40Blck2025@localhost:5432/bubd
```

**Verify**:
- Username: `postgres` ✅
- Password: `BU@Blck2025` (URL encoded as `BU%40Blck2025`) ✅
- Host: `localhost` ✅
- Port: `5432` ✅
- Database: `bubd` ✅

**Test Connection Manually**:
```bash
# Using psql (if installed)
psql -h localhost -U postgres -d bubd

# Or test with Node.js
node -e "const postgres = require('postgres'); const sql = postgres('postgresql://postgres:BU%40Blck2025@localhost:5432/bubd'); sql\`SELECT 1\`.then(() => { console.log('✅ Connected'); process.exit(0); }).catch(e => { console.error('❌ Error:', e.message); process.exit(1); });"
```

#### ✅ Check 3: Does Database Exist?
```sql
-- Connect to PostgreSQL
psql -U postgres

-- List databases
\l

-- If 'bubd' doesn't exist, create it
CREATE DATABASE bubd;
```

#### ✅ Check 4: Check Server Logs
Look for database connection errors in your Next.js server console:
```
[Database] Connection test failed: ...
[UniversityLogin] Database error during login: ...
```

---

## Issue 2: "Wallet not registered as university admin" Error

### Symptoms
- Error: "This wallet is not registered as a university admin on the blockchain"
- Wallet login fails even with correct wallet

### This is EXPECTED if:

1. **University Not Activated Yet** ⚠️
   - University was created but not activated by Super Admin
   - Wallet address not registered on blockchain smart contract

2. **Wrong Wallet Address** ⚠️
   - Using a wallet that's not the university admin wallet
   - Wallet address mismatch between database and blockchain

3. **Blockchain Not Synced** ⚠️
   - University exists in database but not on blockchain
   - Need to run sync or activate university

### Solutions

#### ✅ Solution 1: Complete University Activation Flow

1. **Super Admin activates university**:
   - Go to `/admin/universities`
   - Find the university with pending activation
   - Click "Approve & Activate"
   - This registers the wallet on blockchain

2. **Verify on blockchain**:
   ```typescript
   // The system checks:
   findUniversityByAdmin(walletAddress)
   // This queries ALL universities on blockchain
   // Returns null if wallet is not admin of any university
   ```

#### ✅ Solution 2: Use Email/Password Login First

If wallet isn't registered yet:
1. Use **email/password login** (doesn't require blockchain verification)
2. After login, you can link wallet from dashboard
3. Once wallet is linked and university is activated, wallet login will work

#### ✅ Solution 3: Check Wallet Address

Verify the wallet address in database matches blockchain:
```sql
-- Check university wallet address
SELECT id, name, admin_email, wallet_address, status 
FROM universities 
WHERE admin_email = 'thair@buniverse-mr.com';
```

Then verify on blockchain:
- The wallet address must be registered as `admin` for that university
- Check using: `findUniversityByAdmin(walletAddress)`

---

## Quick Fix Checklist

### For Database Error:
- [ ] PostgreSQL service is running
- [ ] DATABASE_URL is correct in `.env.local`
- [ ] Database `bubd` exists
- [ ] User `postgres` has access to database
- [ ] Port 5432 is not blocked by firewall
- [ ] Check server console for detailed error messages

### For Wallet Error:
- [ ] University is activated (status = 'active')
- [ ] Wallet address is registered on blockchain
- [ ] Using the correct wallet address (the one registered as admin)
- [ ] Try email/password login first
- [ ] Complete activation flow if university is pending

---

## Testing Steps

### 1. Test Database Connection
```bash
# Start your Next.js dev server
npm run dev

# Check console for database connection messages
# Should see: [Database] Connection successful (or error details)
```

### 2. Test University Login
1. **Email/Password**: Use credentials from registration email
2. **Wallet**: Only works after university is activated

### 3. Verify University Status
```sql
SELECT 
  id, 
  name, 
  admin_email, 
  wallet_address, 
  status,
  blockchain_verified,
  blockchain_id
FROM universities 
WHERE admin_email = 'your-email@university.edu';
```

**Expected**:
- `status` = 'active'
- `blockchain_verified` = true
- `blockchain_id` = not null
- `wallet_address` = registered wallet

---

## Common Scenarios

### Scenario 1: New University Registration
1. Super Admin creates university → Status: 'pending'
2. University Admin completes onboarding → Status: 'pending_activation'
3. Super Admin activates → Status: 'active', Wallet registered on blockchain
4. ✅ Now wallet login works

### Scenario 2: Database Connection Issues
1. Check PostgreSQL is running
2. Verify DATABASE_URL format
3. Test connection manually
4. Check firewall/network settings

### Scenario 3: Wallet Mismatch
1. Database has wallet A
2. Blockchain has wallet B (or no wallet)
3. Solution: Sync or re-activate university

---

## Need More Help?

Check these files for detailed error logs:
- Server console output
- Browser console (F12)
- Database logs (PostgreSQL logs)

For blockchain issues:
- Check smart contract on Base Mainnet
- Verify university registration transaction
- Check `blockchain_id` in database matches blockchain
