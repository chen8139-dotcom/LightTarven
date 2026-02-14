# LightTavern MVP

MVP based on Next.js App Router + TypeScript + Tailwind + OpenRouter.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
3. Update `BETA_PASSCODE` in `.env.local`.
4. Run dev server:
   ```bash
   npm run dev
   ```

## Routes

- `/` passcode gate
- `/dashboard` character CRUD
- `/character/[id]` single-character chat + prompt preview in dev
- `/settings` OpenRouter key/model setup

## Notes

- API key is stored in browser localStorage only.
- Model calls are proxied through server routes.
- Prompt assembly lives in `/lib/promptStack.ts`.
