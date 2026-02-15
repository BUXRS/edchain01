-- University Degree Protocol Database Schema
-- This script creates all necessary tables for the platform

-- Universities table (stores registered universities)
CREATE TABLE IF NOT EXISTS universities (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  country VARCHAR(100),
  is_active BOOLEAN DEFAULT false,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  subscription_plan VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issuers table (stores issuer wallets for each university)
CREATE TABLE IF NOT EXISTS issuers (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  added_by VARCHAR(42),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_address, university_id)
);

-- Revokers table (stores revoker wallets for each university)
CREATE TABLE IF NOT EXISTS revokers (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  added_by VARCHAR(42),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_address, university_id)
);

-- Degrees table (stores issued degree records - mirrors on-chain data)
CREATE TABLE IF NOT EXISTS degrees (
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
  ipfs_hash VARCHAR(100),
  tx_hash VARCHAR(66),
  issued_by VARCHAR(42),
  is_revoked BOOLEAN DEFAULT false,
  revoked_by VARCHAR(42),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pending approvals table (for wallet role requests)
CREATE TABLE IF NOT EXISTS pending_approvals (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('issuer', 'revoker', 'university')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(42),
  notes TEXT
);

-- Admin users table (for super admin access)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table (for audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  actor_address VARCHAR(42),
  actor_type VARCHAR(20) CHECK (actor_type IN ('admin', 'university', 'issuer', 'revoker', 'system')),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_universities_wallet ON universities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_universities_active ON universities(is_active);
CREATE INDEX IF NOT EXISTS idx_issuers_wallet ON issuers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_issuers_university ON issuers(university_id);
CREATE INDEX IF NOT EXISTS idx_revokers_wallet ON revokers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_revokers_university ON revokers(university_id);
CREATE INDEX IF NOT EXISTS idx_degrees_student ON degrees(student_address);
CREATE INDEX IF NOT EXISTS idx_degrees_university ON degrees(university_id);
CREATE INDEX IF NOT EXISTS idx_degrees_token ON degrees(token_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_approvals(status);
CREATE INDEX IF NOT EXISTS idx_activity_actor ON activity_logs(actor_address);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
