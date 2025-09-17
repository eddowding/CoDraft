-- =====================================================
-- CoDraft Supabase Database Triggers
-- Real-time updates and automated workflows
-- =====================================================

-- =====================================================
-- Vote Count Synchronization Triggers
-- =====================================================

-- Function to update element vote counts
CREATE OR REPLACE FUNCTION update_element_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  elem_id UUID;
  total_upvotes INTEGER;
  total_downvotes INTEGER;
  auth_upvotes INTEGER;
  auth_downvotes INTEGER;
  anon_upvotes INTEGER;
  anon_downvotes INTEGER;
BEGIN
  -- Determine which element to update
  IF TG_OP = 'DELETE' THEN
    elem_id := OLD.element_id;
  ELSE
    elem_id := NEW.element_id;
  END IF;

  -- Calculate current vote counts (total)
  SELECT
    COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0)
  INTO total_upvotes, total_downvotes
  FROM votes
  WHERE element_id = elem_id;

  -- Calculate authenticated user vote counts
  SELECT
    COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0)
  INTO auth_upvotes, auth_downvotes
  FROM votes
  WHERE element_id = elem_id AND user_id IS NOT NULL;

  -- Calculate anonymous user vote counts
  SELECT
    COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0)
  INTO anon_upvotes, anon_downvotes
  FROM votes
  WHERE element_id = elem_id AND anonymous_id IS NOT NULL;

  -- Update element vote counts
  UPDATE elements
  SET
    upvote_count = total_upvotes,
    downvote_count = total_downvotes,
    total_vote_count = total_upvotes + total_downvotes,
    vote_score = total_upvotes - total_downvotes,
    auth_upvote_count = auth_upvotes,
    auth_downvote_count = auth_downvotes,
    anon_upvote_count = anon_upvotes,
    anon_downvote_count = anon_downvotes,
    last_vote_sync = NOW()
  WHERE id = elem_id;

  -- Return appropriate row for trigger
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for vote count updates
CREATE TRIGGER trigger_vote_insert_update_counts
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION update_element_vote_counts();

CREATE TRIGGER trigger_vote_update_update_counts
  AFTER UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_element_vote_counts();

CREATE TRIGGER trigger_vote_delete_update_counts
  AFTER DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_element_vote_counts();

-- =====================================================
-- Version History Triggers
-- =====================================================

-- Function to create version history on element updates
CREATE OR REPLACE FUNCTION create_element_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO versions (
      element_id,
      user_id,
      content,
      version_number,
      change_summary,
      is_major_change
    ) VALUES (
      NEW.id,
      COALESCE(auth.uid(), OLD.locked_by), -- Use current user or whoever locked the element
      OLD.content,
      OLD.version,
      CASE
        WHEN LENGTH(NEW.content) - LENGTH(OLD.content) > 100 THEN 'Major content addition'
        WHEN LENGTH(OLD.content) - LENGTH(NEW.content) > 100 THEN 'Major content deletion'
        ELSE 'Content modification'
      END,
      ABS(LENGTH(NEW.content) - LENGTH(OLD.content)) > 100
    );

    -- Increment version number
    NEW.version := OLD.version + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for version history
CREATE TRIGGER trigger_element_version_history
  BEFORE UPDATE ON elements
  FOR EACH ROW EXECUTE FUNCTION create_element_version();

-- =====================================================
-- Document Metadata Updates
-- =====================================================

-- Function to update document metadata
CREATE OR REPLACE FUNCTION update_document_metadata()
RETURNS TRIGGER AS $$
DECLARE
  doc_id UUID;
  word_count INTEGER;
  read_time INTEGER;
BEGIN
  -- Determine which document to update
  IF TG_OP = 'DELETE' THEN
    doc_id := OLD.document_id;
  ELSE
    doc_id := NEW.document_id;
  END IF;

  -- Calculate word count from all elements
  SELECT
    COALESCE(SUM(array_length(string_to_array(trim(content), ' '), 1)), 0)
  INTO word_count
  FROM elements
  WHERE document_id = doc_id
    AND type IN ('paragraph', 'heading', 'quote');

  -- Estimate reading time (average 200 words per minute)
  read_time := GREATEST(1, CEIL(word_count::FLOAT / 200));

  -- Update document metadata
  UPDATE documents
  SET
    word_count = word_count,
    estimated_read_time = read_time,
    updated_at = NOW()
  WHERE id = doc_id;

  -- Return appropriate row for trigger
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for document metadata updates
CREATE TRIGGER trigger_element_insert_update_doc
  AFTER INSERT ON elements
  FOR EACH ROW EXECUTE FUNCTION update_document_metadata();

CREATE TRIGGER trigger_element_update_update_doc
  AFTER UPDATE ON elements
  FOR EACH ROW EXECUTE FUNCTION update_document_metadata();

CREATE TRIGGER trigger_element_delete_update_doc
  AFTER DELETE ON elements
  FOR EACH ROW EXECUTE FUNCTION update_document_metadata();

-- =====================================================
-- User Profile Creation Trigger
-- =====================================================

-- Function to create user profile when user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    username,
    full_name,
    email_notifications,
    browser_notifications,
    theme
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    true,
    false,
    'system'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user profile creation
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- =====================================================
-- Presence Management Triggers
-- =====================================================

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_seen timestamp
  NEW.last_seen := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for presence updates
