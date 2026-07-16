import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { verifyRasterAssets } from './verify-raster-assets.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')

test('accepts materialized raster assets', async (context) => {
  const root = await createFixtureRoot(context)
  await fs.copyFile(
    path.join(repositoryRoot, 'public/noctune-logo.png'),
    path.join(root, 'public/logo.png'),
  )

  assert.equal(await verifyRasterAssets(root), 1)
})

test('rejects Git LFS pointer files', async (context) => {
  const root = await createFixtureRoot(context)
  await fs.writeFile(
    path.join(root, 'public/logo.png'),
    [
      'version https://git-lfs.github.com/spec/v1',
      `oid sha256:${'0'.repeat(64)}`,
      'size 103423',
      '',
    ].join('\n'),
  )

  await assert.rejects(
    verifyRasterAssets(root),
    /Git LFS pointer found; enable Git LFS for the deployment checkout/,
  )
})

test('rejects undecodable raster bytes', async (context) => {
  const root = await createFixtureRoot(context)
  await fs.writeFile(path.join(root, 'public/logo.png'), 'not an image')

  await assert.rejects(verifyRasterAssets(root), /invalid raster/)
})

/** Creates and cleans up one isolated public-directory fixture. */
async function createFixtureRoot(context) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'noctune-raster-assets-'))
  await fs.mkdir(path.join(root, 'public'))
  context.after(() => fs.rm(root, { force: true, recursive: true }))
  return root
}
