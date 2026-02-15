-- Enhanced University Registration Onboarding Flow
-- This migration adds all fields required for the enhanced onboarding process

-- Make wallet_address nullable for standard registration flow (wallet is submitted during onboarding)
ALTER TABLE universities 
ALTER COLUMN wallet_address DROP NOT NULL;

-- Add admin_password_hash column if it doesn't exist (required for university admin authentication)
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(255);

-- Add subscription_type and subscription_expires_at if they don't exist
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Add missing fields to university_registrations table
ALTER TABLE university_registrations
ADD COLUMN IF NOT EXISTS nda_signature VARCHAR(255),
ADD COLUMN IF NOT EXISTS nda_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pending_wallet_address VARCHAR(42),
ADD COLUMN IF NOT EXISTS wallet_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS account_activated_at TIMESTAMP WITH TIME ZONE;

-- Add missing fields to universities table (if not already present)
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_registrations_pending_wallet ON university_registrations(pending_wallet_address);
CREATE INDEX IF NOT EXISTS idx_registrations_nda_signed_at ON university_registrations(nda_signed_at);
CREATE INDEX IF NOT EXISTS idx_registrations_wallet_submitted_at ON university_registrations(wallet_submitted_at);
CREATE INDEX IF NOT EXISTS idx_registrations_account_activated_at ON university_registrations(account_activated_at);
CREATE INDEX IF NOT EXISTS idx_universities_status ON universities(status);
CREATE INDEX IF NOT EXISTS idx_universities_sync_status ON universities(sync_status);

-- Add comments for documentation
COMMENT ON COLUMN university_registrations.nda_signature IS 'Full name signature for NDA agreement';
COMMENT ON COLUMN university_registrations.pending_wallet_address IS 'Wallet address submitted during onboarding, awaiting approval';
COMMENT ON COLUMN university_registrations.wallet_submitted_at IS 'Timestamp when wallet address was submitted';
COMMENT ON COLUMN university_registrations.account_activated_at IS 'Timestamp when account was activated by Super Admin';
COMMENT ON COLUMN universities.sync_status IS 'Status of blockchain sync: pending, syncing, synced, error';
COMMENT ON COLUMN universities.sync_error IS 'Error message if blockchain sync failed';
