# Laura Butallo Monorepo

This repo now houses multiple apps plus Firebase Functions:

- `apps/web` – public Next.js site (original project)
- `apps/admin` – dashboard app (WIP placeholder)
- `functions` – Firebase Cloud Functions

## Commands

From the repo root you can run:

```bash
npm run dev:web
npm run build:web
npm run dev:admin
npm run deploy:functions
```

Or `cd` into each app and use the regular `npm run dev`, `npm run build`, etc.

> Remember to install dependencies inside each app folder (`apps/web`, `apps/admin`).
