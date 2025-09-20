-- Optimize voting by returning updated counts directly from mutate_anonymous_vote
-- This eliminates the need for client-side refetching after each vote

-- Drop the old function
DROP FUNCTION IF EXISTS mutate_anonymous_vote(TEXT, UUID, INTEGER, TEXT, TEXT);

-- Create new function that returns the updated vote counts
CREATE OR REPLACE FUNCTION mutate_anonymous_vote(
  p_session_id TEXT,
  p_element_id UUID,
  p_value INTEGER,
  p_email TEXT DEFAULT NULL,
  p_operation TEXT DEFAULT 'upsert' -- 'upsert' or 'delete'
)
RETURNS TABLE (
  vote_score INTEGER,
  upvote_count INTEGER,
  downvote_count INTEGER
) AS $$
DECLARE
  v_session_exists BOOLEAN;
  v_existing_email TEXT;
  v_new_score INTEGER;
  v_new_upvotes INTEGER;
  v_new_downvotes INTEGER;
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

  -- The trigger will update the counts, but we need to fetch the new values
  -- Wait a moment for the trigger to complete (this is usually instant)
  PERFORM pg_sleep(0.01);

  -- Get the updated counts from the elements table
  SELECT
    e.vote_score,
    e.upvote_count,
    e.downvote_count
  INTO
    v_new_score,
    v_new_upvotes,
    v_new_downvotes
  FROM elements e
  WHERE e.id = p_element_id;

  -- Return the updated counts
  RETURN QUERY SELECT v_new_score, v_new_upvotes, v_new_downvotes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anon roles (will be called via service role from API)
GRANT EXECUTE ON FUNCTION mutate_anonymous_vote TO service_role;
GRANT EXECUTE ON FUNCTION mutate_anonymous_vote TO authenticated;
GRANT EXECUTE ON FUNCTION mutate_anonymous_vote TO anon;