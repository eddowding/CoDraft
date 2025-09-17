-- =====================================================
-- CoDraft Supabase Migration Schema
-- Complete database schema optimized for Supabase
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- Core Tables with Enhanced Structure for Supabase
-- =====================================================

-- Documents table - main content containers
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  summary TEXT,
  slug TEXT UNIQUE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Collaboration features
  is_collaborative BOOLEAN NOT NULL DEFAULT false,
  max_collaborators INTEGER DEFAULT NULL,

  -- Content metadata
  word_count INTEGER DEFAULT 0,
  estimated_read_time INTEGER DEFAULT 0, -- in minutes

  -- Document status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- SEO and discovery
  meta_description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Performance indexes
  CONSTRAINT documents_slug_length CHECK (LENGTH(slug) >= 3 AND LENGTH(slug) <= 100),
  CONSTRAINT documents_title_length CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 255)
);

-- Elements table - individual content blocks within documents
CREATE TABLE elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('paragraph', 'heading', 'list', 'code', 'quote', 'image', 'table')),
  order_index INTEGER NOT NULL,

  -- Voting system (denormalized for performance)
  upvote_count INTEGER NOT NULL DEFAULT 0,
  downvote_count INTEGER NOT NULL DEFAULT 0,
  total_vote_count INTEGER NOT NULL DEFAULT 0,
  vote_score INTEGER NOT NULL DEFAULT 0, -- upvotes - downvotes
  auth_upvote_count INTEGER DEFAULT 0,
  auth_downvote_count INTEGER DEFAULT 0,
  anon_upvote_count INTEGER DEFAULT 0,
  anon_downvote_count INTEGER DEFAULT 0,
  last_vote_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Content versioning
  version INTEGER NOT NULL DEFAULT 1,

  -- Collaboration features
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(document_id, order_index),
  CONSTRAINT elements_order_positive CHECK (order_index >= 0),
  CONSTRAINT elements_content_length CHECK (LENGTH(content) <= 50000),
  CONSTRAINT elements_lock_consistency CHECK (
    (locked_by IS NULL AND locked_at IS NULL) OR
    (locked_by IS NOT NULL AND locked_at IS NOT NULL)
  )
);

-- Comments table - user feedback on elements
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- for threaded comments
  content TEXT NOT NULL,

  -- Comment metadata
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Moderation
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT comments_content_length CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 5000),
  CONSTRAINT comments_not_self_parent CHECK (id != parent_id),
  CONSTRAINT comments_resolution_consistency CHECK (
    (is_resolved = false) OR
    (is_resolved = true AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
  )
);

-- Votes table - upvote/downvote system
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)), -- -1 for downvote, 1 for upvote
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one vote per user per element
  UNIQUE(element_id, user_id)
);

-- Versions table - content version history
CREATE TABLE versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL,

  -- Version metadata
  change_summary TEXT,
  is_major_change BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(element_id, version_number),
  CONSTRAINT versions_number_positive CHECK (version_number > 0)
);

-- Views table - analytics for element engagement
CREATE TABLE views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable for anonymous views

  -- View metadata
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,

  -- Geography (optional, for analytics)
  country_code TEXT,
  region TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent spam views
  CONSTRAINT views_session_element_unique UNIQUE(element_id, session_id, DATE(created_at))
);

-- Document collaborators - manage who can edit documents
CREATE TABLE document_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Permission levels
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'commenter', 'editor', 'admin')),

  -- Invitation system
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique collaborator per document
  UNIQUE(document_id, user_id)
);

-- Real-time presence tracking for collaborative editing
CREATE TABLE presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Presence data
  cursor_position INTEGER,
  selected_element_id UUID REFERENCES elements(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Cleanup old presence records
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One presence record per user per document
  UNIQUE(user_id, document_id)
);

-- Document templates for reusable structures
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL, -- Structured template data
  category TEXT NOT NULL DEFAULT 'general',

  -- Template metadata
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User profiles (extended from auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,

  -- User preferences
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  browser_notifications BOOLEAN NOT NULL DEFAULT false,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),

  -- Account metadata
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,30}$'),
  CONSTRAINT bio_length CHECK (LENGTH(bio) <= 500)
);

-- =====================================================
-- Performance Indexes
-- =====================================================

-- Documents indexes
CREATE INDEX idx_documents_author ON documents(author_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_public ON documents(is_public);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX idx_documents_slug ON documents(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);

-- Elements indexes
CREATE INDEX idx_elements_document ON elements(document_id);
CREATE INDEX idx_elements_order ON elements(document_id, order_index);
CREATE INDEX idx_elements_vote_score ON elements(vote_score DESC);
CREATE INDEX idx_elements_total_votes ON elements(total_vote_count DESC);
CREATE INDEX idx_elements_type ON elements(type);
CREATE INDEX idx_elements_locked ON elements(locked_by) WHERE locked_by IS NOT NULL;
CREATE INDEX idx_elements_updated_at ON elements(updated_at DESC);

-- Comments indexes
CREATE INDEX idx_comments_element ON comments(element_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_unresolved ON comments(element_id) WHERE is_resolved = false AND is_deleted = false;

-- Votes indexes
CREATE INDEX idx_votes_element ON votes(element_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_votes_created_at ON votes(created_at DESC);

-- Versions indexes
CREATE INDEX idx_versions_element ON versions(element_id);
CREATE INDEX idx_versions_user ON versions(user_id);
CREATE INDEX idx_versions_created_at ON versions(created_at DESC);

-- Views indexes
CREATE INDEX idx_views_element ON views(element_id);
CREATE INDEX idx_views_user ON views(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_views_created_at ON views(created_at DESC);
CREATE INDEX idx_views_session ON views(session_id, created_at DESC);

-- Collaborators indexes
CREATE INDEX idx_collaborators_document ON document_collaborators(document_id);
CREATE INDEX idx_collaborators_user ON document_collaborators(user_id);
CREATE INDEX idx_collaborators_role ON document_collaborators(role);

-- Presence indexes
CREATE INDEX idx_presence_document ON presence(document_id) WHERE is_active = true;
CREATE INDEX idx_presence_user ON presence(user_id) WHERE is_active = true;
CREATE INDEX idx_presence_last_seen ON presence(last_seen DESC) WHERE is_active = true;

-- User profiles indexes
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- =====================================================
-- Updated At Trigger Function
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elements_updated_at
    BEFORE UPDATE ON elements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at
    BEFORE UPDATE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();