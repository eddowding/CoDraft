-- Remove anonymous voting system and require authentication for all votes
-- This migration simplifies the voting system to use magic link authentication only

-- =====================================================
-- 1. Drop anonymous voting infrastructure
-- =====================================================

-- Drop anonymous session management
DROP TABLE IF EXISTS anonymous_sessions CASCADE;

-- Drop anonymous vote mutation function
DROP FUNCTION IF EXISTS mutate_anonymous_vote(TEXT, UUID, INTEGER, TEXT, TEXT) CASCADE;

-- =====================================================
-- 2. Clean up votes table
-- =====================================================

-- First, drop all policies that depend on the columns we're removing
DROP POLICY IF EXISTS "Anonymous users can vote" ON votes;
DROP POLICY IF EXISTS "votes_insert" ON votes;
DROP POLICY IF EXISTS "votes_insert_anonymous_secure" ON votes;
DROP POLICY IF EXISTS "votes_insert_authenticated_only" ON votes;
DROP POLICY IF EXISTS "votes_update" ON votes;
DROP POLICY IF EXISTS "votes_delete" ON votes;
DROP POLICY IF EXISTS "votes_update_authenticated_only" ON votes;
DROP POLICY IF EXISTS "votes_delete_authenticated_only" ON votes;
DROP POLICY IF EXISTS "votes_select_public" ON votes;

-- Delete all anonymous votes (votes without user_id)
DELETE FROM votes WHERE user_id IS NULL;

-- Remove anonymous voting columns
ALTER TABLE votes
  DROP COLUMN IF EXISTS session_id CASCADE,
  DROP COLUMN IF EXISTS email CASCADE,
  DROP COLUMN IF EXISTS email_verified CASCADE;

-- Make user_id required (all votes must be authenticated)
ALTER TABLE votes
  ALTER COLUMN user_id SET NOT NULL;

-- Drop old unique constraints that included session_id and email
DROP INDEX IF EXISTS votes_unique_session_element;
DROP INDEX IF EXISTS votes_unique_email_element;

-- Create new unique constraint: one vote per user per element
CREATE UNIQUE INDEX votes_unique_user_element
ON votes(element_id, user_id);

-- =====================================================
-- 3. Simplify elements table
-- =====================================================

-- Remove anonymous vote tracking columns
ALTER TABLE elements
  DROP COLUMN IF EXISTS anon_upvote_count,
  DROP COLUMN IF EXISTS anon_downvote_count;

-- Keep only authenticated vote counts
-- (auth_upvote_count, auth_downvote_count, vote_score, upvote_count, downvote_count)

-- =====================================================
-- 4. Update vote counting function
-- =====================================================

-- Simplified version without anonymous vote tracking
CREATE OR REPLACE FUNCTION calculate_element_vote_counts(elem_id UUID)
RETURNS TABLE (
  total_upvotes INTEGER,
  total_downvotes INTEGER,
  total_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END)::INTEGER, 0) as total_upvotes,
    COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END)::INTEGER, 0) as total_downvotes,
    COALESCE(SUM(v.value)::INTEGER, 0) as total_score
  FROM votes v
  WHERE v.element_id = elem_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger function to use simplified counts
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
    auth_upvote_count = counts.total_upvotes,  -- All votes are authenticated now
    auth_downvote_count = counts.total_downvotes,
    updated_at = NOW()
  WHERE id = elem_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (in case it needs refresh)
DROP TRIGGER IF EXISTS update_element_votes_on_vote_change ON votes;
CREATE TRIGGER update_element_votes_on_vote_change
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW
EXECUTE FUNCTION update_element_vote_counts_trigger();

-- =====================================================
-- 5. Simplify RLS policies
-- =====================================================

-- Policies were already dropped above
-- Create simple, clean policies for authenticated users only

-- Anyone can read votes on public documents
CREATE POLICY "votes_select_public" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM elements e
      JOIN documents d ON d.id = e.document_id
      WHERE e.id = element_id
        AND d.is_public = true
    )
  );

-- Authenticated users can insert votes on public documents
CREATE POLICY "votes_insert_authenticated" ON votes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM elements e
      JOIN documents d ON d.id = e.document_id
      WHERE e.id = element_id
        AND d.is_public = true
    )
  );

-- Users can update their own votes
CREATE POLICY "votes_update_own" ON votes
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Users can delete their own votes
CREATE POLICY "votes_delete_own" ON votes
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- =====================================================
-- 6. Recalculate all vote counts
-- =====================================================

-- Update all elements to have correct counts after cleanup
DO $$
DECLARE
  elem RECORD;
  counts RECORD;
BEGIN
  FOR elem IN SELECT id FROM elements LOOP
    SELECT * INTO counts FROM calculate_element_vote_counts(elem.id);

    UPDATE elements
    SET
      upvote_count = counts.total_upvotes,
      downvote_count = counts.total_downvotes,
      vote_score = counts.total_score,
      auth_upvote_count = counts.total_upvotes,
      auth_downvote_count = counts.total_downvotes,
      updated_at = NOW()
    WHERE id = elem.id;
  END LOOP;
END $$;

-- =====================================================
-- 7. Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION calculate_element_vote_counts TO authenticated;
GRANT EXECUTE ON FUNCTION update_element_vote_counts_trigger TO authenticated;

-- =====================================================
-- Migration complete
-- =====================================================
-- All votes now require authentication via magic link
-- Anonymous voting infrastructure has been removed
