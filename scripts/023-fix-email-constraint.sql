-- Fix Email Constraint for Blockchain Sync
-- This makes the email column nullable since blockchain doesn't provide email addresses
-- Only admin_email is used for university admin authentication

-- Make email nullable (blockchain sync doesn't provide email)
ALTER TABLE universities 
ALTER COLUMN email DROP NOT NULL;

-- Remove unique constraint on email if it exists (since it can be null)
DO $$ 
BEGIN
  -- Check if unique constraint exists on email
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%email%' 
    AND contype = 'u'
    AND conrelid = 'universities'::regclass
  ) THEN
    -- Drop the unique constraint
    ALTER TABLE universities DROP CONSTRAINT IF EXISTS universities_email_key;
  END IF;
END $$;

-- Add comment explaining why email can be null
COMMENT ON COLUMN universities.email IS 'University email (nullable - blockchain sync does not provide email, only admin_email is used)';
