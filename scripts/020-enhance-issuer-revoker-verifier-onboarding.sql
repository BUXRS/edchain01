-- Enhanced Issuer, Revoker & Verifier Onboarding Flow
-- This migration adds all fields required for the enhanced onboarding process for all three roles

-- ============================================
-- ISSUERS TABLE ENHANCEMENTS
-- ============================================
-- Make wallet_address nullable (will be set during activation)
ALTER TABLE issuers ALTER COLUMN wallet_address DROP NOT NULL;

-- Add personal information fields
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS position VARCHAR(255);

-- Add authentication fields
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS onboarding_token VARCHAR(255) UNIQUE;
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS onboarding_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add onboarding status tracking
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS pending_wallet_address VARCHAR(42);
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS wallet_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS nda_signed BOOLEAN DEFAULT false;
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS nda_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS nda_signature VARCHAR(255);
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS account_activated BOOLEAN DEFAULT false;
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS account_activated_at TIMESTAMP WITH TIME ZONE;

-- Add blockchain verification fields
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);

-- Add added_by field (wallet address of who added this issuer)
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS added_by VARCHAR(42);

-- Add timestamps
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for issuers
CREATE INDEX IF NOT EXISTS idx_issuers_onboarding_token ON issuers(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_issuers_status ON issuers(status);
CREATE INDEX IF NOT EXISTS idx_issuers_email ON issuers(email);
CREATE INDEX IF NOT EXISTS idx_issuers_blockchain_verified ON issuers(blockchain_verified);
CREATE INDEX IF NOT EXISTS idx_issuers_pending_wallet ON issuers(pending_wallet_address);
CREATE INDEX IF NOT EXISTS idx_issuers_nda_signed ON issuers(nda_signed);
CREATE INDEX IF NOT EXISTS idx_issuers_account_activated ON issuers(account_activated);

-- Add unique constraint on email per university
CREATE UNIQUE INDEX IF NOT EXISTS idx_issuers_email_university ON issuers(email, university_id) WHERE email IS NOT NULL;

-- ============================================
-- REVOKERS TABLE ENHANCEMENTS
-- ============================================
-- Make wallet_address nullable (will be set during activation)
ALTER TABLE revokers ALTER COLUMN wallet_address DROP NOT NULL;

-- Add personal information fields
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS position VARCHAR(255);

-- Add authentication fields
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS onboarding_token VARCHAR(255) UNIQUE;
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS onboarding_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add onboarding status tracking
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS pending_wallet_address VARCHAR(42);
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS wallet_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS nda_signed BOOLEAN DEFAULT false;
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS nda_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS nda_signature VARCHAR(255);
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS account_activated BOOLEAN DEFAULT false;
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS account_activated_at TIMESTAMP WITH TIME ZONE;

-- Add blockchain verification fields
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);

-- Add added_by field (wallet address of who added this revoker)
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS added_by VARCHAR(42);

-- Add timestamps
ALTER TABLE revokers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for revokers
CREATE INDEX IF NOT EXISTS idx_revokers_onboarding_token ON revokers(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_revokers_status ON revokers(status);
CREATE INDEX IF NOT EXISTS idx_revokers_email ON revokers(email);
CREATE INDEX IF NOT EXISTS idx_revokers_blockchain_verified ON revokers(blockchain_verified);
CREATE INDEX IF NOT EXISTS idx_revokers_pending_wallet ON revokers(pending_wallet_address);
CREATE INDEX IF NOT EXISTS idx_revokers_nda_signed ON revokers(nda_signed);
CREATE INDEX IF NOT EXISTS idx_revokers_account_activated ON revokers(account_activated);

-- Add unique constraint on email per university
CREATE UNIQUE INDEX IF NOT EXISTS idx_revokers_email_university ON revokers(email, university_id) WHERE email IS NOT NULL;

-- ============================================
-- VERIFIERS TABLE ENHANCEMENTS
-- ============================================
-- Make wallet_address nullable (will be set during activation)
ALTER TABLE verifiers ALTER COLUMN wallet_address DROP NOT NULL;

-- Add personal information fields (some may already exist from script 008)
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS position VARCHAR(255);

-- Add authentication fields
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS onboarding_token VARCHAR(255) UNIQUE;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS onboarding_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add onboarding status tracking (standardize field names)
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS pending_wallet_address VARCHAR(42);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS wallet_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS nda_signed BOOLEAN DEFAULT false;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS nda_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS nda_signature VARCHAR(255);
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS account_activated BOOLEAN DEFAULT false;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS account_activated_at TIMESTAMP WITH TIME ZONE;

-- Add blockchain verification fields (some may already exist)
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);

-- Add added_by field (wallet address of who added this verifier)
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS added_by VARCHAR(42);

-- Add timestamps
ALTER TABLE verifiers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for verifiers (some may already exist)
CREATE INDEX IF NOT EXISTS idx_verifiers_onboarding_token ON verifiers(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_verifiers_status ON verifiers(status);
CREATE INDEX IF NOT EXISTS idx_verifiers_email ON verifiers(email);
CREATE INDEX IF NOT EXISTS idx_verifiers_blockchain_verified ON verifiers(blockchain_verified);
CREATE INDEX IF NOT EXISTS idx_verifiers_pending_wallet ON verifiers(pending_wallet_address);
CREATE INDEX IF NOT EXISTS idx_verifiers_nda_signed ON verifiers(nda_signed);
CREATE INDEX IF NOT EXISTS idx_verifiers_account_activated ON verifiers(account_activated);

-- Add unique constraint on email per university
CREATE UNIQUE INDEX IF NOT EXISTS idx_verifiers_email_university ON verifiers(email, university_id) WHERE email IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN issuers.pending_wallet_address IS 'Wallet address submitted during onboarding, awaiting approval';
COMMENT ON COLUMN issuers.nda_signature IS 'Full name signature for NDA agreement';
COMMENT ON COLUMN revokers.pending_wallet_address IS 'Wallet address submitted during onboarding, awaiting approval';
COMMENT ON COLUMN revokers.nda_signature IS 'Full name signature for NDA agreement';
COMMENT ON COLUMN verifiers.pending_wallet_address IS 'Wallet address submitted during onboarding, awaiting approval';
COMMENT ON COLUMN verifiers.nda_signature IS 'Full name signature for NDA agreement';
