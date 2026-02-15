# 🚨 Quick Fix: Email Constraint Error

## Error
```
null value in column "email" of relation "universities" violates not-null constraint
```

## Problem
The `email` column in `universities` table is set to `NOT NULL`, but blockchain sync doesn't provide email addresses (only `admin_email` is used).

## ✅ Solution

Run this SQL script to fix the constraint:

```bash
psql -U postgres -d bubd -f scripts/023-fix-email-constraint.sql
```

**Or run this SQL directly:**
```sql
-- Make email nullable
ALTER TABLE universities ALTER COLUMN email DROP NOT NULL;

-- Remove unique constraint if exists
ALTER TABLE universities DROP CONSTRAINT IF EXISTS universities_email_key;
```

## What This Does
- ✅ Makes `email` column nullable (allows NULL values)
- ✅ Removes unique constraint on email (since NULL values can't be unique)
- ✅ Allows blockchain sync to work without email addresses

## After Running
The sync will work correctly. Blockchain universities don't have email addresses - only `admin_email` is used for authentication.

---

**Note:** The complete migration script (`022-complete-sync-setup.sql`) now includes this fix, so if you run that, you don't need to run this separately.
