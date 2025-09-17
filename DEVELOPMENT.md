# Development Guide

## Available Scripts

### Basic Development
```bash
npm run dev          # Start Next.js development server (hot reload for React)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler check
```

### Database Development with Nodemon
```bash
npm run dev:db       # Watch SQL files and auto-apply database changes
npm run db:apply     # Manually apply database changes
```

### Advanced Development
```bash
npm run dev:watch    # Start Next.js with nodemon (restarts on middleware/config changes)
```

## Development Workflow Options

### Option 1: Standard Next.js Development (Recommended for UI work)
```bash
npm run dev
```
- ✅ Fast hot reload for React components
- ✅ Automatic TypeScript compilation
- ✅ API routes auto-restart
- ❌ Manual database changes required

### Option 2: Database-Focused Development (Recommended for backend work)
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:db
```
- ✅ Automatic database schema/trigger/policy updates
- ✅ Auto-regenerates TypeScript types
- ✅ Hot reload for React components
- ⚠️ Requires Supabase CLI setup

### Option 3: Full-Stack Development with Restarts
```bash
npm run dev:watch
```
- ✅ Restarts entire Next.js server on critical file changes
- ✅ Good for middleware, configuration, or environment changes
- ❌ Slower than standard `next dev`

## Nodemon Configuration

The nodemon setup watches:
- `supabase/**/*.sql` - Database schema, triggers, policies
- `middleware.ts` - Next.js middleware
- `next.config.js` - Next.js configuration

### Database Auto-Update Features
When you modify SQL files, nodemon will automatically:
1. 🗄️ Apply schema changes via `supabase db reset --linked`
2. 🔧 Regenerate TypeScript types
3. ✅ Notify you of successful updates

## Requirements for Database Watching
- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`
- Project linked: `supabase link --project-ref <your-project-ref>`

## Tips
- Use `npm run dev` for day-to-day React development
- Use `npm run dev:db` when working on database schema, triggers, or policies
- Both can run simultaneously in different terminals
- The database watcher has a 1-second delay to prevent rapid rebuilds