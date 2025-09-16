# CoDraft - Collaborative Document Editor

A modern, real-time collaborative document editing platform built with Next.js 14 and Supabase. CoDraft allows teams to create, edit, and collaborate on documents with voting and commenting features.

## Features

- **Real-time Collaborative Editing** - Multiple users can edit documents simultaneously
- **Element-based Voting System** - Vote on individual parts of documents to surface the best content
- **Threaded Comments** - Add comments to specific elements with threading support
- **Version History** - Track changes and revert to previous versions
- **User Authentication** - Secure auth with email/password and OAuth (Google, GitHub)
- **Document Management** - Create, organize, and share documents
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Supabase (Database, Auth, Realtime)
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account

### Installation

1. **Clone and install dependencies:**

```bash
git clone <your-repo-url>
cd codraft-supabase
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=CoDraft
```

3. **Database is already set up** with all necessary tables, indexes, and RLS policies.

4. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
codraft-supabase/
├── app/                      # Next.js App Router pages
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # Main dashboard
│   ├── documents/           # Document editor pages
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── auth/                # Authentication components
│   ├── comments/            # Comment system
│   ├── editor/              # Document editor
│   ├── layout/              # Layout components
│   ├── ui/                  # Shadcn/ui components
│   └── voting/              # Voting system
├── lib/                     # Utilities and configurations
│   ├── supabase.ts         # Supabase client setup
│   ├── database.types.ts   # TypeScript types
│   └── utils.ts            # Helper functions
├── supabase/               # Database migrations and policies
└── middleware.ts           # Auth middleware
```

## Database Schema

The application uses a comprehensive PostgreSQL schema with these main tables:

- **documents** - Main document containers
- **elements** - Individual content blocks within documents
- **comments** - User feedback on elements
- **votes** - Upvote/downvote system for elements
- **versions** - Content version history
- **user_profiles** - Extended user information
- **document_collaborators** - Collaboration management
- **presence** - Real-time user presence tracking

## Key Features Explained

### Element-Based Architecture

Documents are broken down into individual elements (paragraphs, headings, lists, etc.) that can be:
- Voted on independently
- Commented on separately
- Tracked for changes
- Analyzed for engagement

### Voting System

Each element has:
- Upvote/downvote buttons
- Vote score calculation
- Real-time vote count updates
- User-specific vote tracking

### Collaboration

- Real-time document updates
- User presence indicators
- Permission-based access control
- Collaborative editing with conflict resolution

### Security

- Row Level Security (RLS) policies
- User authentication with Supabase Auth
- Proper data validation and sanitization
- Protected API routes

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler

## Deployment

The application is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME=CoDraft
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Backend powered by [Supabase](https://supabase.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)