import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import { parse } from 'yaml'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destination = path.join(root, 'knowledge')
const check = process.argv.includes('--check')
const published = JSON.parse(fs.readFileSync(path.join(root, 'tutorials/published.json'), 'utf8'))
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(name) : /\.mdx?$/.test(name) ? [name] : []
  })
}
// Git defines the source inventory, including new, nonignored documentation.
// This catches future folders as well as today's product and engineering guides.
const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: root,
      encoding: 'utf8',
    }).split('\0'),
  ),
]
  .filter((name) => /\.mdx?$/.test(name) && !name.startsWith('knowledge/'))
  .map((name) => path.join(root, name))
  .filter((name) => fs.existsSync(name))
  .sort()
const outputName = (source) =>
  source.replace(/\.mdx?$/, '.md').replace(/(^|\/)index\.md$/, '$1overview.md')
const names = new Map(
  files.map((file) => {
    const source = path.relative(root, file)
    return [source, outputName(source)]
  }),
)
const routes = new Map(
  [...names]
    .filter(([f]) => f.startsWith('content/'))
    .map(([f, out]) => [
      '/' +
        f
          .slice(8)
          .replace(/\.mdx?$/, '')
          .replace(/(^|\/)index$/, '')
          .replace(/\/$/, ''),
      out,
    ]),
)
const renderer = unified()
  .use(remarkStringify, { bullet: '-', fences: true })
  .use(remarkGfm)
  .use(remarkFrontmatter)
