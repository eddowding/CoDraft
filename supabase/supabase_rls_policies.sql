-- =====================================================
-- CoDraft Supabase RLS (Row Level Security) Policies
-- Comprehensive security policies for all tables
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Helper Functions for RLS Policies
-- =====================================================

-- Check if user is document owner
CREATE OR REPLACE FUNCTION is_document_owner(doc_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM documents
    WHERE id = doc_id AND author_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is document collaborator with specific role
CREATE OR REPLACE FUNCTION is_document_collaborator(doc_id UUID, user_id UUID, min_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_hierarchy INTEGER;
  min_role_hierarchy INTEGER;
BEGIN
  -- Get user's role for the document
  SELECT role INTO user_role
  FROM document_collaborators
  WHERE document_id = doc_id
    AND user_id = user_id
    AND accepted_at IS NOT NULL;

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Role hierarchy: viewer(1) < commenter(2) < editor(3) < admin(4)
  role_hierarchy := CASE user_role
    WHEN 'viewer' THEN 1
    WHEN 'commenter' THEN 2
    WHEN 'editor' THEN 3
    WHEN 'admin' THEN 4
    ELSE 0
  END;

  min_role_hierarchy := CASE min_role
    WHEN 'viewer' THEN 1
    WHEN 'commenter' THEN 2
    WHEN 'editor' THEN 3
    WHEN 'admin' THEN 4
    ELSE 999
  END;

  RETURN role_hierarchy >= min_role_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access document (owner, collaborator, or public)
CREATE OR REPLACE FUNCTION can_access_document(doc_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = doc_id
      AND (
        d.is_public = true
        OR d.author_id = user_id
        OR is_document_collaborator(doc_id, user_id, 'viewer')
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can edit document content
CREATE OR REPLACE FUNCTION can_edit_document(doc_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_document_owner(doc_id, user_id)
    OR is_document_collaborator(doc_id, user_id, 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- User Profiles RLS Policies
-- =====================================================

-- Users can view all profiles
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING (true);

-- Users can only insert their own profile
CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users cannot delete profiles (handled by auth.users cascade)
CREATE POLICY "user_profiles_delete" ON user_profiles
  FOR DELETE USING (false);

-- =====================================================
-- Documents RLS Policies
-- =====================================================

-- Users can view public documents or documents they own/collaborate on
CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (
    is_public = true
    OR author_id = auth.uid()
    OR can_access_document(id, auth.uid())
  );

-- Authenticated users can create documents
CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
  );

-- Document owners and admins can update documents
CREATE POLICY "documents_update" ON documents
  FOR UPDATE USING (
    author_id = auth.uid()
    OR is_document_collaborator(id, auth.uid(), 'admin')
  );

-- Only document owners can delete documents
CREATE POLICY "documents_delete" ON documents
  FOR DELETE USING (author_id = auth.uid());

-- =====================================================
-- Document Collaborators RLS Policies
-- =====================================================

-- Users can view collaborators for documents they can access
CREATE POLICY "collaborators_select" ON document_collaborators
  FOR SELECT USING (can_access_document(document_id, auth.uid()));

-- Document owners and admins can add collaborators
CREATE POLICY "collaborators_insert" ON document_collaborators
  FOR INSERT WITH CHECK (
    is_document_owner(document_id, auth.uid())
    OR is_document_collaborator(document_id, auth.uid(), 'admin')
  );

-- Document owners, admins, and the collaborator themselves can update
CREATE POLICY "collaborators_update" ON document_collaborators
  FOR UPDATE USING (
    is_document_owner(document_id, auth.uid())
    OR is_document_collaborator(document_id, auth.uid(), 'admin')
    OR user_id = auth.uid() -- Users can accept invitations
  );

-- Document owners and admins can remove collaborators
CREATE POLICY "collaborators_delete" ON document_collaborators
  FOR DELETE USING (
    is_document_owner(document_id, auth.uid())
    OR is_document_collaborator(document_id, auth.uid(), 'admin')
    OR user_id = auth.uid() -- Users can remove themselves
  );

-- =====================================================
-- Elements RLS Policies
-- =====================================================

-- Users can view elements for documents they can access
CREATE POLICY "elements_select" ON elements
  FOR SELECT USING (can_access_document(document_id, auth.uid()));

-- Users with edit access can create elements
CREATE POLICY "elements_insert" ON elements
  FOR INSERT WITH CHECK (can_edit_document(document_id, auth.uid()));

-- Users with edit access can update elements
CREATE POLICY "elements_update" ON elements
  FOR UPDATE USING (can_edit_document(document_id, auth.uid()));

-- Users with edit access can delete elements
CREATE POLICY "elements_delete" ON elements
  FOR DELETE USING (can_edit_document(document_id, auth.uid()));

-- =====================================================
-- Comments RLS Policies
-- =====================================================

-- Users can view comments for elements they can access
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND can_access_document(e.document_id, auth.uid())
    )
    AND is_deleted = false
  );

-- Users with comment access can create comments
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND (
          can_edit_document(e.document_id, auth.uid())
          OR is_document_collaborator(e.document_id, auth.uid(), 'commenter')
        )
    )
  );

-- Users can update their own comments, admins can resolve any comment
CREATE POLICY "comments_update" ON comments
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND (
          is_document_owner(e.document_id, auth.uid())
          OR is_document_collaborator(e.document_id, auth.uid(), 'admin')
        )
    )
  );

