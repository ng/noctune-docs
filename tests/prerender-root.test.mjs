import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { findPrerenderRoot } from '../scripts/prerender-root.mjs'

const pages = (suffix) => ['index', 'encounters/new-encounter', 'handouts'].map((r) => r + suffix)

async function buildWith(dir, files = pages('.html')) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'prerender-root-'))
  for (const file of files) {
    const target = path.join(base, dir, file)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, '<html></html>')
  }
  return base
}

test('finds the pages where a local build writes them', async () => {
  const base = await buildWith('.next/server/app')
  assert.equal(await findPrerenderRoot(base), path.join(base, '.next/server/app'))
})

test('copies the pages a Vercel build leaves to their route names', async () => {
  const base = await buildWith('.next/output/functions', [
    ...pages('.prerender-fallback.html'),
    'handouts.rsc',
  ])
  // Vercel keeps the folder a local build uses, without the pages in it.
  await fs.mkdir(path.join(base, '.next/server/app/(docs)'), { recursive: true })
  const root = await findPrerenderRoot(base)
  assert.equal(root, path.join(base, '.next/search-pages'))
  const files = await fs.readdir(root, { recursive: true })
  assert.deepEqual(files.filter((file) => file.endsWith('.html')).sort(), [
    'encounters/new-encounter.html',
    'handouts.html',
    'index.html',
  ])
  assert.ok(!files.some((file) => file.endsWith('.rsc')))
})

test('copies again without keeping pages from an earlier build', async () => {
  const base = await buildWith('.next/output/functions', pages('.prerender-fallback.html'))
  await findPrerenderRoot(base)
  await fs.rm(path.join(base, '.next/output/functions/handouts.prerender-fallback.html'))
  const root = await findPrerenderRoot(base)
  assert.ok(!(await fs.readdir(root)).includes('handouts.html'))
})

test('finds the pages in a folder Next has not used before', async () => {
  const base = await buildWith('.next/output/prerendered')
  assert.equal(await findPrerenderRoot(base), path.join(base, '.next/output/prerendered'))
})

test('ignores a folder that holds only some of the pages', async () => {
  const base = await buildWith('.next/server/app', ['index.html'])
  await assert.rejects(findPrerenderRoot(base), /No prerendered pages found/)
})

test('says what it looked for when there is no build', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'prerender-root-'))
  await assert.rejects(findPrerenderRoot(base), /Run `next build` first/)
})
