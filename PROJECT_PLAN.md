# CoDraft Supabase - Fresh Start Project Plan

## Project Overview
Building CoDraft from scratch using Next.js 14 + Supabase for a modern, real-time collaborative document editing platform.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **Styling**: Tailwind CSS + Shadcn/ui
- **State Management**: React Query (server state) + Zustand (client state)
- **Deployment**: Vercel

## Phase 1: Foundation (Week 1)

### Day 1-2: Setup & Authentication
- [ ] Initialize Next.js with Supabase template
- [ ] Configure Supabase project and environment variables
- [ ] Set up authentication flows (signup, login, password reset)
- [ ] Create user profile management
- [ ] Add OAuth providers (Google, GitHub)

### Day 3-4: Database & Core Models
- [ ] Apply Supabase schema (documents, elements, users)
- [ ] Set up RLS policies for security
- [ ] Create database triggers for real-time
- [ ] Test data access patterns
- [ ] Generate TypeScript types from database

### Day 5-7: Document Management
- [ ] Create document CRUD operations
- [ ] Implement document listing/search
- [ ] Add markdown editor component
- [ ] Parse markdown to elements
- [ ] Set up document routing

## Phase 2: Collaboration Features (Week 2)

### Day 8-9: Voting System
- [ ] Implement element-level voting
- [ ] Create vote UI components
- [ ] Add real-time vote updates
- [ ] Build vote analytics/visualization
- [ ] Optimize vote count performance

### Day 10-11: Comments & Versions
- [ ] Add commenting functionality
- [ ] Create comment threads UI
- [ ] Implement version history
- [ ] Add diff visualization
- [ ] Build version restore feature

### Day 12-14: Real-time Collaboration
- [ ] Set up presence tracking
- [ ] Implement live cursors
- [ ] Add collaborative editing
- [ ] Create conflict resolution
- [ ] Build notification system

## Core Features to Implement

### 1. Authentication & Users
- Email/password authentication
- OAuth integration (Google, GitHub)
- User profiles with avatars
- Settings and preferences
- Email verification

### 2. Document Management
- Create, read, update, delete documents
- Public/private visibility
- Document templates
- Search and filtering
- Slug-based URLs

### 3. Collaborative Editing
- Real-time updates via Supabase
- Element-based content structure
- Markdown support with live preview
- Collaborative presence indicators
- Conflict-free editing

### 4. Voting System
- Vote on individual elements
- Upvote/downvote mechanism
- Real-time vote counts
- Vote analytics and insights
- Sorting by vote popularity

### 5. Comments & Discussion
- Element-level comments
- Threaded discussions
- Real-time comment updates
- Mention notifications
- Comment moderation

### 6. Version Control
- Automatic version history
- Diff visualization
- Restore previous versions
- Track changes by user
- Merge suggestions

## File Structure
```
codraft-supabase/
├── app/                      # Next.js app router
│   ├── (auth)/              # Auth pages (login, signup)
│   ├── (dashboard)/         # Protected dashboard
│   ├── documents/           # Document pages
│   ├── api/                 # API routes if needed
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # Shadcn/ui components
│   ├── editor/              # Document editor
│   ├── voting/              # Voting components
│   └── comments/            # Comment system
├── lib/                     # Utilities
│   ├── supabase/           # Supabase clients
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Helper functions
├── supabase/               # Database files
│   ├── migrations/         # SQL migrations
│   ├── functions/          # Edge functions
│   └── seed.sql            # Seed data
├── public/                 # Static assets
└── docs/                   # Documentation
```

## Development Priorities

### Must Have (MVP)
1. User authentication
2. Document CRUD
3. Markdown editing
4. Element-based voting
5. Basic comments
6. Real-time updates

### Should Have
1. Document templates
2. Version history
3. Collaborative presence
4. Search functionality
5. User profiles
6. Email notifications

### Nice to Have
1. AI-powered summaries
2. Advanced analytics
3. Export options
4. Keyboard shortcuts
5. Mobile app
6. API for integrations

## Migration from CoDraft-2025

### Components to Reuse
- UI components (with modifications)
- Markdown processing logic
- Vote calculation algorithms
- Some React hooks
- Design patterns and UX flows

### What to Leave Behind
- Express server code
- Session-based auth
- REST API routes
- Old database queries
- Legacy state management

## Success Metrics
- [ ] Authentication works seamlessly
- [ ] Documents load in <1s
- [ ] Real-time updates <100ms latency
- [ ] Mobile responsive design
- [ ] 100% TypeScript coverage
- [ ] Core Web Vitals all green
- [ ] Lighthouse score >90

## Next Steps
1. Run `npx create-next-app -e with-supabase codraft-supabase`
2. Set up Supabase project at supabase.com
3. Configure environment variables
4. Apply database schema
5. Start building features in priority order