-- Create Missing Tables
-- Run this script if you're missing: admin_users, pending_approvals, or university_registrations

-- Admin users table (for super admin access)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  is_super_admin BOOLEAN DEFAULT false,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pending approvals table (for wallet role requests)
CREATE TABLE IF NOT EXISTS pending_approvals (
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

-- University registrations table (for subscription and onboarding)
CREATE TABLE IF NOT EXISTS university_registrations (
  id SERIAL PRIMARY KEY,
  university_id INTEGER UNIQUE REFERENCES universities(id) ON DELETE CASCADE,
  registration_type VARCHAR(50) DEFAULT 'subscription',
  subscription_plan VARCHAR(50),
  is_trial BOOLEAN DEFAULT false,
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  nda_signed BOOLEAN DEFAULT false,
  wallet_submitted BOOLEAN DEFAULT false,
  account_activated BOOLEAN DEFAULT false,
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  onboarding_token VARCHAR(255),
  onboarding_token_expires_at TIMESTAMP WITH TIME ZONE,
  wallet_address VARCHAR(42),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_status ON pending_approvals(status);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_university ON pending_approvals(university_id);
CREATE INDEX IF NOT EXISTS idx_registrations_university ON university_registrations(university_id);
CREATE INDEX IF NOT EXISTS idx_registrations_token ON university_registrations(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON university_registrations(payment_status);
