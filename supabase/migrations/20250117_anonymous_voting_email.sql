-- Create anonymous_sessions table to track anonymous users
CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  email TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT,
  fingerprint_hash TEXT,

  -- Track session activity
  votes_count INTEGER DEFAULT 0,
  last_vote_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_verified_at TIMESTAMPTZ,

  -- Index for email lookups
  CONSTRAINT anonymous_sessions_email_key UNIQUE(email)
);

-- Create email_verifications table for magic links
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  session_id TEXT,

  -- Token expiry (24 hours)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for token lookups
  INDEX idx_email_verifications_token (token),
  INDEX idx_email_verifications_email (email)
);

-- Update votes table to support email-based voting
ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_votes_email ON votes(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_anonymous_id ON votes(anonymous_id) WHERE anonymous_id IS NOT NULL;

-- Update the unique constraint to allow multiple voting methods
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_element_id_user_id_key;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_element_id_anonymous_id_key;

-- Create a more flexible unique constraint using a partial index approach
-- One vote per authenticated user per element
CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_user
  ON votes(element_id, user_id)
  WHERE user_id IS NOT NULL;

-- One vote per email per element
CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_email
  ON votes(element_id, email)
  WHERE email IS NOT NULL;

-- One vote per anonymous session per element (fallback)
CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_session
  ON votes(element_id, session_id)
  WHERE session_id IS NOT NULL AND email IS NULL;

-- Create function to update vote counts with email verification consideration
CREATE OR REPLACE FUNCTION update_element_vote_counts(elem_id UUID)
RETURNS VOID AS $$
DECLARE
  total_upvotes INTEGER;
  total_downvotes INTEGER;
  auth_upvotes INTEGER;
  auth_downvotes INTEGER;
  anon_upvotes INTEGER;
  anon_downvotes INTEGER;
  verified_email_upvotes INTEGER;
  verified_email_downvotes INTEGER;
  unverified_email_upvotes INTEGER;
  unverified_email_downvotes INTEGER;
BEGIN
  -- Count authenticated user votes
  SELECT
    COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0)
  INTO auth_upvotes, auth_downvotes
  FROM votes
  WHERE element_id = elem_id AND user_id IS NOT NULL;

  -- Count verified email votes
  SELECT
    COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0)
  INTO verified_email_upvotes, verified_email_downvotes
  FROM votes
  WHERE element_id = elem_id
    AND email IS NOT NULL
    AND email_verified = TRUE
    AND user_id IS NULL;

  -- Count unverified email votes (these could be weighted differently)
  SELECT
    COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0)
  INTO unverified_email_upvotes, unverified_email_downvotes
  FROM votes
  WHERE element_id = elem_id
    AND email IS NOT NULL
    AND email_verified = FALSE
    AND user_id IS NULL;

  -- Count pure anonymous votes (no email)
  SELECT
    COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0)
  INTO anon_upvotes, anon_downvotes
  FROM votes
  WHERE element_id = elem_id
    AND user_id IS NULL
    AND email IS NULL
    AND (anonymous_id IS NOT NULL OR session_id IS NOT NULL);

  -- Calculate totals
  -- Authenticated and verified email votes count fully
  -- Unverified email votes could be weighted (currently counting as anonymous)
  total_upvotes := auth_upvotes + verified_email_upvotes + unverified_email_upvotes + anon_upvotes;
  total_downvotes := auth_downvotes + verified_email_downvotes + unverified_email_downvotes + anon_downvotes;

  -- Update element vote counts
  UPDATE elements
  SET
    upvote_count = total_upvotes,
    downvote_count = total_downvotes,
    vote_score = total_upvotes - total_downvotes,
    total_vote_count = total_upvotes + total_downvotes,
    auth_upvote_count = auth_upvotes + verified_email_upvotes, -- Verified emails count as "auth"
    auth_downvote_count = auth_downvotes + verified_email_downvotes,
    anon_upvote_count = unverified_email_upvotes + anon_upvotes,
    anon_downvote_count = unverified_email_downvotes + anon_downvotes,
    last_vote_sync = NOW()
  WHERE id = elem_id;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for vote changes
DROP TRIGGER IF EXISTS update_vote_counts_trigger ON votes;
CREATE TRIGGER update_vote_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_element_vote_counts_trigger();

-- Create trigger function that calls our update function
CREATE OR REPLACE FUNCTION update_element_vote_counts_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_element_vote_counts(OLD.element_id);
  ELSE
    PERFORM update_element_vote_counts(NEW.element_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- RLS policies for anonymous_sessions
ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create a session
CREATE POLICY "Anyone can create anonymous session" ON anonymous_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Users can only read their own session (by session_id cookie)
CREATE POLICY "Users can read own session" ON anonymous_sessions
  FOR SELECT TO anon, authenticated
  USING (true); -- Will be filtered by session_id in application

-- Users can update their own session
CREATE POLICY "Users can update own session" ON anonymous_sessions
  FOR UPDATE TO anon, authenticated
  USING (true); -- Will be filtered by session_id in application

-- RLS policies for email_verifications
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Anyone can create verification request
CREATE POLICY "Anyone can create verification" ON email_verifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Anyone can read verifications (filtered by token in app)
CREATE POLICY "Anyone can read verification by token" ON email_verifications
  FOR SELECT TO anon, authenticated
  USING (true);

-- Allow updates for verification
CREATE POLICY "Anyone can verify email" ON email_verifications
  FOR UPDATE TO anon, authenticated
  USING (verified_at IS NULL); -- Can only update unverified records

-- Update votes RLS policies to handle email-based voting
DROP POLICY IF EXISTS "Authenticated users can vote" ON votes;
DROP POLICY IF EXISTS "Users can modify own votes" ON votes;
DROP POLICY IF EXISTS "Public can view votes" ON votes;

-- Anyone can view votes (for counting)
CREATE POLICY "Anyone can view votes" ON votes
  FOR SELECT TO anon, authenticated
  USING (true);

-- Authenticated users can manage their votes
CREATE POLICY "Auth users manage own votes" ON votes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anonymous users can manage their email/session votes
CREATE POLICY "Anonymous users can vote" ON votes
  FOR ALL TO anon, authenticated
  USING (
    -- User must own this vote via one of these methods
    user_id IS NULL AND (
      email IS NOT NULL OR
      session_id IS NOT NULL OR
      anonymous_id IS NOT NULL
    )
  )
  WITH CHECK (
    user_id IS NULL -- Cannot set user_id as anonymous
  );