-- Users can delete their own comments, admins can delete any comment
CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND (
          is_document_owner(e.document_id, auth.uid())
          OR is_document_collaborator(e.document_id, auth.uid(), 'admin')
        )
    )
  );

-- =====================================================
-- Votes RLS Policies
-- =====================================================

-- Users can view votes for elements they can access
CREATE POLICY "votes_select" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND can_access_document(e.document_id, auth.uid())
    )
  );

-- Authenticated users can vote on accessible elements
CREATE POLICY "votes_insert" ON votes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND can_access_document(e.document_id, auth.uid())
    )
  );

-- Users can update their own votes
CREATE POLICY "votes_update" ON votes
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "votes_delete" ON votes
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- Versions RLS Policies
-- =====================================================

-- Users can view versions for elements they can access
CREATE POLICY "versions_select" ON versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND can_access_document(e.document_id, auth.uid())
    )
  );

-- Versions are created automatically by triggers, not directly by users
CREATE POLICY "versions_insert" ON versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND can_edit_document(e.document_id, auth.uid())
    )
  );

-- Versions are immutable - no updates allowed
CREATE POLICY "versions_update" ON versions
  FOR UPDATE USING (false);

-- Only document owners can delete version history
CREATE POLICY "versions_delete" ON versions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND is_document_owner(e.document_id, auth.uid())
    )
  );

-- =====================================================
-- Views RLS Policies
-- =====================================================

-- Users can view analytics for documents they own or admin
CREATE POLICY "views_select" ON views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND (
          is_document_owner(e.document_id, auth.uid())
          OR is_document_collaborator(e.document_id, auth.uid(), 'admin')
        )
    )
  );

-- Views are created automatically for any accessible element
CREATE POLICY "views_insert" ON views
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND can_access_document(e.document_id, auth.uid())
    )
  );

-- Views are immutable
CREATE POLICY "views_update" ON views
  FOR UPDATE USING (false);

-- Only document owners can delete view history
CREATE POLICY "views_delete" ON views
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM elements e
      WHERE e.id = element_id
        AND is_document_owner(e.document_id, auth.uid())
    )
  );

-- =====================================================
-- Presence RLS Policies
-- =====================================================

-- Users can view presence for documents they can access
CREATE POLICY "presence_select" ON presence
  FOR SELECT USING (can_access_document(document_id, auth.uid()));

-- Users can create their own presence
CREATE POLICY "presence_insert" ON presence
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND can_access_document(document_id, auth.uid())
  );

-- Users can update their own presence
CREATE POLICY "presence_update" ON presence
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own presence
CREATE POLICY "presence_delete" ON presence
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- Document Templates RLS Policies
-- =====================================================

-- Users can view public templates or their own templates
CREATE POLICY "templates_select" ON document_templates
  FOR SELECT USING (
    is_public = true
    OR created_by = auth.uid()
  );

-- Authenticated users can create templates
CREATE POLICY "templates_insert" ON document_templates
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- Users can update their own templates
CREATE POLICY "templates_update" ON document_templates
  FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their own templates
CREATE POLICY "templates_delete" ON document_templates
  FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- Additional Security Functions
-- =====================================================

-- Function to clean up expired presence records
CREATE OR REPLACE FUNCTION cleanup_expired_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM presence
  WHERE last_seen < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate document access before real-time subscription
CREATE OR REPLACE FUNCTION validate_document_subscription(doc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN can_access_document(doc_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant necessary permissions
-- =====================================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION is_document_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_document_collaborator(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_document(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_document(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_document_subscription(UUID) TO authenticated;

-- Grant execute permission on cleanup function to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_presence() TO service_role;