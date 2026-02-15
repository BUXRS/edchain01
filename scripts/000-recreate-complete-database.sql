-- ============================================
-- COMPLETE DATABASE RECREATION SCRIPT
-- ============================================
-- This script recreates the entire database schema from scratch
-- Run this script to recreate all tables, columns, indexes, and constraints
-- 
-- WARNING: This will DROP all existing tables and data!
-- Make sure you have backups before running this script.
-- ============================================

-- Drop all existing tables (in reverse dependency order)
DROP TABLE IF EXISTS revocation_request_approvals CASCADE;
DROP TABLE IF EXISTS revocation_requests CASCADE;
DROP TABLE IF EXISTS degree_request_approvals CASCADE;
DROP TABLE IF EXISTS degree_requests CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS pending_transactions CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS university_registrations CASCADE;
DROP TABLE IF EXISTS pending_approvals CASCADE;
DROP TABLE IF EXISTS degrees CASCADE;
DROP TABLE IF EXISTS verifiers CASCADE;
DROP TABLE IF EXISTS revokers CASCADE;
DROP TABLE IF EXISTS issuers CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS universities CASCADE;

-- ============================================
-- 1. UNIVERSITIES TABLE
-- ============================================
CREATE TABLE universities (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  country VARCHAR(100),
  is_active BOOLEAN DEFAULT false,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  subscription_plan VARCHAR(50),
  
  -- Authentication & Registration Fields
  email VARCHAR(255),
  password_hash VARCHAR(255),
  admin_email VARCHAR(255),
  admin_password_hash VARCHAR(255),
  admin_name VARCHAR(255),
  
  -- Status & Onboarding
  status VARCHAR(50) DEFAULT 'pending',
  sync_status VARCHAR(50) DEFAULT 'pending',
  sync_error TEXT,
  
  -- Subscription Management
  subscription_type VARCHAR(50),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Blockchain Sync Fields
  blockchain_id BIGINT UNIQUE,
  blockchain_verified BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  tx_hash VARCHAR(66),
  
  -- University Details
  logo_url VARCHAR(500),
  website VARCHAR(500),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. UNIVERSITY_REGISTRATIONS TABLE
-- ============================================
CREATE TABLE university_registrations (
  id SERIAL PRIMARY KEY,
  university_id INTEGER UNIQUE REFERENCES universities(id) ON DELETE CASCADE,
  registration_type VARCHAR(50) DEFAULT 'subscription',
  subscription_plan VARCHAR(50),
  is_trial BOOLEAN DEFAULT false,
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  nda_signed BOOLEAN DEFAULT false,
  nda_signature VARCHAR(255),
  nda_signed_at TIMESTAMP WITH TIME ZONE,
  wallet_submitted BOOLEAN DEFAULT false,
  pending_wallet_address VARCHAR(42),
  wallet_submitted_at TIMESTAMP WITH TIME ZONE,
  wallet_address VARCHAR(42),
  account_activated BOOLEAN DEFAULT false,
  account_activated_at TIMESTAMP WITH TIME ZONE,
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  onboarding_token VARCHAR(255),
  onboarding_token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. ISSUERS TABLE
-- ============================================
CREATE TABLE issuers (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42),
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  added_by VARCHAR(42),
  is_active BOOLEAN DEFAULT true,
  
  -- Personal Information
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  department VARCHAR(255),
  position VARCHAR(255),
  
  -- Authentication
  password_hash VARCHAR(255),
  onboarding_token VARCHAR(255) UNIQUE,
  onboarding_token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Onboarding Status
  status VARCHAR(50) DEFAULT 'pending',
  pending_wallet_address VARCHAR(42),
  wallet_submitted_at TIMESTAMP WITH TIME ZONE,
  nda_signed BOOLEAN DEFAULT false,
  nda_signed_at TIMESTAMP WITH TIME ZONE,
  nda_signature VARCHAR(255),
  account_activated BOOLEAN DEFAULT false,
  account_activated_at TIMESTAMP WITH TIME ZONE,
  
  -- Blockchain Verification
  blockchain_verified BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  tx_hash VARCHAR(66),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(wallet_address, university_id)
);

-- ============================================
-- 4. REVOKERS TABLE
-- ============================================
CREATE TABLE revokers (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42),
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  added_by VARCHAR(42),
  is_active BOOLEAN DEFAULT true,
  
  -- Personal Information
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  department VARCHAR(255),
  position VARCHAR(255),
  
  -- Authentication
  password_hash VARCHAR(255),
  onboarding_token VARCHAR(255) UNIQUE,
  onboarding_token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Onboarding Status
  status VARCHAR(50) DEFAULT 'pending',
  pending_wallet_address VARCHAR(42),
  wallet_submitted_at TIMESTAMP WITH TIME ZONE,
  nda_signed BOOLEAN DEFAULT false,
  nda_signed_at TIMESTAMP WITH TIME ZONE,
  nda_signature VARCHAR(255),
  account_activated BOOLEAN DEFAULT false,
  account_activated_at TIMESTAMP WITH TIME ZONE,
  
  -- Blockchain Verification
  blockchain_verified BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  tx_hash VARCHAR(66),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(wallet_address, university_id)
);

