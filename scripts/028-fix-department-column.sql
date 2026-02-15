-- Migration: Fix department column (departr typo)
-- Ensures issuers, revokers, and verifiers have a proper "department" column.
-- Run this if your DB has "departr" or is missing "department".

-- Issuers: rename departr -> department if typo exists; otherwise add department if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issuers' AND column_name = 'departr'
  ) THEN
    ALTER TABLE issuers RENAME COLUMN departr TO department;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issuers' AND column_name = 'department'
  ) THEN
    ALTER TABLE issuers ADD COLUMN department VARCHAR(255);
  END IF;
END $$;

-- Revokers: same
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revokers' AND column_name = 'departr'
  ) THEN
    ALTER TABLE revokers RENAME COLUMN departr TO department;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revokers' AND column_name = 'department'
  ) THEN
    ALTER TABLE revokers ADD COLUMN department VARCHAR(255);
  END IF;
END $$;

-- Verifiers: same
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verifiers' AND column_name = 'departr'
  ) THEN
    ALTER TABLE verifiers RENAME COLUMN departr TO department;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verifiers' AND column_name = 'department'
  ) THEN
    ALTER TABLE verifiers ADD COLUMN department VARCHAR(255);
  END IF;
END $$;
