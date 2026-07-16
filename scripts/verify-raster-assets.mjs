import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const RASTER_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'])
const LFS_POINTER_PREFIX = 'version https://git-lfs.github.com/spec/v1'

/** Verifies that deployed raster paths contain decodable image bytes, not LFS pointers. */
export async function verifyRasterAssets(root = process.cwd()) {
  const publicRoot = path.join(root, 'public')
  const files = (await walk(publicRoot)).filter((file) =>
    RASTER_EXTENSIONS.has(path.extname(file).toLowerCase()),
  )

  if (files.length === 0) {
    throw new Error(`No raster assets found below ${publicRoot}`)
  }

  const failures = []

  for (const file of files) {
    const contents = await fs.readFile(file)
    const relativePath = path.relative(root, file)

    if (contents.subarray(0, 128).toString('utf8').startsWith(LFS_POINTER_PREFIX)) {
      failures.push(
        `${relativePath}: Git LFS pointer found; enable Git LFS for the deployment checkout`,
      )
      continue
    }

    try {
      const metadata = await sharp(contents, { animated: true }).metadata()
      if (!metadata.format || !metadata.width || !metadata.height) {
        failures.push(`${relativePath}: decoded image is missing format or dimensions`)
      }
    } catch (error) {
      failures.push(
        `${relativePath}: invalid raster (${error instanceof Error ? error.message : error})`,
      )
    }
  }

  if (failures.length > 0) {
    throw new Error(`Raster asset verification failed:\n- ${failures.join('\n- ')}`)
  }

  return files.length
}

/** Recursively lists files below a directory. */
async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map((entry) => {
        const resolved = path.join(directory, entry.name)
        return entry.isDirectory() ? walk(resolved) : [resolved]
      }),
    )
  ).flat()
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const count = await verifyRasterAssets()
  console.log(`[assets] verified ${count} materialized raster assets`)
}
