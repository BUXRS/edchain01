-- Add missing columns to universities table for blockchain sync
-- This migration adds name_en and admin_wallet columns required for blockchain sync

-- Add name_en column (English name from blockchain)
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- Add admin_wallet column (blockchain admin address)
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS admin_wallet VARCHAR(42);

-- Add comments for documentation
COMMENT ON COLUMN universities.name_en IS 'English name of the university (from blockchain)';
COMMENT ON COLUMN universities.admin_wallet IS 'Blockchain admin wallet address for the university';

-- If name_en is null but name exists, copy name to name_en as initial value
UPDATE universities
SET name_en = name
WHERE name_en IS NULL AND name IS NOT NULL;
