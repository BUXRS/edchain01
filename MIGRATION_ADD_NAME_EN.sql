-- ============================================
-- Migration: Add name_en column to universities table
-- ============================================
-- This fixes the "column u.name_en does not exist" error
-- 
-- Run this SQL in your PostgreSQL database (using psql, pgAdmin, or any SQL client)
-- ============================================

-- Step 1: Add name_en column if it doesn't exist
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- Step 2: Copy existing name values to name_en for existing records
UPDATE universities
SET name_en = name
WHERE name_en IS NULL AND name IS NOT NULL;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN universities.name_en IS 'English name of the university (from blockchain or copied from name)';

-- Step 4: Verify the column was added (optional - run this to check)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'universities' AND column_name = 'name_en';

-- ============================================
-- Migration complete!
-- ============================================
