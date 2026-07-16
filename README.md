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

Install Chromium once, then refresh, review, and validate the assets:

```bash
pnpm screenshots:install
pnpm screenshots:update
pnpm screenshots:contact-sheet
pnpm check
```

`screenshots:update` refuses the Core database, migrates and seeds the disposable database, creates or updates only the reserved test auth identity, runs Core from an isolated worktree, and promotes staged images only after every capture passes validation. Capture routes, output paths, byte limits, and documentation references live in `capture/manifest.json`. Wrap product screenshots in `<BrowserFrame>` to apply the shared browser-neutral presentation without baking decoration into the image files.

`capture/image-policy.json` is the source of truth for the 1600×900 viewport, WebP
encoder settings, color and metadata requirements, and payload budgets. The verifier
enforces both per-image and whole-library limits and prints current payload statistics.
Do not re-encode committed WebPs: change the policy or capture state and rerun
`screenshots:update` so Sharp always encodes once from Playwright's PNG output.

`screenshots:contact-sheet` creates review-only sheets under
`.capture/contact-sheets/`. Inspect every sheet for loading states, overlays, clipping,
unexpected dialogs, and illegible text before committing. The generated sheets are
ignored by Git.

The workflow is intentionally repository-native rather than an agent-specific skill.
Codex reads `AGENTS.md`; `CLAUDE.md` imports the same instructions for Claude Code. The
scripts and CI remain the authoritative implementation so both tools produce the same
result.
