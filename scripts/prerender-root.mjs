import { access, cp, mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

// Where `next build` leaves the prerendered pages, which the search steps read.
// A local build writes `<route>.html` under .next/server/app. On Vercel, newer
// Next versions hand that folder to the platform before `postbuild` runs, and the
// pages are `<route>.prerender-fallback.html` under .next/output/functions. Next
// documents neither, so a layout counts only if it holds the pages the search
// steps need, and the rest of .next is searched when neither known folder does.
const layouts = [
  { dir: '.next/server/app', suffix: '.html' },
  { dir: '.next/output/functions', suffix: '.prerender-fallback.html' },
]
const suffixes = [...new Set(layouts.map((layout) => layout.suffix))]
const probes = ['index', 'encounters/new-encounter']
const skipped = new Set(['cache', 'static', 'node_modules', 'types', 'trace', 'search-pages'])
const staged = '.next/search-pages'

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  )
const holdsPages = async (dir, suffix) =>
  (await Promise.all(probes.map((route) => exists(join(dir, route + suffix))))).every(Boolean)

async function search(dir, depth) {
  for (const suffix of suffixes) if (await holdsPages(dir, suffix)) return { dir, suffix }
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

/** The folder and file suffix the build's prerendered pages use. */
export async function findPrerenderedPages(base = '.') {
  for (const { dir, suffix } of layouts) {
    if (await holdsPages(join(base, dir), suffix)) return { dir: join(base, dir), suffix }
  }
  const found = await search(join(base, '.next'), 4)
  if (found) return found
  const seen = await htmlFiles(join(base, '.next'), 5)
  throw new Error(
    `No prerendered pages found. Looked for ${probes.join(' and ')} as ` +
      `${layouts.map((layout) => `${layout.dir}/*${layout.suffix}`).join(' or ')}, then in the ` +
      'rest of .next. Run `next build` first; if it ran, Next has moved its prerender output ' +
      'and scripts/prerender-root.mjs needs the new layout. ' +
      `HTML files in the build (${seen.length}): ${seen.slice(0, 30).join(', ') || 'none'}`,
  )
}

/**
 * A folder holding every prerendered page as `<route>.html`. A local build's own
 * folder already is one; any other layout is copied to .next/search-pages under
 * those names, so Pagefind and the search index see the same paths everywhere.
 */
export async function findPrerenderRoot(base = '.') {
  const { dir, suffix } = await findPrerenderedPages(base)
  if (suffix === '.html') return dir
  const target = join(base, staged)
  await rm(target, { recursive: true, force: true })
  for (const file of await htmlFiles(dir, 12)) {
    if (!file.endsWith(suffix)) continue
    const page = join(target, relative(dir, file).slice(0, -suffix.length) + '.html')
    await mkdir(dirname(page), { recursive: true })
    await cp(file, page)
  }
  return target
}
