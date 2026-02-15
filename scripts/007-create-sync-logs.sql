-- Create sync_logs table for tracking blockchain sync operations
-- This table logs all sync operations for audit and debugging purposes

CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_tx_hash ON sync_logs(tx_hash) WHERE tx_hash IS NOT NULL;

-- Add comment
COMMENT ON TABLE sync_logs IS 'Logs all blockchain sync operations for audit and debugging';
