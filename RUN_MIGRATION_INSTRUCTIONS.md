# How to Run Migration 024

## ✅ Migration Status
The `tx_hash` column has already been added to the `universities` table. The migration was successful.

## If You Need to Run It Again

### Option 1: Using Node.js (Recommended)
```bash
node scripts/run-migration-024.js
```

### Option 2: Using psql Command Line
```bash
psql -U postgres -d your_database_name -f scripts/024-add-tx-hash-to-universities.sql
```

### Option 3: Using pgAdmin or SQL Client
1. Open your SQL client (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open the file: `scripts/024-add-tx-hash-to-universities.sql`
4. Copy and paste ONLY the SQL content (not the JavaScript file!)
5. Execute the SQL

**Important:** Use the `.sql` file, NOT the `.js` file when running in SQL clients!

## SQL Content (for direct execution)

```sql
-- Add tx_hash column to universities table
-- This column stores the transaction hash from the blockchain registration

ALTER TABLE universities
ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);

-- Create index for tx_hash lookups
CREATE INDEX IF NOT EXISTS idx_universities_tx_hash ON universities(tx_hash) WHERE tx_hash IS NOT NULL;

-- Add comment
COMMENT ON COLUMN universities.tx_hash IS 'Transaction hash from blockchain registration (registerUniversity)';
```

## Verify Migration

To check if the column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'universities' AND column_name = 'tx_hash';
```

You should see:
- `column_name`: tx_hash
- `data_type`: character varying

---

**Status**: ✅ **COMPLETE** - Column already exists in database
