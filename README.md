# Granwin AI Playground

Light chat playground built with Next.js + Supabase + OpenRouter / Volcengine.

## Core stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Auth (email + password)
- Supabase Postgres (characters / conversations / messages / settings)
- Supabase Storage (character cover images)
- OpenRouter / Volcengine (server-side proxy, keys stored in environment only)

## Environment variables

Create `.env.local` from `.env.example` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_CHARACTER_COVERS_BUCKET` (optional, defaults to `character-covers`)
- `OPENROUTER_API_KEY`
- `VOLCENGINE_API_KEY`
- `VOLCENGINE_BASE_URL` (optional, defaults to `https://ark.cn-beijing.volces.com/api/v3`)
- `VOLCENGINE_MODELS` (optional, comma-separated fallback model list when `/models` is unavailable)

## Supabase setup

1. In Supabase SQL Editor, execute `supabase/schema.sql`.
2. In Storage, create a public bucket named `character-covers` (or your custom bucket).
3. In Auth Users, manually create user accounts (no self-signup in app).
4. In `public.profiles`, set one admin account with `role='admin'`.
5. To disable a user: set `disabled_at` to current timestamp.
6. To soft-delete a user: set `deleted_at` to current timestamp.

## Run

```bash
npm install
npm run dev
```

## Routes

- `/` login
- `/dashboard` character list
- `/dashboard/new` create character
- `/dashboard/[id]/edit` edit character
- `/character/[id]` chat with selected character
- `/settings` model selection
- `/admin` read-only admin panel (admin only)

## Notes

- Provider API keys never appear in frontend.
- Token usage (`↑/↓/Σ`) is shown on assistant bubbles per turn.
- Data is isolated by authenticated user via RLS.

## Documentation

- Architecture: `docs/architecture.md`
- Data Flow: `docs/data-flow.md`
- API Docs: `docs/api-docs.md`
- User Guide: `docs/user-guide.md`
- Docs Index: `docs/README.md`
