-- Complete fix for voting system issues
-- Addresses: duplicate votes, column inconsistencies, RLS security, and trigger conflicts

-- =====================================================
-- 1. Fix column inconsistencies (remove anonymous_id references)
-- =====================================================

-- Drop any indexes that reference anonymous_id (if they exist)
DROP INDEX IF EXISTS idx_votes_anonymous_id;
DROP INDEX IF EXISTS idx_votes_anonymous_element_unique;

-- =====================================================
-- 2. Fix unique constraints to prevent duplicates
-- =====================================================

-- Drop existing problematic constraints
DROP INDEX IF EXISTS votes_unique_session;

-- Add proper unique constraint for session-based votes
-- This prevents one session from having multiple votes on same element
CREATE UNIQUE INDEX votes_unique_session_element
ON votes(element_id, session_id)
WHERE session_id IS NOT NULL;

-- Ensure email uniqueness remains
-- (already exists as votes_unique_email but let's make sure)
DROP INDEX IF EXISTS votes_unique_email;
CREATE UNIQUE INDEX votes_unique_email_element
ON votes(element_id, email)
WHERE email IS NOT NULL;

-- =====================================================
-- 3. Consolidate and fix vote counting triggers
-- =====================================================

-- Drop old triggers and functions that reference anonymous_id
DROP TRIGGER IF EXISTS on_vote_change ON votes;
DROP FUNCTION IF EXISTS update_element_vote_counts();

-- Use only the newer, correct counting function
-- (The one from 20250117_anonymous_voting_email.sql is correct)
-- Ensure it exists and is properly configured
CREATE OR REPLACE FUNCTION calculate_element_vote_counts(elem_id UUID)
RETURNS TABLE (
  total_upvotes INTEGER,
  total_downvotes INTEGER,
  total_score INTEGER,
  auth_upvotes INTEGER,
  auth_downvotes INTEGER,
  anon_upvotes INTEGER,
  anon_downvotes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total counts
    COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END)::INTEGER, 0) as total_upvotes,
    COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END)::INTEGER, 0) as total_downvotes,
    COALESCE(SUM(v.value)::INTEGER, 0) as total_score,
    -- Authenticated user counts (includes verified emails)
    COALESCE(SUM(CASE WHEN v.value = 1 AND (v.user_id IS NOT NULL OR v.email_verified = true) THEN 1 ELSE 0 END)::INTEGER, 0) as auth_upvotes,
    COALESCE(SUM(CASE WHEN v.value = -1 AND (v.user_id IS NOT NULL OR v.email_verified = true) THEN 1 ELSE 0 END)::INTEGER, 0) as auth_downvotes,
    -- Anonymous counts (unverified only)
    COALESCE(SUM(CASE WHEN v.value = 1 AND v.user_id IS NULL AND (v.email_verified IS FALSE OR v.email_verified IS NULL) THEN 1 ELSE 0 END)::INTEGER, 0) as anon_upvotes,
    COALESCE(SUM(CASE WHEN v.value = -1 AND v.user_id IS NULL AND (v.email_verified IS FALSE OR v.email_verified IS NULL) THEN 1 ELSE 0 END)::INTEGER, 0) as anon_downvotes
  FROM votes v
  WHERE v.element_id = elem_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger function exists
CREATE OR REPLACE FUNCTION update_element_vote_counts_trigger()
RETURNS TRIGGER AS $$
DECLARE
  elem_id UUID;
  counts RECORD;
BEGIN
  -- Determine which element to update
  IF TG_OP = 'DELETE' THEN
    elem_id := OLD.element_id;
  ELSE
    elem_id := NEW.element_id;
  END IF;

  -- Get the calculated counts
  SELECT * INTO counts FROM calculate_element_vote_counts(elem_id);

  -- Update the element with new counts
  UPDATE elements
  SET
    upvote_count = counts.total_upvotes,
    downvote_count = counts.total_downvotes,
    vote_score = counts.total_score,
    auth_upvote_count = counts.auth_upvotes,
    auth_downvote_count = counts.auth_downvotes,
    anon_upvote_count = counts.anon_upvotes,
    anon_downvote_count = counts.anon_downvotes,
    updated_at = NOW()
  WHERE id = elem_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure clean state
DROP TRIGGER IF EXISTS update_element_votes_on_vote_change ON votes;
CREATE TRIGGER update_element_votes_on_vote_change
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW
EXECUTE FUNCTION update_element_vote_counts_trigger();

