-- Complete Blockchain Sync Setup
-- This script adds ALL missing columns and tables needed for blockchain-to-database sync
-- Run this script to ensure your database is ready for automatic sync

-- ============================================
-- 1. Fix Universities Table - Add Missing Columns
-- ============================================

-- Make email nullable (blockchain doesn't provide email, only admin_email is used)
DO $$ 
BEGIN
  -- Make email nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'universities' 
    AND column_name = 'email' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE universities ALTER COLUMN email DROP NOT NULL;
  END IF;
  
  -- Remove unique constraint on email if it exists (since it can be null)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%email%' 
    AND contype = 'u'
    AND conrelid = 'universities'::regclass
  ) THEN
    ALTER TABLE universities DROP CONSTRAINT IF EXISTS universities_email_key;
  END IF;
END $$;

-- Add admin_password_hash (required for university registration)
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(255);

-- Add subscription columns (required for trial/subscription management)
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Add blockchain sync columns (required for sync tracking)
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS blockchain_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add status columns (required for university status tracking)
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Make wallet_address nullable (for standard registration flow)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'universities' 
    AND column_name = 'wallet_address' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE universities ALTER COLUMN wallet_address DROP NOT NULL;
  END IF;
END $$;

-- ============================================
-- 2. Create Sync Logs Table (if missing)
-- ============================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at DESC);

-- ============================================
-- 3. Create Pending Transactions Table (if missing)
-- ============================================

CREATE TABLE IF NOT EXISTS pending_transactions (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  university_id INTEGER,
  initiated_by VARCHAR(42),
  data JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  block_number BIGINT,
  gas_used BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_tx_hash ON pending_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_pending_tx_status ON pending_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pending_tx_university ON pending_transactions(university_id);
CREATE INDEX IF NOT EXISTS idx_pending_tx_wallet ON pending_transactions(initiated_by);

-- ============================================
-- 4. Create Sync Status Table (if missing)
-- ============================================

CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_synced_block BIGINT DEFAULT 0,
  last_full_sync_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default sync status if not exists
INSERT INTO sync_status (id, last_synced_block, last_full_sync_at)
VALUES (1, 0, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. Add Missing Columns to Issuers Table
-- ============================================

ALTER TABLE issuers
ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);

-- ============================================
-- 6. Add Missing Columns to Revokers Table
-- ============================================

ALTER TABLE revokers
ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);

-- ============================================
-- 7. Add Missing Columns to Verifiers Table (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verifiers') THEN
    ALTER TABLE verifiers
    ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);
  END IF;
END $$;

-- ============================================
-- 8. Add Missing Columns to Degrees Table
-- ============================================

ALTER TABLE degrees
ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 9. Create Indexes for Better Performance
-- ============================================

-- Universities indexes
CREATE INDEX IF NOT EXISTS idx_universities_blockchain_id ON universities(blockchain_id);
CREATE INDEX IF NOT EXISTS idx_universities_wallet_address ON universities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_universities_status ON universities(status);
CREATE INDEX IF NOT EXISTS idx_universities_sync_status ON universities(sync_status);
CREATE INDEX IF NOT EXISTS idx_universities_blockchain_verified ON universities(blockchain_verified);

-- Issuers indexes
CREATE INDEX IF NOT EXISTS idx_issuers_blockchain_verified ON issuers(blockchain_verified);
CREATE INDEX IF NOT EXISTS idx_issuers_university_active ON issuers(university_id, is_active);

-- Revokers indexes
CREATE INDEX IF NOT EXISTS idx_revokers_blockchain_verified ON revokers(blockchain_verified);
CREATE INDEX IF NOT EXISTS idx_revokers_university_active ON revokers(university_id, is_active);

-- ============================================
-- 10. Add Comments for Documentation
-- ============================================

COMMENT ON COLUMN universities.admin_password_hash IS 'Bcrypt hash of the university admin password';
COMMENT ON COLUMN universities.blockchain_id IS 'University ID from blockchain smart contract';
COMMENT ON COLUMN universities.blockchain_verified IS 'Whether this university has been verified on blockchain';
COMMENT ON COLUMN universities.last_synced_at IS 'Last time this university was synced from blockchain';
COMMENT ON COLUMN universities.sync_status IS 'Status of blockchain sync: pending, syncing, synced, error';
COMMENT ON COLUMN universities.sync_error IS 'Error message if blockchain sync failed';

-- ============================================
-- Verification Query
-- ============================================

-- Run this to verify all columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'universities' 
-- ORDER BY column_name;
