import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(scriptsDir, '..')
const assetRoot = process.env.CAPTURE_OUTPUT_ROOT
  ? path.resolve(process.env.CAPTURE_OUTPUT_ROOT)
  : docsRoot
const manifestPath = path.join(docsRoot, 'capture/manifest.json')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const errors = []
const placeholderImageHost = ['place', 'cats.com'].join('')

for (const capture of manifest) {
  const outputPath = path.resolve(assetRoot, capture.output)
  if (!outputPath.startsWith(`${assetRoot}${path.sep}`)) {
    errors.push(`${capture.id}: output escapes the configured asset root`)
    continue
  }
  let stats
  try {
    stats = await fs.stat(outputPath)
  } catch {
    errors.push(`${capture.id}: missing ${capture.output}`)
    continue
  }

  const metadata = await sharp(outputPath).metadata()
  if (metadata.format !== 'webp') {
    errors.push(`${capture.id}: expected WebP, got ${metadata.format || 'unknown'}`)
  }
  if (!metadata.width || !metadata.height) {
    errors.push(`${capture.id}: image dimensions are unavailable`)
  } else {
    if (metadata.width > capture.maxWidth) {
      errors.push(`${capture.id}: width ${metadata.width} exceeds ${capture.maxWidth}`)
    }
    if (capture.expectedWidth && metadata.width !== capture.expectedWidth) {
      errors.push(`${capture.id}: expected width ${capture.expectedWidth}, got ${metadata.width}`)
    }
    if (capture.expectedHeight && metadata.height !== capture.expectedHeight) {
      errors.push(
        `${capture.id}: expected height ${capture.expectedHeight}, got ${metadata.height}`,
      )
    }
  }
  if (capture.minBytes && stats.size < capture.minBytes) {
    errors.push(`${capture.id}: ${stats.size} bytes is below ${capture.minBytes}`)
  }
  if (stats.size > capture.maxBytes) {
    errors.push(`${capture.id}: ${stats.size} bytes exceeds ${capture.maxBytes}`)
  }

  const publicUrl = `/${capture.output.replace(/^public\//, '')}`
  for (const docsFile of capture.docs) {
    const content = await fs.readFile(path.join(docsRoot, docsFile), 'utf8')
    if (!content.includes(publicUrl)) {
      errors.push(`${capture.id}: ${docsFile} does not reference ${publicUrl}`)
    }
  }
}

const contentRoot = path.join(docsRoot, 'content')
for (const file of await walk(contentRoot)) {
  if (!file.endsWith('.mdx')) continue
  const content = await fs.readFile(file, 'utf8')
  if (content.includes(placeholderImageHost)) {
    errors.push(`${path.relative(docsRoot, file)} still references ${placeholderImageHost}`)
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'))
  process.exit(1)
}

console.log(`[screenshots] verified ${manifest.length} capture${manifest.length === 1 ? '' : 's'}`)

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map((entry) => {
        const file = path.join(directory, entry.name)
        return entry.isDirectory() ? walk(file) : file
      }),
    )
  ).flat()
}
