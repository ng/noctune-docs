# noctune-docs

User guides and (eventually) API reference for noctune, built with [Nextra 4](https://nextra.site).

## Dev

Install [Git LFS](https://git-lfs.com/) before cloning. In an existing checkout,
initialize it once for your user and materialize the tracked assets:

```bash
git lfs install
git lfs pull
```

```bash
pnpm install
pnpm dev
```

Content lives in `content/`. Navigation order is controlled by `_meta.ts` files alongside pages.

## Legal documents

The iOS-facing legal pages (`/ios/privacy`, `/ios/terms`, `/ios/ca-privacy`,
`/ios/do-not-sell`) do **not** store their own copy of the text. Each is a server
component that live-fetches the canonical Markdown from `app.noctune.ai/legal/*.md`
(`lib/legal-documents.ts`) and re-renders it through the `ios-line` marker transform
(`lib/ios-line-markers.ts`), which drops the plan/pricing/billing lines the canonical
doc annotates for the support-only iOS presentation. The canonical source is edited in
**noctune-core** (`public/legal/*.md`); this repo owns only the presentation.

Because the fetch is cached with `export const revalidate = 3600`, a legal change that
lands in noctune-core prod (`app.noctune.ai`) propagates to `docs.noctune.ai`
**automatically within ≤1 hour** — no edit or deploy in this repo is required. The page
serves its last snapshot until the ISR window rolls over, then the next request
re-fetches the updated canonical text.

Apple reads `https://docs.noctune.ai/ios/privacy` directly, so when a legal change must
be live before an App Store resubmission, verify propagation rather than assuming it —
check the canonical source first, then the docs render:

```bash
# canonical prod source — should already reflect the change
curl -s https://app.noctune.ai/legal/privacy-policy.md | grep -i '<phrase from the change>'
# docs render — lags up to the revalidate window
curl -s https://docs.noctune.ai/ios/privacy | grep -i '<phrase from the change>'
```

If the docs render still shows the old text and you can't wait out the hour, force it
with a Vercel redeploy (dashboard **Redeploy**, or `vercel --prod`): that resets the ISR
cache and the fresh build re-fetches on first request. There is no on-demand
`revalidatePath` route in this repo.

## UI screenshots

Screenshots are generated from a local noctune Core checkout, converted to WebP, and committed under `public/screenshots/`. The deployed docs use those static assets, so deployment does not need database, Supabase, or browser credentials.

Raster assets (`.webp`, `.png`, `.jpg`, `.jpeg`, `.gif`, and `.avif`) are stored in
Git LFS. The repository's pre-push hook uploads their LFS objects and runs `pnpm check`
before Git updates the remote branch.

Vercel's Git LFS support must remain enabled under **Project Settings → Git** so
deployment checkouts contain the raster bytes instead of pointer files. The build
runs `pnpm assets:verify` first and fails with a targeted error if any pointer or
invalid raster reaches the deployment workspace.

Local capture expects:

- noctune Core at `../noctune-core` with its DEV Supabase settings in `.env.local`.
- A disposable Neon database used only for synthetic documentation fixtures,
  with its credential-free fingerprint independently reviewed in
  `capture/database-allowlist.json`.
- `.env.capture.local`, copied from the commented `.env.capture.example`.

Install Chromium once, then refresh, review, and validate the assets:

```bash
pnpm screenshots:install
pnpm screenshots:update
pnpm screenshots:contact-sheet
pnpm check
```

`screenshots:update` refuses the Core database, migrates and seeds the disposable database, creates or updates only the reserved test auth identities, runs Core from an isolated worktree, and promotes staged images only after every capture passes validation. Capture routes, output paths, byte limits, and documentation references live in `capture/manifest.json`. Wrap product screenshots in `<BrowserFrame>` to apply the shared browser-neutral presentation without baking decoration into the image files.

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
