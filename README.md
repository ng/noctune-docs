# noctune-docs

User guides and (eventually) API reference for Noctune, built with [Nextra 4](https://nextra.site).

## Dev

```bash
pnpm install
pnpm dev
```

Content lives in `content/`. Navigation order is controlled by `_meta.ts` files alongside pages.

## UI screenshots

Screenshots are generated from a local Noctune Core checkout, converted to WebP, and committed under `public/screenshots/`. The deployed docs use those static assets, so deployment does not need database, Supabase, or browser credentials.

Local capture expects:

- Noctune Core at `../noctune-core` with its DEV Supabase settings in `.env.local`.
- A disposable Neon database used only for synthetic documentation fixtures.
- `.env.capture.local`, copied from the commented `.env.capture.example`.

Install Chromium once, then refresh and validate the assets:

```bash
pnpm screenshots:install
pnpm screenshots:update
pnpm check
```

`screenshots:update` refuses the Core database, migrates and seeds the disposable database, creates or updates only the reserved test auth identity, runs Core from an isolated worktree, and promotes staged images only after every capture passes validation. Capture routes, output paths, byte limits, and documentation references live in `capture/manifest.json`.
