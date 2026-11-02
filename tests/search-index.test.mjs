import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const prerenderRoot = path.join(repositoryRoot, '.next/server/app')
const routesManifestPath = path.join(repositoryRoot, '.next/routes-manifest.json')
const indexPath = path.join(repositoryRoot, 'public/search-index.json')

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
const htmlOf = (route) => path.join(prerenderRoot, `${route === '/' ? '/index' : route}.html`)

test('search index lists visible guides with resolvable anchors', async () => {
  const index = await readJson(indexPath)
  assert.equal(index.version, 1)
  assert.equal(index.base, 'https://docs.noctune.ai')
  assert.ok(!Number.isNaN(Date.parse(index.generatedAt)))
  const paths = index.pages.map((page) => page.path)
  assert.equal(new Set(paths).size, paths.length)
  assert.ok(paths.includes('/'))
  assert.ok(paths.includes('/encounters/new-encounter'))
  assert.deepEqual(
    paths.filter((route) => route.startsWith('/ios')),
    [],
  )

  for (const page of index.pages) {
    assert.ok(page.title.trim(), page.path)
    assert.ok(page.description.trim(), page.path)
    assert.ok(page.description.length <= 201, page.path)
    const html = await fs.readFile(htmlOf(page.path), 'utf8')
    for (const { anchor } of page.headings) {
      assert.ok(html.includes(`id="${anchor}"`), `${page.path}#${anchor}`)
    }
  }
})

test('search index is readable cross-origin', async () => {
  const manifest = await readJson(routesManifestPath)
  const rule = manifest.headers.find((entry) => entry.source === '/search-index.json')
  assert.deepEqual(rule?.headers, [{ key: 'Access-Control-Allow-Origin', value: '*' }])
})
