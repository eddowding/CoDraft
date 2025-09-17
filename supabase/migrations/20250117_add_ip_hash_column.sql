-- Add ip_hash column for privacy-compliant IP storage
-- Keep original ip_address column for backward compatibility but make it nullable

-- Add new column for hashed IP
ALTER TABLE anonymous_sessions
ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- Make original ip_address column nullable (for privacy compliance)
ALTER TABLE anonymous_sessions
ALTER COLUMN ip_address DROP NOT NULL;

-- Add index on ip_hash for efficient lookups
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_ip_hash
ON anonymous_sessions(ip_hash)
WHERE ip_hash IS NOT NULL;