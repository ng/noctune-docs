import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { findPrerenderRoot } from '../scripts/prerender-root.mjs'

async function buildWith(dir, files = ['index.html', 'encounters/new-encounter.html']) {
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

test('finds the pages where a Vercel build leaves them', async () => {
  const base = await buildWith('.next/server/route-cache')
  // Vercel keeps the folder a local build uses, without the pages in it.
  await fs.mkdir(path.join(base, '.next/server/app/(docs)'), { recursive: true })
  assert.equal(await findPrerenderRoot(base), path.join(base, '.next/server/route-cache'))
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
