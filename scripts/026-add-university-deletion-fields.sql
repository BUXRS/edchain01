-- Add deletion provenance columns to universities table
-- These track when and how a university was deleted on-chain

ALTER TABLE universities
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at_chain TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_block_number BIGINT,
ADD COLUMN IF NOT EXISTS deleted_tx_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS deleted_log_index INTEGER;

-- Create index for faster queries on deleted universities
CREATE INDEX IF NOT EXISTS idx_universities_is_deleted ON universities(is_deleted) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_universities_deleted_block ON universities(deleted_block_number) WHERE deleted_block_number IS NOT NULL;

-- Add comment
COMMENT ON COLUMN universities.is_deleted IS 'True if university was deleted on-chain (soft delete, row not removed)';
COMMENT ON COLUMN universities.deleted_at_chain IS 'Block timestamp when deletion occurred on-chain';
COMMENT ON COLUMN universities.deleted_block_number IS 'Block number where UniversityDeleted event was emitted';
COMMENT ON COLUMN universities.deleted_tx_hash IS 'Transaction hash of the deletion transaction';
COMMENT ON COLUMN universities.deleted_log_index IS 'Log index of the UniversityDeleted event';
