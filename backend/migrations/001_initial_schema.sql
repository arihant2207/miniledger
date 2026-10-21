-- Migration: 001_initial_schema.sql
-- Description: Creates the core tables (users, otps, loans) with relational integrity,
-- strict domain constraints, and query-optimized indexes.

-- Users table: stores authenticating phone numbers and system-assigned UUIDs
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OTPs table: stores single-use, hashed OTP codes with expiry and verification attempt counters
CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for rapid retrieval of recent OTP records during rate-limit checks and verification
CREATE INDEX IF NOT EXISTS idx_otps_phone_created ON otps(phone, created_at DESC);

-- Loans table: tracks money lent to friends
-- Stored as NUMERIC(12,2) to eliminate JavaScript IEEE 754 floating-point inaccuracies
-- due_date is DATE to eliminate time-zone skew across borders
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_name VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'repaid')),
    repaid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Primary composite index covering user summary aggregates and overdue lookups:
-- Query pattern: WHERE user_id = $1 AND status = 'pending' AND due_date < CURRENT_DATE
CREATE INDEX IF NOT EXISTS idx_loans_user_status_due ON loans(user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
