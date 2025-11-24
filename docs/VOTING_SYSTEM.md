# DocVote Voting System Documentation

## Overview

DocVote's voting system allows authenticated users to vote on individual elements (paragraphs, headings, lists) within documents. This enables granular feedback on document content, helping identify the strongest and weakest parts of any document.

## Architecture

### Authentication

All votes require authentication via **magic link** (passwordless email sign-in):

1. User clicks vote button on a public document
2. If not authenticated, a modal prompts for email
3. User receives a magic link via email
4. Clicking the link signs them in and redirects back to the document
5. User can now vote on any element

### Database Schema

#### `votes` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `element_id` | UUID | Foreign key to elements |
| `user_id` | UUID | Foreign key to auth.users (required) |
| `value` | INTEGER | Vote value: 1 (upvote) or -1 (downvote) |
| `created_at` | TIMESTAMP | When vote was cast |
| `updated_at` | TIMESTAMP | When vote was last changed |

**Constraints:**
- `user_id` is NOT NULL (all votes must be authenticated)
- Unique index on `(element_id, user_id)` - one vote per user per element

#### `elements` table (vote-related columns)

| Column | Type | Description |
|--------|------|-------------|
| `vote_score` | INTEGER | Net score (upvotes - downvotes) |
| `upvote_count` | INTEGER | Total upvotes |
| `downvote_count` | INTEGER | Total downvotes |
| `auth_upvote_count` | INTEGER | Authenticated upvotes (same as upvote_count) |
| `auth_downvote_count` | INTEGER | Authenticated downvotes (same as downvote_count) |

### Vote Display Modes

Users can choose how to view vote results:

| Mode | Description |
|------|-------------|
| `all` | Shows total votes from all authenticated users |
| `auth` | Same as 'all' (legacy mode from anonymous voting removal) |
| `mine` | Shows only the current user's votes |
| `none` | Hides vote counts (blind voting) |

### Vote Count Updates

Vote counts are updated via a PostgreSQL trigger:

```sql
-- Trigger fires after any vote INSERT, UPDATE, or DELETE
CREATE TRIGGER update_element_votes_on_vote_change
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW
EXECUTE FUNCTION update_element_vote_counts_trigger();
```

The trigger automatically recalculates:
- `upvote_count` / `downvote_count`
- `vote_score` (net score)
- `auth_upvote_count` / `auth_downvote_count`

## Row Level Security (RLS) Policies

### `votes_select_public`
**Purpose:** Anyone can read votes on public documents
```sql
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM elements e
    JOIN documents d ON d.id = e.document_id
    WHERE e.id = element_id
      AND d.is_public = true
  )
)
```

### `votes_insert_authenticated`
**Purpose:** Authenticated users can insert votes on public documents
```sql
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM elements e
    JOIN documents d ON d.id = e.document_id
    WHERE e.id = element_id
      AND d.is_public = true
  )
)
```

### `votes_update_own`
**Purpose:** Users can update their own votes
```sql
FOR UPDATE USING (user_id = auth.uid())
```

### `votes_delete_own`
**Purpose:** Users can delete their own votes
```sql
FOR DELETE USING (user_id = auth.uid())
```

## Frontend Components

### `VoteButtons` (`components/voting/vote-buttons.tsx`)

Main voting UI component with:
- Upvote/downvote buttons with visual feedback
- Score display with conditional formatting
- Magic link modal for unauthenticated users
- Optimistic updates with error recovery
- Keyboard navigation support (left/right arrows)

**Props:**
```typescript
interface VoteButtonsProps {
  elementId: string
  currentVoteScore: number
  onVoteUpdate: (newScore: number) => void
  displayMode?: 'all' | 'auth' | 'mine' | 'none'
  documentTitle?: string
}
```

### `MagicLinkModal` (`components/auth/magic-link-modal.tsx`)

Authentication modal that:
- Prompts for email address
- Sends OTP via Supabase Auth
- Shows confirmation with next steps
- Auto-closes after email is sent

### `VoteButtonsErrorBoundary` (`components/voting/vote-buttons-error-boundary.tsx`)

Error boundary that:
- Catches errors in vote buttons
- Shows fallback UI with retry option
- Prevents voting errors from crashing the page

## Performance Optimizations

### Client-side Caching

Vote buttons use a 30-second cache for:
- User authentication state
- Current vote state per element

```typescript
const CACHE_DURATION = 30000 // 30 seconds
const authCache = new Map<string, { user: any; timestamp: number }>()
const voteCache = new Map<string, { vote: 1 | -1 | null; timestamp: number }>()
```

### Materialized View

Dashboard stats use a materialized view (`document_stats`) for efficient queries:

```sql
CREATE MATERIALIZED VIEW document_stats AS
SELECT
  d.id as document_id,
  d.author_id,
  COALESCE(SUM(e.upvote_count), 0) as total_upvotes,
  COALESCE(SUM(e.downvote_count), 0) as total_downvotes,
  COUNT(DISTINCT v.user_id) as unique_voters
FROM documents d
LEFT JOIN elements e ON e.document_id = d.id
LEFT JOIN votes v ON v.element_id = e.id
GROUP BY d.id, d.author_id;
```

Refresh the view manually or via scheduled job:
```sql
SELECT refresh_document_stats();
```

## Keyboard Navigation

On public document view:
- `↑` / `↓` - Navigate between elements
- `←` - Cycle vote backward (upvote → neutral → downvote)
- `→` - Cycle vote forward (downvote → neutral → upvote)
- `Enter` / `Space` - Toggle comment section
- `Esc` - Deselect current element

## Security Considerations

1. **All votes require authentication** - No anonymous voting
2. **RLS policies enforce ownership** - Users can only modify their own votes
3. **Votes only on public documents** - Private documents cannot receive votes
4. **Rate limiting available** - Via Vercel KV (optional)

## Migration History

- `20250123_remove_anonymous_voting.sql` - Removed anonymous voting, made user_id required
- `dashboard_stats_materialized_view` - Added performance optimization view

## Future Considerations

- [ ] Implement comment voting
- [ ] Add vote analytics/insights
- [ ] Consider vote weighting based on user reputation
- [ ] Add real-time vote updates via Supabase Realtime
