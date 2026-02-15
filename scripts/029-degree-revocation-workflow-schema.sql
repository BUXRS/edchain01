-- ============================================
-- 029: Degree & Revocation Workflow Schema
-- ============================================
-- Extends degree_requests, revocation_requests, approvals with provenance
-- and contract-aligned columns. Run after 024 (chain_events), 026 (university_roles).
-- ============================================

-- degree_requests: add provenance and ensure contract fields
ALTER TABLE degree_requests
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS chain_id BIGINT,
  ADD COLUMN IF NOT EXISTS created_block_number BIGINT,
  ADD COLUMN IF NOT EXISTS created_tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS created_log_index INTEGER,
  ADD COLUMN IF NOT EXISTS updated_block_number BIGINT,
  ADD COLUMN IF NOT EXISTS updated_tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS updated_log_index INTEGER,
  ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS faculty_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS faculty_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS major_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS major_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS degree_name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS degree_name_en VARCHAR(255);

-- Backfill requested_at from created_at where null
UPDATE degree_requests SET requested_at = created_at WHERE requested_at IS NULL AND created_at IS NOT NULL;

-- revocation_requests: add provenance
ALTER TABLE revocation_requests
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS chain_id BIGINT,
  ADD COLUMN IF NOT EXISTS created_block_number BIGINT,
  ADD COLUMN IF NOT EXISTS created_tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS created_log_index INTEGER,
  ADD COLUMN IF NOT EXISTS updated_block_number BIGINT,
  ADD COLUMN IF NOT EXISTS updated_tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS updated_log_index INTEGER;

UPDATE revocation_requests SET requested_at = created_at WHERE requested_at IS NULL AND created_at IS NOT NULL;

-- degree_request_approvals: add tx provenance
ALTER TABLE degree_request_approvals
  ADD COLUMN IF NOT EXISTS chain_id BIGINT,
  ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS block_number BIGINT,
  ADD COLUMN IF NOT EXISTS log_index INTEGER;

-- revocation_request_approvals: add tx provenance
ALTER TABLE revocation_request_approvals
  ADD COLUMN IF NOT EXISTS chain_id BIGINT,
  ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS block_number BIGINT,
  ADD COLUMN IF NOT EXISTS log_index INTEGER;

-- Indexes for requester / verifier dashboards
CREATE INDEX IF NOT EXISTS idx_degree_requests_requester ON degree_requests(requester_address);
CREATE INDEX IF NOT EXISTS idx_degree_requests_recipient ON degree_requests(recipient_address);
CREATE INDEX IF NOT EXISTS idx_revocation_requests_requester ON revocation_requests(requester_address);

COMMENT ON COLUMN degree_requests.required_approvals IS 'From Core.getRequiredApprovals(universityId): verifierCount<=2 -> 1, else 2';
COMMENT ON COLUMN revocation_requests.required_approvals IS 'Same as degree_requests per university';
