# Reusing fictional product fixtures

Use the existing docs capture setup for documentation and native App Store media. Do not
start by searching for a production demo account or placing real patient data in screenshots.

## Where the data comes from

| Resource                       | Location                                              | Purpose                                                                                   |
| ------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Local capture configuration    | `noctune-docs/.env.capture.local`                     | Gitignored database connection, target guard, and local Core path                         |
| Configuration template         | `noctune-docs/.env.capture.example`                   | Documents variables without credentials                                                   |
| Approved database fingerprints | `noctune-docs/capture/database-allowlist.json`        | Restricts captures to an independently approved disposable database                       |
| Shared fictional story         | `noctune-core/scripts/fixtures/noctune-demo/story.ts` | Northstar Veterinary Clinic, patients, conversations, SOAP/discharge drafts, and messages |
| Reserved fixture IDs           | `noctune-core/scripts/fixtures/noctune-demo/ids.ts`   | Stable IDs for fixture-owned rows                                                         |
| Docs database/auth seeder      | `noctune-core/scripts/seed-docs-capture.ts`           | Populates synthetic product data and reserved development auth identities                 |
| Web capture runner             | `noctune-docs/scripts/capture-screenshots.mjs`        | Guards, migrates, seeds, captures, verifies, and atomically publishes docs images         |

The docs runner generates a fresh ephemeral password each run. It is not a password to
look up in App Store Connect, and it must not be committed or printed. Supabase supplies
real development authentication; product data lives in the separate capture database.
The deployed development website does **not** automatically see those database rows.

The September 23 read-only check found six reserved fictional patients, seven encounters,
and six SOAP notes. Counts may change as the shared story evolves.

## Generate web documentation screenshots

Follow the setup in the root README, then run:

```sh
pnpm screenshots:update
pnpm screenshots:contact-sheet
pnpm check
```

Inspect every contact sheet. Screenshots under `public/screenshots/` are generated assets;
change fixtures or capture definitions and regenerate instead of editing their pixels.
Some web capture specs use browser-specific clocks, response stubs, and layout stabilization.
Those adjustments are not native iOS fixtures and should not be copied into App Store media.

## Use the same data for native iPhone and iPad media

Use the simulator-only capture harness in the sibling `noctune-swift` repository:
`docs/app-store-capture.md` and `scripts/asc-capture/`.

It starts an isolated local Core checkout on `http://localhost:3100`, with the same approved
capture database and real development authentication. A separately generated native capture
project enables `ASC_CAPTURE` only for Debug simulator builds. The actual app screens and
stores load the synthetic records through normal API requests. The release project and
App Store archive continue to use production.

Do not run two seeders against this database concurrently. Seeding resets fixture-owned
rows and rotates the reserved synthetic accounts' passwords, which can interrupt another
capture session. Use a coordination lock and stop the local server when finished.

Record authentic native UI on each device family. A mobile browser screenshot is not an
App Store screenshot of the native app. Fictional precomputed SOAP notes are suitable for
demonstrating review, but do not imply that a staged transition measures live processing time.
Capture-specific external-service fakes do not verify production recording-to-SOAP processing.

## Safety boundaries

- Validate both the committed database fingerprint and target-bound guard before writes.
- Refuse the Core development/production database URL; never redirect the fixture seeder there.
- Do not add an unrecognized database fingerprint without independent human confirmation.
- Use only the reserved synthetic identities and fixture IDs.
- Keep credentials out of source control, logs, screenshots, and release metadata.
- Never enable capture authentication or a loopback API in a distribution build.
- Keep native App Store deliverables outside `public/screenshots/`; docs WebP dimensions
  and byte budgets are not Apple's screenshot or app-preview specifications.
- The development-snapshot `seed-app-store-demo.ts` runbook is a **different** workflow.
  Do not apply its development-database instructions to the docs capture database.

A production App Review account is separate from this local media-capture identity. Verify
that account and the released backend before submitting a build to Apple.
