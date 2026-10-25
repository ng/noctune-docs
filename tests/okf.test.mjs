import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import { parse } from 'yaml'

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
const parser = unified().use(remarkParse).use(remarkFrontmatter)
function walk(dir) {
  if (dir instanceof URL) dir = fileURLToPath(dir)
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(name) : [name]
  })
}

test('bundle concepts conform to OKF; reserved indexes only contain index metadata', () => {
  for (const file of walk(new URL('../knowledge', import.meta.url))) {
    const tree = parser.parse(fs.readFileSync(file, 'utf8'))
    const yaml = tree.children[0]?.type === 'yaml' ? parse(tree.children[0].value) : null
    if (path.basename(file) === 'index.md') {
      if (yaml) assert.deepEqual(yaml, { okf_version: '0.2' })
    } else {
      assert.equal(typeof yaml?.type, 'string', file)
      assert.ok(yaml.type.trim(), file)
    }
  }
})

test('portable guide keeps screenshots, video links, concept links, and literal template examples', () => {
  const guide = read('knowledge/content/templates.md')
  assert.match(
    guide,
    /!\[noctune SOAP template editor[^\]]*\]\(https:\/\/docs.noctune.ai\/screenshots\/templates\/editor.webp\)/,
  )
  assert.match(guide, /\[Video: .*\]\(https:\/\/docs-media.noctune.ai\//)
  assert.match(guide, /\[Collaborative Notes\]\(encounters\/collaborative-notes.md\)/)
  assert.match(guide, /```text\n\{\{petname\}\}\n\{\{drug name\}\}/)
  assert.doesNotMatch(guide, /<BrowserFrame|<TutorialVideo/)
  const sentinel = read('knowledge/content/reference/sentinel.md')
  assert.match(sentinel, /```mermaid\nflowchart TD/)
  assert.match(read('knowledge/content/overview.md'), /# noctune\n/)
  assert.match(read('knowledge/content/overview.md'), /\[Encounters\]\(encounters\/overview.md\)/)
  assert.match(guide, /<span id="soap-templates"><\/span>/)
})

test('every relative Markdown link in the bundle resolves to a bundle file', () => {
  const bundle = new URL('../knowledge', import.meta.url)
  for (const file of walk(bundle)) {
    const tree = parser.parse(fs.readFileSync(file, 'utf8'))
    function visit(node) {
      if (node.url && !/^(?:[a-z][a-z\d+.-]*:|#|\/)/i.test(node.url)) {
        assert.ok(
          fs.existsSync(path.resolve(path.dirname(file), node.url.split('#')[0])),
          `${file}: ${node.url}`,
        )
      }
      node.children?.forEach(visit)
    }
    visit(tree)
  }
})

test('release automation keeps OKF metadata ahead of new changelog entries', () => {
  const config = JSON.parse(read('.releaserc.json'))
  const changelog = config.plugins.find(
    (p) => Array.isArray(p) && p[0] === '@semantic-release/changelog',
  )
  assert.ok(read('CHANGELOG.md').startsWith(changelog[1].changelogTitle))
  const exporter = config.plugins.indexOf('./scripts/release-okf.mjs')
  const commit = config.plugins.findIndex(
    (p) => Array.isArray(p) && p[0] === '@semantic-release/git',
  )
  assert.ok(exporter > config.plugins.indexOf(changelog) && exporter < commit)
  assert.ok(config.plugins[commit][1].assets.includes('knowledge/'))
})
