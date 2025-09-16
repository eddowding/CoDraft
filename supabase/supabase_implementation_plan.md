# CoDraft Supabase Implementation Plan

## Overview

This document provides a comprehensive implementation plan for migrating CoDraft to Supabase, including real-time collaboration features, performance optimizations, and deployment strategies.

## Migration Phases

### Phase 1: Infrastructure Setup (Week 1)

#### 1.1 Supabase Project Setup
- [ ] Create Supabase project
- [ ] Configure project settings and regions
- [ ] Set up environment variables
- [ ] Configure custom domains (if needed)

#### 1.2 Database Schema Migration
- [ ] Execute `supabase_migration_schema.sql`
- [ ] Execute `supabase_rls_policies.sql`
- [ ] Execute `supabase_triggers.sql`
- [ ] Verify schema creation and constraints

#### 1.3 Authentication Configuration
- [ ] Enable email/password authentication
- [ ] Configure OAuth providers (Google, GitHub)
- [ ] Set up custom email templates
- [ ] Configure MFA (optional)

### Phase 2: Data Migration (Week 2)

#### 2.1 Pre-Migration Preparation
```bash
# Install migration dependencies
npm install @supabase/supabase-js pg uuid bcrypt

# Set environment variables
export SUPABASE_URL=your-supabase-url
export SUPABASE_SERVICE_ROLE_KEY=your-service-key
export DB_HOST=your-postgres-host
export DB_NAME=codraft
export DRY_RUN=true  # Start with dry run
```

#### 2.2 Migration Execution
```bash
# 1. Test migration with dry run
node migrate_to_supabase.js

# 2. Review dry run results and fix any issues

# 3. Run actual migration
export DRY_RUN=false
node migrate_to_supabase.js

# 4. Validate migration results
```

#### 2.3 Data Validation
- [ ] Verify user count and profiles
- [ ] Check document and element relationships
- [ ] Validate vote counts and comment threads
- [ ] Test foreign key constraints

### Phase 3: Application Integration (Week 3-4)

#### 3.1 Supabase Client Setup
```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

#### 3.2 Replace Database Queries
Replace existing Drizzle queries with Supabase queries:

```javascript
// Before (Drizzle)
const documents = await db.select().from(documentsTable)
  .where(eq(documentsTable.authorId, userId))

// After (Supabase)
const { data: documents } = await supabase
  .from('documents')
  .select('*')
  .eq('author_id', userId)
