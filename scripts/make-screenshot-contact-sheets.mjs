import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(scriptsDir, '..')
const manifest = JSON.parse(await fs.readFile(path.join(docsRoot, 'capture/manifest.json'), 'utf8'))
const outputDir = path.join(docsRoot, '.capture/contact-sheets')

const columns = 3
const rows = 3
const itemsPerSheet = columns * rows
const thumbWidth = 480
const thumbHeight = 270
const labelHeight = 34
const cellHeight = labelHeight + thumbHeight

await fs.rm(outputDir, { force: true, recursive: true })
await fs.mkdir(outputDir, { recursive: true })

for (let offset = 0; offset < manifest.length; offset += itemsPerSheet) {
  const captures = manifest.slice(offset, offset + itemsPerSheet)
  const composites = []

  for (const [index, capture] of captures.entries()) {
    const left = (index % columns) * thumbWidth
    const top = Math.floor(index / columns) * cellHeight
    const image = await sharp(path.join(docsRoot, capture.output))
      .resize(thumbWidth, thumbHeight, { fit: 'fill' })
      .png()
      .toBuffer()

    composites.push(
      { input: labelSvg(capture.id), left, top },
      { input: image, left, top: top + labelHeight },
    )
  }

  const sheetNumber = Math.floor(offset / itemsPerSheet) + 1
  const outputPath = path.join(outputDir, `sheet-${String(sheetNumber).padStart(2, '0')}.png`)

  await sharp({
    create: {
      width: columns * thumbWidth,
      height: rows * cellHeight,
      channels: 3,
      background: '#d9e1df',
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath)
}

console.log(
  `[screenshots] wrote ${Math.ceil(manifest.length / itemsPerSheet)} contact sheets to ${path.relative(docsRoot, outputDir)}`,
)

function labelSvg(id) {
  const escapedId = id
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

  return Buffer.from(`
    <svg width="${thumbWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${thumbWidth}" height="${labelHeight}" fill="#162322"/>
      <text x="12" y="23" font-family="Arial, sans-serif" font-size="16" fill="#fff">${escapedId}</text>
    </svg>
  `)
}
