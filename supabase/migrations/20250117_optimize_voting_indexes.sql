-- Optimize voting system performance with better indexes and constraints

-- Add composite index for efficient vote lookups (covers all vote checking scenarios)
CREATE INDEX IF NOT EXISTS idx_votes_composite_lookup
ON votes(element_id, user_id, session_id, email)
WHERE user_id IS NOT NULL OR session_id IS NOT NULL OR email IS NOT NULL;

-- Add index for vote aggregation queries
CREATE INDEX IF NOT EXISTS idx_votes_element_value
ON votes(element_id, value);

-- Improve anonymous session lookups
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_lookup
ON anonymous_sessions(session_id, email)
WHERE session_id IS NOT NULL OR email IS NOT NULL;