```

#### 3.3 Authentication Integration
```javascript
// Replace existing auth middleware
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req) {
  const supabase = createServerSupabaseClient({ req })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && req.nextUrl.pathname.startsWith('/protected')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
}
```

### Phase 4: Real-time Features (Week 5-6)

#### 4.1 Document Collaboration Setup
```javascript
// Real-time document subscription
useEffect(() => {
  if (!documentId) return

  const channel = supabase
    .channel(`document:${documentId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'elements',
      filter: `document_id=eq.${documentId}`
    }, handleElementChange)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'comments'
    }, handleCommentChange)
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [documentId])
```

#### 4.2 Real-time Presence
```javascript
// User presence tracking
const trackPresence = async (documentId, cursorPosition) => {
  await supabase
    .from('presence')
    .upsert({
      user_id: user.id,
      document_id: documentId,
      cursor_position: cursorPosition,
      is_active: true,
      last_seen: new Date().toISOString()
    })
}

// Subscribe to presence changes
const presenceChannel = supabase
  .channel(`presence:${documentId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'presence',
    filter: `document_id=eq.${documentId}`
  }, handlePresenceChange)
  .subscribe()
```

#### 4.3 Real-time Voting
```javascript
// Real-time vote updates
const subscribeToVotes = (elementId) => {
  return supabase
    .channel(`votes:${elementId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'votes',
      filter: `element_id=eq.${elementId}`
    }, (payload) => {
      // Update vote counts in real-time
      updateElementVoteDisplay(payload)
    })
    .subscribe()
}
```

## Performance Optimizations

### Database Optimizations

#### 1. Index Strategy
```sql
-- Additional performance indexes
CREATE INDEX CONCURRENTLY idx_documents_author_created ON documents(author_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_elements_document_order ON elements(document_id, order_index);
CREATE INDEX CONCURRENTLY idx_comments_element_created ON comments(element_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_votes_user_element ON votes(user_id, element_id);

-- Partial indexes for active data
CREATE INDEX CONCURRENTLY idx_presence_active ON presence(document_id, last_seen DESC)
  WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_comments_unresolved ON comments(element_id, created_at DESC)
  WHERE is_resolved = false AND is_deleted = false;
```

#### 2. Query Optimization
```javascript
// Optimized document fetching with related data
const fetchDocumentWithElements = async (documentId) => {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      author:user_profiles(username, avatar_url),
      elements(
        *,
        comments(
          *,
          user:user_profiles(username, avatar_url)
        )
      )
    `)
    .eq('id', documentId)
    .order('order_index', { foreignTable: 'elements' })
    .order('created_at', { foreignTable: 'elements.comments' })
    .single()

  return { data, error }
}
```

### Real-time Optimizations

#### 1. Channel Management
```javascript
// Efficient channel management
class RealtimeManager {
  constructor() {
    this.channels = new Map()
    this.subscriptions = new Map()
  }

  subscribeToDocument(documentId, callbacks) {
    const channelKey = `document:${documentId}`

    if (this.channels.has(channelKey)) {
      return this.channels.get(channelKey)
    }

    const channel = supabase
      .channel(channelKey)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'elements',
        filter: `document_id=eq.${documentId}`
      }, callbacks.onElementChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, callbacks.onCommentChange)
      .subscribe()

    this.channels.set(channelKey, channel)
    return channel
  }

  unsubscribeFromDocument(documentId) {
    const channelKey = `document:${documentId}`
    const channel = this.channels.get(channelKey)

    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelKey)
    }
  }
}
```

#### 2. Debounced Presence Updates
```javascript
// Debounced presence tracking
const debouncedPresenceUpdate = debounce(async (documentId, data) => {
  await supabase
    .from('presence')
    .upsert({
      user_id: user.id,
      document_id: documentId,
      ...data,
      last_seen: new Date().toISOString()
    })
}, 1000)

// Usage
const handleCursorMove = (position) => {
  debouncedPresenceUpdate(documentId, {
    cursor_position: position,
    is_active: true
  })
}
```

### Frontend Optimizations

#### 1. Efficient State Management
```javascript
// Optimized state management with React Query
const useDocumentData = (documentId) => {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: () => fetchDocumentWithElements(documentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Real-time updates with optimistic UI
const useOptimisticVote = (elementId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ value }) => voteOnElement(elementId, value),
    onMutate: async ({ value }) => {
      // Optimistically update UI
      await queryClient.cancelQueries(['element', elementId])

      const previousData = queryClient.getQueryData(['element', elementId])

      queryClient.setQueryData(['element', elementId], old => ({
        ...old,
        vote_score: old.vote_score + value,
        total_vote_count: old.total_vote_count + 1
      }))

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Revert on error
      queryClient.setQueryData(['element', elementId], context.previousData)
    },
    onSettled: () => {
      queryClient.invalidateQueries(['element', elementId])
    }
  })
}
```

#### 2. Virtual Scrolling for Large Documents
```javascript
// Virtual scrolling for documents with many elements
import { FixedSizeList as List } from 'react-window'

const DocumentElementList = ({ elements }) => {
  const ElementRenderer = ({ index, style }) => (
    <div style={style}>
      <DocumentElement element={elements[index]} />
    </div>
  )

  return (
    <List
      height={800}
      itemCount={elements.length}
      itemSize={120}
      itemData={elements}
    >
      {ElementRenderer}
    </List>
  )
}
```

## Security Implementation

### 1. RLS Policy Testing
```javascript
// Test RLS policies
const testRLSPolicies = async () => {
  // Test document access
  const { data: publicDocs } = await supabase
    .from('documents')
    .select('*')
    .eq('is_public', true)

  // Test private document access (should fail without proper permissions)
  const { data: privateDocs, error } = await supabase
    .from('documents')
    .select('*')
    .eq('is_public', false)

  console.log('RLS test results:', { publicDocs, privateDocs, error })
}
```

### 2. Input Validation
```javascript
// Server-side validation with Zod
import { z } from 'zod'

