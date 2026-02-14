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
3. Update `BETA_PASSCODE` and `OPENROUTER_API_KEY` in `.env.local`.
4. Run dev server:
   ```bash
   npm run dev
   ```

## Routes

- `/` passcode gate
- `/dashboard` character CRUD
- `/character/[id]` single-character chat + prompt preview in dev
- `/settings` OpenRouter model setup

## Notes

- OpenRouter API key is stored on server environment (`OPENROUTER_API_KEY`) and not exposed to browser.
- Model calls are proxied through server routes.
- Prompt assembly lives in `/lib/promptStack.ts`.
