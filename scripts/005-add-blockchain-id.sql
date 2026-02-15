-- Add blockchain_id column to universities table for proper blockchain sync
-- This allows tracking which blockchain university ID corresponds to each DB record

ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_id BIGINT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create unique index on blockchain_id (allows null for now)
CREATE UNIQUE INDEX IF NOT EXISTS idx_universities_blockchain_id ON universities(blockchain_id) WHERE blockchain_id IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_universities_blockchain_verified ON universities(blockchain_verified);