const elementSchema = z.object({
  content: z.string().min(1).max(50000),
  type: z.enum(['paragraph', 'heading', 'list', 'code', 'quote', 'image', 'table']),
  order_index: z.number().min(0),
  document_id: z.string().uuid()
})

const validateElementInput = (data) => {
  return elementSchema.parse(data)
}
```

## Monitoring and Analytics

### 1. Performance Monitoring
```javascript
// Monitor real-time performance
const monitorRealtimePerformance = () => {
  const startTime = performance.now()

  supabase
    .channel('performance-monitor')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'elements'
    }, () => {
      const latency = performance.now() - startTime

      // Send to analytics
      analytics.track('realtime_latency', {
        latency,
        table: 'elements',
        timestamp: Date.now()
      })
    })
    .subscribe()
}
```

### 2. Error Tracking
```javascript
// Comprehensive error tracking
const setupErrorTracking = () => {
  // Supabase errors
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      analytics.identify(session.user.id, {
        email: session.user.email,
        provider: session.user.app_metadata.provider
      })
    }
  })

  // Real-time connection errors
  supabase.realtime.onError((error) => {
    console.error('Realtime error:', error)
    analytics.track('realtime_error', {
      error: error.message,
      timestamp: Date.now()
    })
  })
}
```

## Deployment Strategy

### 1. Environment Setup
```bash
# Production environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_APP_URL=https://codraft.com
```

### 2. Database Backup Strategy
```sql
-- Schedule regular backups
-- Supabase provides automatic backups, but also implement custom backup script

-- Backup critical data
CREATE OR REPLACE FUNCTION backup_critical_data()
RETURNS void AS $$
BEGIN
  -- Export documents and elements
  COPY (
    SELECT d.*, e.content, e.type, e.order_index
    FROM documents d
    JOIN elements e ON d.id = e.document_id
    WHERE d.updated_at >= NOW() - INTERVAL '1 day'
  ) TO '/backups/daily_content.csv' WITH CSV HEADER;
END;
$$ LANGUAGE plpgsql;
```

### 3. Rolling Deployment
```yaml
# GitHub Actions deployment
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Run Database Migrations
        run: |
          supabase db push --linked

      - name: Deploy Application
        run: |
          vercel --prod

      - name: Validate Deployment
        run: |
          npm run test:e2e
```

## Maintenance Tasks

### 1. Automated Cleanup
```sql
-- Schedule cleanup tasks (run via pg_cron or external scheduler)

-- Clean up old presence records (daily)
SELECT cleanup_old_presence();

-- Clean up old view records (weekly)
SELECT cleanup_old_views();

-- Unlock stale elements (hourly)
SELECT unlock_stale_elements();
```

### 2. Performance Monitoring
```javascript
// Regular performance audits
const performanceAudit = async () => {
  // Check slow queries
  const { data: slowQueries } = await supabase
    .rpc('get_slow_queries')

  // Monitor connection counts
  const { data: connections } = await supabase
    .rpc('get_connection_count')

  // Alert if thresholds exceeded
  if (connections > 80) {
    alert('High connection count detected')
  }
}
```

## Success Metrics

### Key Performance Indicators (KPIs)
- **Real-time Latency**: < 100ms for real-time updates
- **Page Load Time**: < 2 seconds for document loading
- **Database Query Time**: < 50ms for 95% of queries
- **Uptime**: 99.9% availability
- **Concurrent Users**: Support 1000+ concurrent collaborative sessions

### Monitoring Dashboard
```javascript
// Metrics collection
const collectMetrics = () => {
  return {
    activeUsers: supabase.realtime.channels.size,
    documentsCreated: todayDocumentCount,
    collaborationSessions: activeCollaborationCount,
    averageLatency: calculateAverageLatency(),
    errorRate: calculateErrorRate()
  }
}
```

This implementation plan provides a comprehensive roadmap for migrating CoDraft to Supabase while adding powerful real-time collaboration features and maintaining optimal performance.