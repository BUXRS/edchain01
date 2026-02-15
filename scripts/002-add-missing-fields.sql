-- Add missing fields to universities table
ALTER TABLE universities ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE universities ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Add status field to degrees table if missing
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Create university_registrations table
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

-- Create indexes for university_registrations
CREATE INDEX IF NOT EXISTS idx_registrations_university ON university_registrations(university_id);
CREATE INDEX IF NOT EXISTS idx_registrations_token ON university_registrations(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON university_registrations(payment_status);

-- Add missing fields to admin_users table
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing fields to pending_approvals table
ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS requester_email VARCHAR(255);
ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255);
ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing fields to degrees table
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(42);
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
