import { spawnSync } from 'node:child_process'

import { findPrerenderRoot } from './prerender-root.mjs'

// Builds the docs site's own search (public/_pagefind) from the prerendered pages.
const site = await findPrerenderRoot()
console.log(`Pagefind: indexing ${site}`)
const run = spawnSync('pagefind', ['--site', site, '--output-path', 'public/_pagefind'], {
  stdio: 'inherit',
})
if (run.error) throw run.error
process.exit(run.status ?? 1)