CREATE TRIGGER trigger_update_presence
  BEFORE UPDATE ON presence
  FOR EACH ROW EXECUTE FUNCTION update_user_presence();

-- =====================================================
-- Real-time Notification Triggers
-- =====================================================

-- Function to send real-time notifications
CREATE OR REPLACE FUNCTION notify_real_time_changes()
RETURNS TRIGGER AS $$
DECLARE
  notification_data JSONB;
  channel_name TEXT;
BEGIN
  -- Determine notification data and channel based on table
  CASE TG_TABLE_NAME
    WHEN 'comments' THEN
      channel_name := 'document_comments';
      notification_data := jsonb_build_object(
        'event', TG_OP,
        'table', TG_TABLE_NAME,
        'id', COALESCE(NEW.id, OLD.id),
        'element_id', COALESCE(NEW.element_id, OLD.element_id),
        'user_id', COALESCE(NEW.user_id, OLD.user_id),
        'timestamp', NOW()
      );

    WHEN 'votes' THEN
      channel_name := 'element_votes';
      notification_data := jsonb_build_object(
        'event', TG_OP,
        'table', TG_TABLE_NAME,
        'id', COALESCE(NEW.id, OLD.id),
        'element_id', COALESCE(NEW.element_id, OLD.element_id),
        'value', COALESCE(NEW.value, OLD.value),
        'timestamp', NOW()
      );

    WHEN 'elements' THEN
      channel_name := 'document_elements';
      notification_data := jsonb_build_object(
        'event', TG_OP,
        'table', TG_TABLE_NAME,
        'id', COALESCE(NEW.id, OLD.id),
        'document_id', COALESCE(NEW.document_id, OLD.document_id),
        'locked_by', COALESCE(NEW.locked_by, OLD.locked_by),
        'timestamp', NOW()
      );

    WHEN 'presence' THEN
      channel_name := 'user_presence';
      notification_data := jsonb_build_object(
        'event', TG_OP,
        'table', TG_TABLE_NAME,
        'user_id', COALESCE(NEW.user_id, OLD.user_id),
        'document_id', COALESCE(NEW.document_id, OLD.document_id),
        'is_active', COALESCE(NEW.is_active, OLD.is_active),
        'timestamp', NOW()
      );

    WHEN 'document_collaborators' THEN
      channel_name := 'document_collaborators';
      notification_data := jsonb_build_object(
        'event', TG_OP,
        'table', TG_TABLE_NAME,
        'document_id', COALESCE(NEW.document_id, OLD.document_id),
        'user_id', COALESCE(NEW.user_id, OLD.user_id),
        'role', COALESCE(NEW.role, OLD.role),
        'timestamp', NOW()
      );

    ELSE
      RETURN COALESCE(NEW, OLD);
  END CASE;

  -- Send notification
  PERFORM pg_notify(channel_name, notification_data::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Real-time notification triggers
CREATE TRIGGER trigger_comments_real_time
  AFTER INSERT OR UPDATE OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_real_time_changes();

CREATE TRIGGER trigger_votes_real_time
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION notify_real_time_changes();

CREATE TRIGGER trigger_elements_real_time
  AFTER INSERT OR UPDATE OR DELETE ON elements
  FOR EACH ROW EXECUTE FUNCTION notify_real_time_changes();

CREATE TRIGGER trigger_presence_real_time
  AFTER INSERT OR UPDATE OR DELETE ON presence
  FOR EACH ROW EXECUTE FUNCTION notify_real_time_changes();

CREATE TRIGGER trigger_collaborators_real_time
  AFTER INSERT OR UPDATE OR DELETE ON document_collaborators
  FOR EACH ROW EXECUTE FUNCTION notify_real_time_changes();

-- =====================================================
-- Element Locking Management
-- =====================================================

-- Function to handle element locking/unlocking
CREATE OR REPLACE FUNCTION manage_element_lock()
RETURNS TRIGGER AS $$
BEGIN
  -- If locking an element
  IF NEW.locked_by IS NOT NULL AND OLD.locked_by IS NULL THEN
    NEW.locked_at := NOW();
  -- If unlocking an element
  ELSIF NEW.locked_by IS NULL AND OLD.locked_by IS NOT NULL THEN
    NEW.locked_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for element locking
CREATE TRIGGER trigger_manage_element_lock
  BEFORE UPDATE ON elements
  FOR EACH ROW
  WHEN (OLD.locked_by IS DISTINCT FROM NEW.locked_by)
  EXECUTE FUNCTION manage_element_lock();

-- =====================================================
-- Template Usage Counter
-- =====================================================

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- If document is created from a template
  IF NEW.id IS NOT NULL AND NEW.author_id IS NOT NULL THEN
    -- Check if this document was created from a template
    -- (This would need to be tracked in application logic)
    -- For now, we'll create a placeholder function
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Cleanup Functions (to be called periodically)
-- =====================================================

-- Function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM presence
  WHERE last_seen < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old view records (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_views()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM views
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock elements that have been locked too long
CREATE OR REPLACE FUNCTION unlock_stale_elements()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE elements
  SET locked_by = NULL, locked_at = NULL
  WHERE locked_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant permissions
-- =====================================================

-- Grant execute permissions to authenticated users for relevant functions
GRANT EXECUTE ON FUNCTION cleanup_old_presence() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_views() TO service_role;
GRANT EXECUTE ON FUNCTION unlock_stale_elements() TO service_role;