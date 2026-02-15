-- Create university_roles view to unify issuers, revokers, and verifiers
-- This view is used by the admin universities endpoint to aggregate role counts

-- Drop the view if it exists
DROP VIEW IF EXISTS university_roles;

-- Create the unified view
CREATE VIEW university_roles AS
SELECT 
  university_id,
  'issuer'::VARCHAR(20) as role_type,
  is_active,
  wallet_address,
  created_at
FROM issuers
WHERE university_id IS NOT NULL

UNION ALL

SELECT 
  university_id,
  'revoker'::VARCHAR(20) as role_type,
  is_active,
  wallet_address,
  created_at
FROM revokers
WHERE university_id IS NOT NULL

UNION ALL

SELECT 
  university_id,
  'verifier'::VARCHAR(20) as role_type,
  is_active,
  wallet_address,
  created_at
FROM verifiers
WHERE university_id IS NOT NULL;

-- Create indexes on the underlying tables if they don't exist (for performance)
CREATE INDEX IF NOT EXISTS idx_issuers_university_active ON issuers(university_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_revokers_university_active ON revokers(university_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_verifiers_university_active ON verifiers(university_id, is_active) WHERE is_active = true;

-- Add comment
COMMENT ON VIEW university_roles IS 'Unified view of all university roles (issuers, revokers, verifiers) for aggregation queries';
