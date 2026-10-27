import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await fs.readFile(path.join(root, 'capture/manifest.json'), 'utf8'))
const policy = JSON.parse(await fs.readFile(path.join(root, 'capture/image-policy.json'), 'utf8'))
const ids = [
  'collaborative-section-cards',
  'collaborative-suggestion',
  'templates-practice-locked',
  'messages-inbox',
]
const target = path.join(root, 'social/linkedin/assets/2026-10-27')
const pending = []
for (const id of ids) {
  const capture = manifest.find((item) => item.id === id)
  if (!capture) throw new Error(`Unknown capture ${id}`)
  const original = await fs.readFile(path.join(root, '.capture/originals', `${id}.png`))
  const encoded = await sharp(original)
    .resize({ width: capture.maxWidth ?? policy.viewport.width, withoutEnlargement: true })
    .flatten({ background: policy.output.background })
    .toColourspace(policy.output.colorSpace)
    .webp({
      effort: policy.encoding.effort,
      quality: policy.encoding.quality,
      smartSubsample: policy.encoding.smartSubsample,
    })
    .toBuffer()
  if (!encoded.equals(await fs.readFile(path.join(root, capture.output)))) {
    throw new Error(`${id}: original does not match the verified capture; rerun screenshots:update`)
  }
  pending.push({ id, original })
}
await fs.mkdir(target, { recursive: true })
for (const { id, original } of pending) await fs.writeFile(path.join(target, `${id}.png`), original)
console.log(`Exported ${pending.length} original browser PNGs for LinkedIn.`)
