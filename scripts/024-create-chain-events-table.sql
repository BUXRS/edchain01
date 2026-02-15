-- ============================================
-- CHAIN_EVENTS TABLE - Immutable Event Log
-- ============================================
-- This table stores all blockchain events in an append-only, idempotent manner.
-- Used for reorg detection, replay, and audit trail.
-- ============================================

CREATE TABLE IF NOT EXISTS chain_events (
  id BIGSERIAL PRIMARY KEY,
  
  -- Unique identifier for idempotency (prevents duplicate processing)
  chain_id BIGINT NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  log_index INTEGER NOT NULL,
  
  -- Event metadata
  event_name VARCHAR(100) NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  block_number BIGINT NOT NULL,
  block_hash VARCHAR(66) NOT NULL,
  
  -- Event data (JSONB for flexible schema)
  event_data JSONB NOT NULL,
  
  -- Reorg handling
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  confirmation_depth INTEGER DEFAULT 0,
  
  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  projection_applied BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for idempotency
  CONSTRAINT unique_event UNIQUE (chain_id, tx_hash, log_index)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chain_events_chain_tx_log ON chain_events(chain_id, tx_hash, log_index);
CREATE INDEX IF NOT EXISTS idx_chain_events_block_number ON chain_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_chain_events_event_name ON chain_events(event_name);
CREATE INDEX IF NOT EXISTS idx_chain_events_processed ON chain_events(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_chain_events_finalized ON chain_events(is_finalized) WHERE is_finalized = true;
CREATE INDEX IF NOT EXISTS idx_chain_events_contract ON chain_events(contract_address);

-- ============================================
-- ENHANCED SYNC_STATUS TABLE
-- ============================================
-- Add fields for reorg handling and checkpoint management

ALTER TABLE sync_status
ADD COLUMN IF NOT EXISTS finalized_block BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_finalized_block_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS sync_mode VARCHAR(20) DEFAULT 'websocket' CHECK (sync_mode IN ('websocket', 'polling', 'manual')),
ADD COLUMN IF NOT EXISTS confirmation_depth INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS reorg_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_reorg_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS events_processed_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS events_failed_count BIGINT DEFAULT 0;

-- Update comment
COMMENT ON TABLE chain_events IS 'Immutable append-only log of all blockchain events. Used for reorg detection, replay, and audit trail.';
COMMENT ON COLUMN chain_events.chain_id IS 'Chain ID (8453 for Base mainnet)';
COMMENT ON COLUMN chain_events.tx_hash IS 'Transaction hash';
COMMENT ON COLUMN chain_events.log_index IS 'Log index within the transaction';
COMMENT ON COLUMN chain_events.is_finalized IS 'Whether this event is in a finalized block (safe from reorgs)';
COMMENT ON COLUMN chain_events.confirmation_depth IS 'Number of confirmations (blocks) since this event';
COMMENT ON COLUMN chain_events.processed IS 'Whether this event has been processed by the projector';
COMMENT ON COLUMN chain_events.projection_applied IS 'Whether the projection to materialized tables has been applied';
