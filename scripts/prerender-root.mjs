import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'

// Where `next build` leaves the prerendered pages. A local build writes them to
// .next/server/app; on Vercel, newer Next versions hand that folder to the
// platform before `postbuild` runs and the pages are in .next/server/route-cache.
// Next does not document either, so a folder counts only if it holds the pages
// the search steps need, and anything else under .next is searched as a fallback.
const known = ['.next/server/app', '.next/server/route-cache']
const probes = ['index.html', 'encounters/new-encounter.html']
const skipped = new Set(['cache', 'static', 'node_modules', 'types', 'trace'])

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  )
const holdsPages = async (dir) =>
  (await Promise.all(probes.map((p) => exists(join(dir, p))))).every(Boolean)

async function search(dir, depth) {
  if (await holdsPages(dir)) return dir
  if (depth === 0) return null
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory() || skipped.has(entry.name)) continue
    const found = await search(join(dir, entry.name), depth - 1)
    if (found) return found
  }
  return null
}

async function htmlFiles(dir, depth) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (depth > 0 && !skipped.has(entry.name)) out.push(...(await htmlFiles(file, depth - 1)))
    } else if (entry.name.endsWith('.html')) out.push(file)
  }
  return out
}

export async function findPrerenderRoot(base = '.') {
  for (const dir of known) if (await holdsPages(join(base, dir))) return join(base, dir)
  const found = await search(join(base, '.next'), 4)
  if (found) return found
  const seen = await htmlFiles(join(base, '.next'), 5)
  throw new Error(
    `No prerendered pages found. Looked for ${probes.join(' and ')} in ${known.join(', ')} ` +
      'and the rest of .next. Run `next build` first; if it ran, Next has moved its ' +
      'prerender output and scripts/prerender-root.mjs needs the new location. ' +
      `HTML files in the build (${seen.length}): ${seen.slice(0, 30).join(', ') || 'none'}`,
  )
}
