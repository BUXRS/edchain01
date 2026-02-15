-- Add sync status table for tracking blockchain sync progress
CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_synced_block BIGINT DEFAULT 0,
  last_full_sync_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial row if not exists
INSERT INTO sync_status (id, last_synced_block, last_full_sync_at)
VALUES (1, 0, NOW())
ON CONFLICT (id) DO NOTHING;
