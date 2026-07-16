# Repository Agent Instructions

## Product screenshots

Product screenshots are generated assets. Do not hand-edit or re-encode files under
`public/screenshots/`.

- Treat `capture/image-policy.json` as the source of truth for dimensions, encoding,
  color/metadata rules, and byte budgets.
- Add or change screenshot states in `capture/manifest.json` and the Playwright capture
  specs. Put deterministic synthetic product data in the Noctune Core capture seeder.
- Never use production/customer data or generative-image tools for product UI screenshots.
- Keep raster assets in Git LFS. Do not bypass the `.gitattributes` rules or commit
  raster binaries directly to regular Git history.
- Run `pnpm screenshots:update` to rebuild assets atomically from the disposable fixture
  database.
- Run `pnpm screenshots:contact-sheet` and inspect every generated sheet under
  `.capture/contact-sheets/`.
- Run `pnpm check` before committing. It verifies formatting, Markdown, screenshot
  dimensions/format/metadata/byte budgets, TypeScript, and the production build.

If capture credentials are unavailable, you may edit copy or capture definitions, but do
not fabricate replacement screenshot bytes. Report that `pnpm screenshots:update` still
needs to run.
