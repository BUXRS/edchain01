-- Add onboarding fields to verifiers table (matching issuers/revokers structure)
-- This ensures verifiers have the same fields as issuers and revokers

-- Add personal information fields
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS position VARCHAR(255);

-- Add authentication fields
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS onboarding_token VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS onboarding_token_expires TIMESTAMP WITH TIME ZONE;

-- Add onboarding status tracking
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS nda_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS wallet_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS blockchain_added_at TIMESTAMP WITH TIME ZONE;

-- Add blockchain verification fields
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);

-- Add timestamps
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_verifiers_onboarding_token ON verifiers(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_verifiers_onboarding_status ON verifiers(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_verifiers_email ON verifiers(email);
CREATE INDEX IF NOT EXISTS idx_verifiers_blockchain_verified ON verifiers(blockchain_verified);

-- Add unique constraint on email per university
CREATE UNIQUE INDEX IF NOT EXISTS idx_verifiers_email_university ON verifiers(email, university_id) WHERE email IS NOT NULL;
