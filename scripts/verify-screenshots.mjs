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
const imagePolicyPath = path.join(docsRoot, 'capture/image-policy.json')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const imagePolicy = JSON.parse(await fs.readFile(imagePolicyPath, 'utf8'))
const errors = []
const placeholderImageHost = ['place', 'cats.com'].join('')
const byteSizes = []

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
  if (metadata.space !== imagePolicy.output.colorSpace) {
    errors.push(
      `${capture.id}: expected ${imagePolicy.output.colorSpace} color space, got ${metadata.space || 'unknown'}`,
    )
  }
  if (metadata.channels !== imagePolicy.output.channels) {
    errors.push(
      `${capture.id}: expected ${imagePolicy.output.channels} channels, got ${metadata.channels || 'unknown'}`,
    )
  }
  if (!imagePolicy.output.allowAlpha && metadata.hasAlpha) {
    errors.push(`${capture.id}: alpha channel is not allowed`)
  }
  if (
    !imagePolicy.output.allowEmbeddedMetadata &&
    (metadata.exif || metadata.icc || metadata.iptc || metadata.xmp)
  ) {
    errors.push(`${capture.id}: embedded metadata is not allowed`)
  }
  if (!metadata.width || !metadata.height) {
    errors.push(`${capture.id}: image dimensions are unavailable`)
  } else {
    const maxWidth = capture.maxWidth ?? imagePolicy.viewport.width
    const expectedWidth = capture.expectedWidth ?? imagePolicy.viewport.width
    const expectedHeight = capture.expectedHeight ?? imagePolicy.viewport.height
    if (metadata.width > maxWidth) {
      errors.push(`${capture.id}: width ${metadata.width} exceeds ${maxWidth}`)
    }
    if (metadata.width !== expectedWidth) {
      errors.push(`${capture.id}: expected width ${expectedWidth}, got ${metadata.width}`)
    }
    if (metadata.height !== expectedHeight) {
      errors.push(`${capture.id}: expected height ${expectedHeight}, got ${metadata.height}`)
    }
  }
  const minBytes = capture.minBytes ?? imagePolicy.budgets.minPerImageBytes
  const maxBytes = capture.maxBytes ?? imagePolicy.budgets.maxPerImageBytes
  if (stats.size < minBytes) {
    errors.push(`${capture.id}: ${stats.size} bytes is below ${minBytes}`)
  }
  if (stats.size > maxBytes) {
    errors.push(`${capture.id}: ${stats.size} bytes exceeds ${maxBytes}`)
  }
  byteSizes.push(stats.size)

  const publicUrl = `/${capture.output.replace(/^public\//, '')}`
  for (const docsFile of capture.docs) {
    const content = await fs.readFile(path.join(docsRoot, docsFile), 'utf8')
    if (!content.includes(publicUrl)) {
      errors.push(`${capture.id}: ${docsFile} does not reference ${publicUrl}`)
    }
  }
}

const totalBytes = byteSizes.reduce((sum, size) => sum + size, 0)
const averageBytes = byteSizes.length ? totalBytes / byteSizes.length : 0
const largestBytes = byteSizes.length ? Math.max(...byteSizes) : 0

if (totalBytes > imagePolicy.budgets.maxTotalBytes) {
  errors.push(`screenshot set: ${totalBytes} bytes exceeds ${imagePolicy.budgets.maxTotalBytes}`)
}
if (averageBytes > imagePolicy.budgets.maxAverageBytes) {
  errors.push(
    `screenshot set: ${Math.round(averageBytes)} average bytes exceeds ${imagePolicy.budgets.maxAverageBytes}`,
  )
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

console.log(
  `[screenshots] verified ${manifest.length} capture${manifest.length === 1 ? '' : 's'} ` +
    `(${formatBytes(totalBytes)} total, ${formatBytes(averageBytes)} average, ` +
    `${formatBytes(largestBytes)} largest)`,
)

/** Recursively lists files below a directory. */
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

/** Formats a byte count as a compact kibibyte value. */
function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`
}
