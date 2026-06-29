# CoDraft

A Supabase/Next.js voting-on-document app served at **ministryforthefuture.org**.
Stack: Next.js App Router, TypeScript, Supabase, Tailwind.

## Build / Dev

- `npm install` first — **the checkout may have no `node_modules`**, which makes the
  husky pre-commit hook fail with exit 127 (`tsc: command not found`) and block commits.
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit` (the pre-commit gate; note `.husky/pre-commit`
  pipes it through `2>/dev/null`, which hides failures — don't trust its "pass" output)
- `npm run supabase:gen-types` — regenerate `lib/database.types.ts` from the linked DB

## Infra

- **Supabase:** project `wnlrzoelwuvlmfuyhktj` (`codraft`, eu-west-2)
- **Vercel:** project `codraft-supabase`
- **DNS:** Cloudflare (zone `5f02079a8e8e2ecf8fe415f052753b67`); site on Vercel
- **Auth email:** Supabase Auth custom SMTP → **Resend**, sender
  `noreply@send.ministryforthefuture.org` (verified domain, eu-west-1). The Resend
  API key is **shared with the OpenGroupMap project** — rotating it breaks both apps.

## Odin Context

This repo is mapped to Odin. Project context, status, and next steps live at:
`~/Sites/Odin/Projects/codraft/README.md`

Update that file (not this one) for status/next-step changes; use `/wrap` at session end.
