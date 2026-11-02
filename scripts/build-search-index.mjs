import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

import { parse as parseYaml } from 'yaml'

// Writes public/search-index.json for the noctune Core global search. Titles,
// descriptions, and keywords come from the OKF frontmatter; heading anchors come
// from the prerendered HTML so they match what Nextra serves.
const base = 'https://docs.noctune.ai'
const contentRoot = 'content'
const prerenderRoot = '.next/server/app'
const output = 'public/search-index.json'
// Standalone support and legal pages for the iOS app, not product guides.
const excludedPrefixes = ['/ios']

const loadMeta = async (dir) => {
  const src = await readFile(join(dir, '_meta.ts'), 'utf8').catch(() => null)
  if (!src) return {}
  const url = 'data:text/javascript;base64,' + Buffer.from(src).toString('base64')
  return (await import(url)).default
}
const metaTitle = (entry) => (typeof entry === 'string' ? entry : entry?.title)
const metaHidden = (entry) => typeof entry === 'object' && entry?.display === 'hidden'

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
const text = (html) =>
  decode(html.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()

const cap = (s, max = 200) => {
  if (s.length <= max) return s
  const cut = s.slice(0, max + 1).replace(/\s+\S*$/, '')
  return cut.replace(/[\s,;:.–—-]+$/, '') + '…'
}

function headings(html) {
  const out = []
  // Markdown headings carry Nextra's permalink; component headings do not.
  for (const m of html.matchAll(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/g)) {
    const id = m[2].match(/\bid="([^"]+)"/)?.[1]
    if (!id || !m[3].includes('subheading-anchor')) continue
    out.push({ title: text(m[3]), anchor: decode(id) })
  }
  return out
}

const routeOf = (parent, key) => (key === 'index' ? parent || '/' : `${parent}/${key}`)
const htmlOf = (route) => join(prerenderRoot, `${route === '/' ? '/index' : route}.html`)

async function walk(dir, parent, section, skipped) {
  const meta = await loadMeta(dir)
  const pages = []
  for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const key = e.name.replace(/\.mdx$/, '')
    const route = routeOf(parent, key)
    if (metaHidden(meta[key]) || excludedPrefixes.some((p) => route.startsWith(p))) {
      skipped.push(route)
      continue
    }
    if (e.isDirectory()) {
      const sub = section === undefined ? (metaTitle(meta[key]) ?? key) : section
      pages.push(...(await walk(join(dir, e.name), route, sub, skipped)))
      continue
    }
    if (!e.name.endsWith('.mdx')) continue
    const src = await readFile(join(dir, e.name), 'utf8')
    const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
    const data = (fm && parseYaml(fm[1])) || {}
    if (data.searchable === false || data.draft === true) {
      skipped.push(route)
      continue
    }
    if (!data.title || !data.description) {
      throw new Error(`${join(dir, e.name)} needs OKF title and description frontmatter`)
    }
    const html = await readFile(htmlOf(route), 'utf8')
    const main = html.match(/<main\b[^>]*data-pagefind-body[\s\S]*?<\/main>/)?.[0]
    if (!main) throw new Error(`No indexed content in ${htmlOf(route)}`)
    const keywords = Array.isArray(data.keywords) ? data.keywords.join(' ') : data.keywords
    pages.push({
      path: route,
      title: String(data.title).trim(),
      section: section ?? null,
      description: cap(String(data.description).trim()),
      headings: headings(main),
      keywords: keywords ? String(keywords).trim() : '',
    })
  }
  return pages
}

const skipped = []
const pages = (await walk(contentRoot, '', undefined, skipped)).sort((a, b) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
)
if (!pages.length) throw new Error('Search index has no pages')
const json = JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), base, pages })
await writeFile(output, json)
console.log(
  `Search index: ${pages.length} pages, ${json.length} bytes (${gzipSync(json).length} gzipped)` +
    (skipped.length ? `; skipped ${skipped.join(', ')}` : ''),
)