const text = (value) => ({ type: 'text', value })
const link = (label, url) => ({ type: 'link', url, children: [text(label)] })
const paragraph = (child) => ({ type: 'paragraph', children: [child] })
const outputs = new Map()
const records = []
for (const file of files) {
  const source = path.relative(root, file)
  const output = names.get(source)
  const parser = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter)
  if (file.endsWith('.mdx')) parser.use(remarkMdx)
  const tree = parser.parse(fs.readFileSync(file, 'utf8'))
  if (tree.children[0]?.type !== 'yaml') throw new Error(`${source}: YAML frontmatter required`)
  const metadata = parse(tree.children[0].value)
  for (const key of ['type', 'title', 'description']) {
    if (typeof metadata?.[key] !== 'string' || !metadata[key].trim())
      throw new Error(`${source}: ${key} required`)
  }
  records.push({ source, output, ...metadata })
  function url(value) {
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(value)) return value
    const [base, fragment] = value.split('#')
    const knowledgePath = path.posix.normalize(path.posix.join(path.posix.dirname(source), base))
    if (knowledgePath.startsWith('knowledge/'))
      return (
        path.posix.relative(path.posix.dirname(output), knowledgePath.slice(10)) +
        (fragment ? `#${fragment}` : '')
      )
    const target = base.startsWith('/')
      ? routes.get(base.replace(/\/$/, '') || '/')
      : names.get(path.posix.normalize(path.posix.join(path.posix.dirname(source), base)))
    if (target)
      return (
        (path.posix.relative(path.posix.dirname(output), target) || path.posix.basename(target)) +
        (fragment ? `#${fragment}` : '')
      )
    // Assets and site-only routes remain usable outside a checkout.
    if (base.startsWith('/')) return `https://docs.noctune.ai${value}`
    if (knowledgePath.startsWith('public/'))
      return `https://docs.noctune.ai/${knowledgePath.slice(7)}`
    return `https://github.com/ng/noctune-docs/blob/develop/${path.posix.normalize(path.posix.join(path.posix.dirname(source), base))}${fragment ? `#${fragment}` : ''}`
  }
  function transform(node) {
    if (
      node.type === 'mdxjsEsm' ||
      node.type === 'mdxFlowExpression' ||
      node.type === 'mdxTextExpression'
    ) {
      throw new Error(
        `${source}: unsupported MDX expression; add an explicit portable representation`,
      )
    }
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const attr = Object.fromEntries(
        node.attributes.filter((a) => a.type === 'mdxJsxAttribute').map((a) => [a.name, a.value]),
      )
      switch (node.name) {
        case 'BrowserFrame':
          return paragraph({ type: 'image', url: url(attr.src), alt: attr.alt })
        case 'TutorialVideo': {
          const video = published.videos[attr.id]
          return paragraph(
            video
              ? link(`Video: ${video.title}`, video.url)
              : text(`Tutorial video (${attr.id}) is not yet published.`),
          )
        }
        case 'Logo':
          return text('noctune')
        case 'IntroFilm':
          return paragraph(link('Watch the noctune overview', 'https://docs.noctune.ai/'))
        case 'AppStoreBadge':
          return paragraph(
            link('Download noctune on the App Store', 'https://apps.apple.com/app/id6744552826'),
          )
        case 'Diagram': {
          const expression = attr.chart?.value
          if (
            !expression?.startsWith('`') ||
            !expression.endsWith('`') ||
            expression.includes('${')
          )
            throw new Error(`${source}: nonliteral diagram`)
          return { type: 'code', lang: 'mermaid', value: expression.slice(1, -1).trim() }
        }
        case 'span': {
          if (!attr.id || !/^[\w-]+$/.test(attr.id)) throw new Error(`${source}: unsupported span`)
          return { type: 'html', value: `<span id="${attr.id}"></span>` }
        }
        case 'div':
          return (node.children ?? []).map(transform).flat()
        default:
          throw new Error(`${source}: unsupported component ${node.name}`)
      }
    }
    if (node.url) node.url = url(node.url)
    if (node.children) node.children = node.children.flatMap(transform)
    if (node.type === 'heading') {
      const last = node.children.at(-1)
      const anchor = last?.type === 'text' && last.value.match(/\s*\[#([\w-]+)\]$/)
      if (anchor) {
        last.value = last.value.slice(0, anchor.index)
        return [{ type: 'html', value: `<span id="${anchor[1]}"></span>` }, node]
      }
    }
    return node
  }
  transform(tree)
  outputs.set(output, renderer.stringify(tree))
}
// Each directory has an actual OKF index; website index pages are concepts named overview.md.
const dirs = new Set(['.'])
for (const output of outputs.keys()) {
  let dir = path.posix.dirname(output)
  while (dir !== '.') {
    dirs.add(dir)
    dir = path.posix.dirname(dir)
  }
}
for (const dir of [...dirs].sort()) {
  const entries = records.filter((r) => path.posix.dirname(r.output) === dir)
  const children = [...dirs].filter((d) => d !== '.' && path.posix.dirname(d) === dir).sort()
  let body =
    dir === '.'
      ? '---\nokf_version: "0.2"\n---\n\n# noctune knowledge bundle\n\nGenerated by `pnpm okf:build` from the authored documentation. Edit sources, then regenerate.\n'
      : `# ${dir}\n`
  for (const child of children)
    body += `\n- [${path.posix.basename(child)}](${path.posix.basename(child)}/index.md) - Documentation in ${child}.\n`
  for (const entry of entries)
    body += `\n- [${entry.title}](${path.posix.basename(entry.output)}) - ${entry.description}\n`
  outputs.set(path.posix.join(dir, 'index.md'), body)
}
if (check) {
  const actual = fs.existsSync(destination)
    ? walk(destination).map((f) => path.relative(destination, f))
    : []
  for (const [name, body] of outputs) {
    if (!actual.includes(name) || fs.readFileSync(path.join(destination, name), 'utf8') !== body)
      throw new Error(`Stale OKF output: ${name}. Run pnpm okf:build.`)
  }
  for (const name of actual) if (!outputs.has(name)) throw new Error(`Unexpected OKF file: ${name}`)
} else {
  fs.mkdirSync(destination, { recursive: true })
  for (const existing of walk(destination))
    if (!outputs.has(path.relative(destination, existing))) fs.unlinkSync(existing)
  for (const [name, body] of outputs) {
    fs.mkdirSync(path.dirname(path.join(destination, name)), { recursive: true })
    fs.writeFileSync(path.join(destination, name), body)
  }
}
console.log(
  `OKF ${check ? 'verified' : 'generated'}: ${records.length} concepts, ${dirs.size} indexes.`,
)
