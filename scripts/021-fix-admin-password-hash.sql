-- Quick Fix: Add missing admin_password_hash column
-- This fixes the error: column "admin_password_hash" of relation "universities" does not exist

-- Add admin_password_hash column if it doesn't exist
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(255);

-- Also add subscription_type and subscription_expires_at if missing
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN universities.admin_password_hash IS 'Bcrypt hash of the university admin password';