-- =====================================================
-- 4. Fix RLS policies for proper security
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "votes_update" ON votes;
DROP POLICY IF EXISTS "votes_delete" ON votes;

-- Create secure policies for anonymous voting

-- Anonymous users can only INSERT votes on public documents
CREATE POLICY "votes_insert_anonymous_secure" ON votes
  FOR INSERT WITH CHECK (
    -- Must be for a public document element
    EXISTS (
      SELECT 1 FROM elements e
      JOIN documents d ON d.id = e.document_id
      WHERE e.id = element_id
        AND d.is_public = true
        AND d.login_not_required = true
    )
    -- Must provide session_id for anonymous votes
    AND (
      (user_id IS NOT NULL AND user_id = auth.uid())
      OR (user_id IS NULL AND session_id IS NOT NULL)
    )
  );

-- Only authenticated users can update their own votes
CREATE POLICY "votes_update_authenticated_only" ON votes
  FOR UPDATE USING (
    user_id IS NOT NULL AND user_id = auth.uid()
  );

-- Only authenticated users can delete their own votes
CREATE POLICY "votes_delete_authenticated_only" ON votes
  FOR DELETE USING (
    user_id IS NOT NULL AND user_id = auth.uid()
  );

-- Note: Anonymous vote updates/deletes will be handled via API route with session validation

-- =====================================================
-- 5. Ensure anonymous_sessions table is properly configured
-- =====================================================

-- Add index for cookie-based lookups if not exists
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_cookie
ON anonymous_sessions(session_id);

-- Add cleanup policy for old sessions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_anonymous_sessions()
RETURNS void AS $$
BEGIN
  -- Delete sessions older than 30 days with no recent activity
  DELETE FROM anonymous_sessions
  WHERE last_seen < NOW() - INTERVAL '30 days';

  -- Also delete orphaned anonymous votes (where session no longer exists)
  DELETE FROM votes v
  WHERE v.user_id IS NULL
    AND v.session_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM anonymous_sessions a
      WHERE a.session_id = v.session_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Add function for safe anonymous vote mutations
-- =====================================================

-- This function will be called from API routes with proper session validation
CREATE OR REPLACE FUNCTION mutate_anonymous_vote(
  p_session_id TEXT,
  p_element_id UUID,
  p_value INTEGER,
  p_email TEXT DEFAULT NULL,
  p_operation TEXT DEFAULT 'upsert' -- 'upsert' or 'delete'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_exists BOOLEAN;
  v_existing_email TEXT;
BEGIN
  -- Validate session exists
  SELECT EXISTS(
    SELECT 1 FROM anonymous_sessions
    WHERE session_id = p_session_id
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  -- Get email associated with this session if any
  SELECT email INTO v_existing_email
  FROM anonymous_sessions
  WHERE session_id = p_session_id;

  IF p_operation = 'delete' THEN
    -- Delete votes by both session_id and email to prevent orphans
    DELETE FROM votes
    WHERE element_id = p_element_id
      AND (
        session_id = p_session_id
        OR (v_existing_email IS NOT NULL AND email = v_existing_email)
        OR (p_email IS NOT NULL AND email = p_email)
      );
  ELSE -- upsert
    -- First, remove any existing votes for this element by this session/email
    DELETE FROM votes
    WHERE element_id = p_element_id
      AND (
        session_id = p_session_id
        OR (v_existing_email IS NOT NULL AND email = v_existing_email)
        OR (p_email IS NOT NULL AND email = p_email)
      );

    -- Then insert the new vote
    INSERT INTO votes (element_id, value, session_id, email, email_verified)
    VALUES (
      p_element_id,
      p_value,
      p_session_id,
      COALESCE(p_email, v_existing_email),
      FALSE
    );

    -- Update session with email if provided
    IF p_email IS NOT NULL AND v_existing_email IS NULL THEN
      UPDATE anonymous_sessions
      SET email = p_email, email_verified = FALSE
      WHERE session_id = p_session_id;
    END IF;
  END IF;

  -- Update last_seen for the session
  UPDATE anonymous_sessions
  SET last_seen = NOW()
  WHERE session_id = p_session_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated role (will be called via service role from API)
GRANT EXECUTE ON FUNCTION mutate_anonymous_vote TO service_role;