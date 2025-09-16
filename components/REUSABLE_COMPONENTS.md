# Reusable Components from CoDraft-2025

## Components Worth Extracting

### 1. Markdown Processing Logic
```typescript
// From @shared/schema.ts
export function processMarkdownContent(markdown: string): Element[] {
  // This logic for parsing markdown into elements
  // Can be reused with modifications for Supabase
}
```

### 2. Vote Calculation Algorithm
```typescript
// Voting logic that calculates scores
// Aggregate votes efficiently
// Handle optimistic updates
```

### 3. UI Components to Adapt

#### Document Card
- Location: `client/src/components/documents/document-card.tsx`
- Modify: Remove REST API calls, use Supabase

#### Command Menu (cmdk)
- Location: `client/src/components/command-menu.tsx`
- Keep: Keyboard shortcuts, search UI
- Replace: API calls with Supabase queries

#### Theme Toggle
- Can be copied almost as-is
- Already uses Shadcn/ui

### 4. Useful Hooks

#### useDebounce
```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

#### useKeyboardShortcuts
- Voting with arrow keys
- Navigation shortcuts
- Command palette trigger

### 5. Validation Schemas

From CoDraft-2025's Zod schemas:
- Document validation
- User settings validation
- Element content rules

Adapt these for Supabase:
```typescript
import { z } from 'zod'

export const documentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  is_public: z.boolean().default(true),
  template_id: z.string().uuid().optional()
})
```

## What NOT to Reuse

### Don't Copy These:
1. **Express route handlers** - Using Supabase SDK instead
2. **Session management code** - Supabase handles auth
3. **Database query functions** - Different ORM (Drizzle vs Supabase)
4. **REST API calls** - Using Supabase client
5. **Password hashing** - Supabase handles this

### Replace With Supabase Equivalents:
- `storage.ts` → Supabase client methods
- `auth.ts` → Supabase Auth
- `routes.ts` → Supabase RLS + client
- WebSocket code → Supabase Realtime

## Migration Strategy for Components

### Step 1: Copy Component Structure
```bash
# Copy the component file
cp /path/to/old/component.tsx components/new-component.tsx
```

### Step 2: Remove Old Dependencies
```typescript
// Remove these imports:
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

// Replace with:
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from '@supabase/auth-helpers-react'
```

### Step 3: Update API Calls
```typescript
// Old way:
const response = await fetch('/api/documents')
const data = await response.json()

// New way:
const supabase = createClientComponentClient()
const { data, error } = await supabase
  .from('documents')
  .select('*')
```

### Step 4: Update State Management
```typescript
// Old way: Local state + manual refetch
const [documents, setDocuments] = useState([])

// New way: React Query + Supabase
const { data: documents } = useQuery({
  queryKey: ['documents'],
  queryFn: async () => {
    const { data } = await supabase.from('documents').select('*')
    return data
  }
})
```

## Component Priority List

### High Priority (Copy First):
1. Markdown to elements parser
2. Vote UI components
3. Document preview card
4. User avatar component
5. Theme system

### Medium Priority:
1. Command palette
2. Keyboard shortcuts
3. Search filters
4. Settings forms
5. Loading states

### Low Priority (Build Fresh):
1. Analytics dashboard
2. Admin panels
3. Complex forms
4. Legacy modals
5. Old navigation

## Example: Migrating Vote Component

### Original (CoDraft-2025):
```typescript
function VoteButton({ elementId, userVote }) {
  const handleVote = async (value) => {
    await fetch(`/api/elements/${elementId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value })
    })
  }
  // ...
}
```

### Migrated (Supabase):
```typescript
function VoteButton({ elementId, userId }) {
  const supabase = createClientComponentClient()

  const handleVote = async (value: number) => {
    const { error } = await supabase
      .from('votes')
      .upsert({
        element_id: elementId,
        user_id: userId,
        value
      })
  }

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`votes-${elementId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `element_id=eq.${elementId}`
      }, handleVoteUpdate)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [elementId])
  // ...
}
```