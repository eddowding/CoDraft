# CoDraft Supabase - Setup Guide

## Quick Start

### 1. Create Next.js App with Supabase Template
```bash
cd /Users/eddowding/Sites
npx create-next-app -e with-supabase codraft-supabase-app
cd codraft-supabase-app
```

### 2. Set Up Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Save your project URL and anon key
3. Go to Settings → Database → Connection string

### 3. Configure Environment Variables
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Apply Database Schema
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push < ../codraft-supabase/supabase/supabase_migration_schema.sql
supabase db push < ../codraft-supabase/supabase/supabase_rls_policies.sql
supabase db push < ../codraft-supabase/supabase/supabase_triggers.sql
```

### 5. Generate TypeScript Types
```bash
supabase gen types typescript --linked > lib/database.types.ts
```

### 6. Install Additional Dependencies
```bash
npm install @tanstack/react-query zustand @tiptap/react @tiptap/starter-kit lucide-react
```

### 7. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure Setup

### Copy Planning Files
```bash
# From the codraft-supabase directory
cp -r /Users/eddowding/Sites/codraft-supabase/* .
```

### Key Directories
- `/supabase` - Database migrations and functions
- `/components` - Reusable UI components
- `/lib` - Utilities and Supabase client
- `/app` - Next.js app router pages

## Features to Build (In Order)

### Week 1: Core Features
1. **Authentication Pages**
   - `/app/(auth)/login/page.tsx`
   - `/app/(auth)/signup/page.tsx`
   - `/app/(auth)/reset-password/page.tsx`

2. **Dashboard**
   - `/app/(dashboard)/page.tsx`
   - `/app/(dashboard)/documents/page.tsx`
   - `/app/(dashboard)/profile/page.tsx`

3. **Document Editor**
   - `/app/documents/[id]/page.tsx`
   - `/components/editor/markdown-editor.tsx`
   - `/components/editor/element-list.tsx`

### Week 2: Collaboration
1. **Voting System**
   - `/components/voting/vote-button.tsx`
   - `/components/voting/vote-stats.tsx`

2. **Comments**
   - `/components/comments/comment-thread.tsx`
   - `/components/comments/comment-form.tsx`

3. **Real-time**
   - `/lib/hooks/useRealtimeDocument.ts`
   - `/lib/hooks/usePresence.ts`

## Database Access Patterns

### Example: Fetching Documents
```typescript
// lib/api/documents.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'

export async function getDocuments() {
  const supabase = createClientComponentClient<Database>()

  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      author:users(username, avatar_url),
      elements(id, content, type, order, vote_count)
    `)
    .order('created_at', { ascending: false })

  return { data, error }
}
```

### Example: Real-time Subscription
```typescript
// hooks/useRealtimeVotes.ts
import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useRealtimeVotes(elementId: string) {
  const supabase = createClientComponentClient()

  useEffect(() => {
    const channel = supabase
      .channel(`element-${elementId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `element_id=eq.${elementId}`
        },
        (payload) => {
          console.log('Vote changed:', payload)
          // Update local state
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [elementId])
}
```

## Components to Build

### 1. Document Editor
```typescript
// components/editor/markdown-editor.tsx
'use client'

import { useState } from 'react'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function MarkdownEditor({
  initialContent,
  onSave
}: {
  initialContent: string
  onSave: (content: string) => void
}) {
  // Editor implementation
}
```

### 2. Vote Button
```typescript
// components/voting/vote-button.tsx
'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

export function VoteButton({
  elementId,
  initialVote
}: {
  elementId: string
  initialVote?: 'up' | 'down' | null
}) {
  // Voting implementation
}
```

## Testing Checklist

- [ ] User can sign up and log in
- [ ] User can create a document
- [ ] Document saves to database
- [ ] Markdown renders as elements
- [ ] Voting works in real-time
- [ ] Comments appear instantly
- [ ] Multiple users can collaborate
- [ ] RLS policies enforce security
- [ ] Mobile responsive design
- [ ] Performance is acceptable

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Check RLS policies are applied
   - Ensure user is authenticated
   - Verify anon key is correct

2. **Real-time not working**
   - Enable real-time in Supabase dashboard
   - Check table replication settings
   - Verify WebSocket connection

3. **TypeScript errors**
   - Regenerate types after schema changes
   - Check imports match generated types
   - Ensure strict mode compatibility

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Shadcn/ui Components](https://ui.shadcn.com)
- [TipTap Editor](https://tiptap.dev)
- [React Query](https://tanstack.com/query)