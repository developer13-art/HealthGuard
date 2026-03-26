-- Add suspended_until column to users table for temporary suspensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until timestamp;