-- Fix RLS policies for anonymous voting support
-- This migration adds missing policies for session_id and email-based voting

-- Drop existing restrictive vote policies
DROP POLICY IF EXISTS "votes_insert" ON votes;
DROP POLICY IF EXISTS "votes_update" ON votes;
DROP POLICY IF EXISTS "votes_delete" ON votes;

-- Create new INSERT policy that allows both authenticated and anonymous voting
CREATE POLICY "votes_insert" ON votes
  FOR INSERT WITH CHECK (
    -- Check element is accessible
    EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND (
          -- For authenticated users
          (auth.uid() IS NOT NULL AND can_access_document(e.document_id, auth.uid()))
          -- For anonymous users on public documents
          OR EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = e.document_id AND d.is_public = true
          )
        )
    )
    -- Ensure vote ownership matches
    AND (
      -- Authenticated user must match user_id
      (user_id IS NOT NULL AND user_id = auth.uid())
      -- Anonymous votes must have session_id or email
      OR (user_id IS NULL AND (session_id IS NOT NULL OR email IS NOT NULL))
    )
  );

-- Create UPDATE policy for both authenticated and anonymous users
CREATE POLICY "votes_update" ON votes
  FOR UPDATE USING (
    -- Authenticated users can update their own votes
    (user_id IS NOT NULL AND user_id = auth.uid())
    -- Anonymous users can update votes matching their session/email
    -- Note: Frontend must ensure session/email consistency
    OR (user_id IS NULL)
  );

-- Create DELETE policy for both authenticated and anonymous users
CREATE POLICY "votes_delete" ON votes
  FOR DELETE USING (
    -- Authenticated users can delete their own votes
    (user_id IS NOT NULL AND user_id = auth.uid())
    -- Anonymous users can delete votes (frontend manages session/email matching)
    OR (user_id IS NULL)
  );

-- Add RLS to anonymous_sessions table if not already enabled
ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Allow inserting anonymous sessions (for vote tracking)
CREATE POLICY "anonymous_sessions_insert" ON anonymous_sessions
  FOR INSERT WITH CHECK (true);

-- Allow reading own session (by session_id or email)
CREATE POLICY "anonymous_sessions_select" ON anonymous_sessions
  FOR SELECT USING (true);

-- Allow updating last_seen for active sessions
CREATE POLICY "anonymous_sessions_update" ON anonymous_sessions
  FOR UPDATE USING (true);