-- ============================================
-- 5. VERIFIERS TABLE
-- ============================================
CREATE TABLE verifiers (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42),
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  added_by VARCHAR(42),
  is_active BOOLEAN DEFAULT true,
  
  -- Personal Information
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  department VARCHAR(255),
  position VARCHAR(255),
  
  -- Authentication
  password_hash VARCHAR(255),
  onboarding_token VARCHAR(255) UNIQUE,
  onboarding_token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Onboarding Status
  status VARCHAR(50) DEFAULT 'pending',
  pending_wallet_address VARCHAR(42),
  wallet_submitted_at TIMESTAMP WITH TIME ZONE,
  nda_signed BOOLEAN DEFAULT false,
  nda_signed_at TIMESTAMP WITH TIME ZONE,
  nda_signature VARCHAR(255),
  account_activated BOOLEAN DEFAULT false,
  account_activated_at TIMESTAMP WITH TIME ZONE,
  
  -- Blockchain Verification
  blockchain_verified BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  tx_hash VARCHAR(66),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(wallet_address, university_id)
);

-- ============================================
-- 6. DEGREES TABLE
-- ============================================
CREATE TABLE degrees (
  id SERIAL PRIMARY KEY,
  token_id VARCHAR(78) UNIQUE,
  student_address VARCHAR(42) NOT NULL,
  university_id INTEGER REFERENCES universities(id),
  degree_type VARCHAR(100) NOT NULL,
  degree_type_ar VARCHAR(100),
  major VARCHAR(255) NOT NULL,
  major_ar VARCHAR(255),
  student_name VARCHAR(255) NOT NULL,
  student_name_ar VARCHAR(255),
  graduation_date DATE NOT NULL,
  honors VARCHAR(100),
  honors_ar VARCHAR(100),
  cgpa NUMERIC(5,2),
  ipfs_hash VARCHAR(100),
  tx_hash VARCHAR(66),
  issued_by VARCHAR(42),
  
  -- Revocation Fields
  is_revoked BOOLEAN DEFAULT false,
  revoked_by VARCHAR(42),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  
  -- Verifier Approval Fields
  request_id BIGINT,
  verification_status VARCHAR(50) DEFAULT 'pending',
  approval_count INTEGER DEFAULT 0,
  required_approvals INTEGER DEFAULT 0,
  
  -- Blockchain Verification
  blockchain_verified BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. DEGREE_REQUESTS TABLE
-- ============================================
CREATE TABLE degree_requests (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT UNIQUE NOT NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  recipient_address VARCHAR(42) NOT NULL,
  requester_address VARCHAR(42) NOT NULL,
  student_name VARCHAR(255),
  student_name_ar VARCHAR(255),
  faculty_en VARCHAR(255),
  faculty_ar VARCHAR(255),
  major_en VARCHAR(255),
  major_ar VARCHAR(255),
  degree_name_en VARCHAR(255),
  degree_name_ar VARCHAR(255),
  gpa INTEGER,
  year INTEGER,
  approval_count INTEGER DEFAULT 0,
  required_approvals INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE,
  token_id BIGINT
);

-- ============================================
-- 8. DEGREE_REQUEST_APPROVALS TABLE
-- ============================================
CREATE TABLE degree_request_approvals (
  id SERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL,
  verifier_address VARCHAR(42) NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (request_id) REFERENCES degree_requests(request_id) ON DELETE CASCADE,
  UNIQUE(request_id, verifier_address)
);

-- ============================================
-- 9. REVOCATION_REQUESTS TABLE
-- ============================================
CREATE TABLE revocation_requests (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT UNIQUE NOT NULL,
  token_id BIGINT NOT NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  requester_address VARCHAR(42) NOT NULL,
  approval_count INTEGER DEFAULT 0,
  required_approvals INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 10. REVOCATION_REQUEST_APPROVALS TABLE
-- ============================================
CREATE TABLE revocation_request_approvals (
  id SERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL,
  verifier_address VARCHAR(42) NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (request_id) REFERENCES revocation_requests(request_id) ON DELETE CASCADE,
  UNIQUE(request_id, verifier_address)
);

-- ============================================
-- 11. PENDING_APPROVALS TABLE
-- ============================================
CREATE TABLE pending_approvals (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('issuer', 'revoker', 'university')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requester_email VARCHAR(255),
  requester_name VARCHAR(255),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(42),
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 12. ADMIN_USERS TABLE
-- ============================================
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 13. ACTIVITY_LOGS TABLE
-- ============================================
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  actor_address VARCHAR(42),
  actor_id VARCHAR(255),
  actor_type VARCHAR(20) CHECK (actor_type IN ('admin', 'university', 'issuer', 'revoker', 'system')),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 14. SYNC_STATUS TABLE
-- ============================================
CREATE TABLE sync_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_synced_block BIGINT DEFAULT 0,
  last_full_sync_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial sync status
INSERT INTO sync_status (id, last_synced_block, last_full_sync_at)
VALUES (1, 0, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 15. SYNC_LOGS TABLE
-- ============================================
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  action VARCHAR(100) NOT NULL,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 16. PENDING_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE pending_transactions (
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

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Universities indexes
CREATE INDEX idx_universities_wallet ON universities(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX idx_universities_active ON universities(is_active);
CREATE INDEX idx_universities_status ON universities(status);
CREATE INDEX idx_universities_sync_status ON universities(sync_status);
CREATE INDEX idx_universities_blockchain_id ON universities(blockchain_id) WHERE blockchain_id IS NOT NULL;
CREATE INDEX idx_universities_blockchain_verified ON universities(blockchain_verified);
CREATE INDEX idx_universities_tx_hash ON universities(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_universities_email ON universities(email) WHERE email IS NOT NULL;
CREATE INDEX idx_universities_admin_email ON universities(admin_email) WHERE admin_email IS NOT NULL;

-- University Registrations indexes
CREATE INDEX idx_registrations_university ON university_registrations(university_id);
CREATE INDEX idx_registrations_token ON university_registrations(onboarding_token) WHERE onboarding_token IS NOT NULL;
CREATE INDEX idx_registrations_status ON university_registrations(payment_status);
CREATE INDEX idx_registrations_pending_wallet ON university_registrations(pending_wallet_address) WHERE pending_wallet_address IS NOT NULL;
CREATE INDEX idx_registrations_nda_signed_at ON university_registrations(nda_signed_at) WHERE nda_signed_at IS NOT NULL;
CREATE INDEX idx_registrations_wallet_submitted_at ON university_registrations(wallet_submitted_at) WHERE wallet_submitted_at IS NOT NULL;
CREATE INDEX idx_registrations_account_activated_at ON university_registrations(account_activated_at) WHERE account_activated_at IS NOT NULL;

-- Issuers indexes
CREATE INDEX idx_issuers_wallet ON issuers(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX idx_issuers_university ON issuers(university_id);
CREATE INDEX idx_issuers_university_active ON issuers(university_id, is_active);
CREATE INDEX idx_issuers_onboarding_token ON issuers(onboarding_token) WHERE onboarding_token IS NOT NULL;
CREATE INDEX idx_issuers_status ON issuers(status);
CREATE INDEX idx_issuers_email ON issuers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_issuers_blockchain_verified ON issuers(blockchain_verified);
CREATE INDEX idx_issuers_pending_wallet ON issuers(pending_wallet_address) WHERE pending_wallet_address IS NOT NULL;
CREATE INDEX idx_issuers_nda_signed ON issuers(nda_signed);
CREATE INDEX idx_issuers_account_activated ON issuers(account_activated);
CREATE UNIQUE INDEX idx_issuers_email_university ON issuers(email, university_id) WHERE email IS NOT NULL;

-- Revokers indexes
CREATE INDEX idx_revokers_wallet ON revokers(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX idx_revokers_university ON revokers(university_id);
CREATE INDEX idx_revokers_university_active ON revokers(university_id, is_active);
CREATE INDEX idx_revokers_onboarding_token ON revokers(onboarding_token) WHERE onboarding_token IS NOT NULL;
CREATE INDEX idx_revokers_status ON revokers(status);
CREATE INDEX idx_revokers_email ON revokers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_revokers_blockchain_verified ON revokers(blockchain_verified);
CREATE INDEX idx_revokers_pending_wallet ON revokers(pending_wallet_address) WHERE pending_wallet_address IS NOT NULL;
CREATE INDEX idx_revokers_nda_signed ON revokers(nda_signed);
CREATE INDEX idx_revokers_account_activated ON revokers(account_activated);
CREATE UNIQUE INDEX idx_revokers_email_university ON revokers(email, university_id) WHERE email IS NOT NULL;

-- Verifiers indexes
CREATE INDEX idx_verifiers_wallet ON verifiers(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX idx_verifiers_university ON verifiers(university_id);
CREATE INDEX idx_verifiers_onboarding_token ON verifiers(onboarding_token) WHERE onboarding_token IS NOT NULL;
CREATE INDEX idx_verifiers_status ON verifiers(status);
CREATE INDEX idx_verifiers_email ON verifiers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_verifiers_blockchain_verified ON verifiers(blockchain_verified);
CREATE INDEX idx_verifiers_pending_wallet ON verifiers(pending_wallet_address) WHERE pending_wallet_address IS NOT NULL;
CREATE INDEX idx_verifiers_nda_signed ON verifiers(nda_signed);
CREATE INDEX idx_verifiers_account_activated ON verifiers(account_activated);
CREATE UNIQUE INDEX idx_verifiers_email_university ON verifiers(email, university_id) WHERE email IS NOT NULL;

-- Degrees indexes
CREATE INDEX idx_degrees_student ON degrees(student_address);
CREATE INDEX idx_degrees_university ON degrees(university_id);
CREATE INDEX idx_degrees_token ON degrees(token_id) WHERE token_id IS NOT NULL;
CREATE INDEX idx_degrees_request_id ON degrees(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_degrees_verification_status ON degrees(verification_status);
CREATE INDEX idx_degrees_blockchain_verified ON degrees(blockchain_verified);
CREATE INDEX idx_degrees_status ON degrees(status);

-- Degree Requests indexes
CREATE INDEX idx_degree_requests_university ON degree_requests(university_id);
CREATE INDEX idx_degree_requests_status ON degree_requests(status);
CREATE INDEX idx_degree_requests_requester ON degree_requests(requester_address);

-- Revocation Requests indexes
CREATE INDEX idx_revocation_requests_university ON revocation_requests(university_id);
CREATE INDEX idx_revocation_requests_token ON revocation_requests(token_id);
CREATE INDEX idx_revocation_requests_status ON revocation_requests(status);

-- Pending Approvals indexes
CREATE INDEX idx_pending_status ON pending_approvals(status);
CREATE INDEX idx_pending_university ON pending_approvals(university_id);

-- Activity Logs indexes
CREATE INDEX idx_activity_actor ON activity_logs(actor_address) WHERE actor_address IS NOT NULL;
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_actor_type ON activity_logs(actor_type);

-- Sync Logs indexes
CREATE INDEX idx_sync_logs_entity ON sync_logs(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX idx_sync_logs_tx_hash ON sync_logs(tx_hash) WHERE tx_hash IS NOT NULL;

-- Pending Transactions indexes
CREATE INDEX idx_pending_tx_hash ON pending_transactions(tx_hash);
CREATE INDEX idx_pending_tx_status ON pending_transactions(status);
CREATE INDEX idx_pending_tx_university ON pending_transactions(university_id) WHERE university_id IS NOT NULL;
CREATE INDEX idx_pending_tx_wallet ON pending_transactions(initiated_by) WHERE initiated_by IS NOT NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE universities IS 'Stores registered universities with blockchain sync support';
COMMENT ON COLUMN universities.wallet_address IS 'University wallet address (nullable for standard registration flow)';
COMMENT ON COLUMN universities.admin_password_hash IS 'Bcrypt hash of the university admin password';
COMMENT ON COLUMN universities.blockchain_id IS 'University ID from blockchain smart contract';
COMMENT ON COLUMN universities.blockchain_verified IS 'Whether this university has been verified on blockchain';
COMMENT ON COLUMN universities.last_synced_at IS 'Last time this university was synced from blockchain';
COMMENT ON COLUMN universities.sync_status IS 'Status of blockchain sync: pending, syncing, synced, error';
COMMENT ON COLUMN universities.sync_error IS 'Error message if blockchain sync failed';
COMMENT ON COLUMN universities.tx_hash IS 'Transaction hash from blockchain registration';

COMMENT ON TABLE university_registrations IS 'Tracks university registration and onboarding process';
COMMENT ON COLUMN university_registrations.pending_wallet_address IS 'Wallet address submitted during onboarding, awaiting approval';
COMMENT ON COLUMN university_registrations.nda_signature IS 'Full name signature for NDA agreement';
COMMENT ON COLUMN university_registrations.wallet_submitted_at IS 'Timestamp when wallet address was submitted';
COMMENT ON COLUMN university_registrations.account_activated_at IS 'Timestamp when account was activated by Super Admin';

COMMENT ON TABLE issuers IS 'Stores issuer wallets and information for each university';
COMMENT ON COLUMN issuers.wallet_address IS 'Wallet address (set during activation, nullable during onboarding)';
COMMENT ON COLUMN issuers.pending_wallet_address IS 'Wallet address submitted during onboarding, awaiting approval';
COMMENT ON COLUMN issuers.nda_signature IS 'Full name signature for NDA agreement';
COMMENT ON COLUMN issuers.added_by IS 'Wallet address of the university admin who added this issuer';

COMMENT ON TABLE revokers IS 'Stores revoker wallets and information for each university';
COMMENT ON COLUMN revokers.wallet_address IS 'Wallet address (set during activation, nullable during onboarding)';
COMMENT ON COLUMN revokers.pending_wallet_address IS 'Wallet address submitted during onboarding, awaiting approval';
COMMENT ON COLUMN revokers.nda_signature IS 'Full name signature for NDA agreement';
COMMENT ON COLUMN revokers.added_by IS 'Wallet address of the university admin who added this revoker';

COMMENT ON TABLE verifiers IS 'Stores verifier wallets and information for each university';
COMMENT ON COLUMN verifiers.wallet_address IS 'Wallet address (set during activation, nullable during onboarding)';
COMMENT ON COLUMN verifiers.pending_wallet_address IS 'Wallet address submitted during onboarding, awaiting approval';
COMMENT ON COLUMN verifiers.nda_signature IS 'Full name signature for NDA agreement';
COMMENT ON COLUMN verifiers.added_by IS 'Wallet address of the university admin who added this verifier';

COMMENT ON TABLE degrees IS 'Stores issued degree records - mirrors on-chain data';
COMMENT ON TABLE degree_requests IS 'Tracks pending degree issuance requests requiring verifier approval';
COMMENT ON TABLE revocation_requests IS 'Tracks pending revocation requests requiring verifier approval';
COMMENT ON TABLE sync_logs IS 'Logs all blockchain sync operations for audit and debugging';
COMMENT ON TABLE pending_transactions IS 'Tracks pending blockchain transactions awaiting confirmation';

-- ============================================
-- SCRIPT COMPLETE
-- ============================================
-- All tables, columns, indexes, and constraints have been created.
-- Your database is now ready to use!
-- ============================================
