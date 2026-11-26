import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../../', import.meta.url))
const source = path.join(root, 'marketing/source')
const output = path.resolve(process.argv[2] || path.join(root, 'marketing/exports'))
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json')))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
for (const [name, expected] of Object.entries(manifest.sha256)) {
  if (hash(fs.readFileSync(path.join(source, name))) !== expected)
    throw Error(`Source changed: ${name}. Verify the replacement and update its provenance.`)
}
fs.mkdirSync(output, { recursive: true })
const uri = (bytes) => `data:image/png;base64,${bytes.toString('base64')}`
const assets = {
  LOGO: uri(
    await sharp(path.join(source, 'logo-horizontal.png')).resize({ width: 660 }).png().toBuffer(),
  ),
  WEB: uri(fs.readFileSync(path.join(source, 'web-review.png'))),
  PHONE: uri(fs.readFileSync(path.join(source, 'ios-recording.png'))),
  BADGE: uri(
    await sharp(path.join(root, 'public/app-store-badge.svg'), { density: 288 }).png().toBuffer(),
  ),
}
const exports = []
async function write(name, svg, width, height) {
  const bytes = await sharp(Buffer.from(svg)).png().toBuffer()
  const metadata = await sharp(bytes).metadata()
  if (metadata.width !== width || metadata.height !== height || bytes.length >= 3_000_000)
    throw Error(`Invalid dimensions or file size: ${name}`)
  fs.writeFileSync(path.join(output, name), bytes)
  exports.push({ file: name, width, height, bytes: bytes.length, sha256: hash(bytes) })
}
for (const [template, name, width, height] of [
  ['hero', 'noctune-vetsoftwarehub-hero-1200x630.png', 1200, 630],
  ['linkedin-cover', 'noctune-linkedin-cover-1512x256.png', 1512, 256],
  ['linkedin-workflow', 'noctune-linkedin-workflow-cover-1512x256.png', 1512, 256],
]) {
  const svg = fs
    .readFileSync(path.join(root, `marketing/templates/${template}.svg`), 'utf8')
    .replace(/\{\{(LOGO|WEB|PHONE|BADGE)\}\}/g, (_, key) => assets[key])
  await write(name, svg, width, height)
}
for (const [file, background, name] of [
  ['logo-stacked-dark.png', '#F3F8F2', 'noctune-linkedin-logo-400x400.png'],
  ['logo-stacked-white.png', '#1D4052', 'noctune-linkedin-logo-white-400x400.png'],
]) {
  const bytes = await sharp(path.join(source, file))
    .resize({ width: 300, height: 300, fit: 'inside' })
    .png()
    .toBuffer()
  const { width, height } = await sharp(bytes).metadata()
  await write(
    name,
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${background}"/><image href="${uri(bytes)}" x="${(400 - width) / 2}" y="${(400 - height) / 2}" width="${width}" height="${height}"/></svg>`,
    400,
    400,
  )
}
// Dental charts (early preview): browser PNG originals of the verified dental
// captures, exported to source/dental/ with `pnpm social:export` and recorded
// with their hashes under `dental` in source/manifest.json. Until then, skip.
const dental = manifest.dental
if (!dental?.sha256 || !Object.keys(dental.sha256).length) {
  console.log('Dental chart sources are not recorded yet; skipped the dental exports.')
} else {
  for (const [name, expected] of Object.entries(dental.sha256)) {
    if (hash(fs.readFileSync(path.join(source, 'dental', name))) !== expected)
      throw Error(
        `Source changed: dental/${name}. Verify the replacement and update its provenance.`,
      )
  }
  const shot = (id) => {
    if (!dental.sha256[`${id}.png`]) throw Error(`Dental source not recorded: ${id}.png`)
    return uri(fs.readFileSync(path.join(source, 'dental', `${id}.png`)))
  }
  const fill = (template, values) =>
    fs
      .readFileSync(path.join(root, `marketing/templates/${template}.svg`), 'utf8')
      .replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
        if (!(key in values)) throw Error(`${template}: no value for ${key}`)
        return values[key]
      })
  const dog = shot('dental-chart-dog')
  const cat = shot('dental-chart-cat')
  for (const [template, values, name, width, height] of [
    [
      'dental-hero',
      { LOGO: assets.LOGO, SHOT: dog, SPECIES_LINE: 'Dogs and cats, tooth by tooth.' },
      'noctune-dental-charts-dog-1200x630.png',
      1200,
      630,
    ],
    [
      'dental-hero',
      { LOGO: assets.LOGO, SHOT: cat, SPECIES_LINE: 'Dogs and cats, tooth by tooth.' },
      'noctune-dental-charts-cat-1200x630.png',
      1200,
      630,
    ],
    [
      'dental-dog-cat',
      { LOGO: assets.LOGO, DOG: dog, CAT: cat },
      'noctune-dental-charts-dog-and-cat-1200x630.png',
      1200,
      630,
    ],
    [
      'dental-compare',
      {
        LOGO: assets.LOGO,
        SHOT: shot('dental-compare-cat'),
        // Source pixels of the 1600 × 900 capture shown in the frame; set after inspecting it
        CROP: dental.compareCrop ?? '320 0 1280 720',
      },
      'noctune-dental-charts-compare-1200x630.png',
      1200,
      630,
    ],
    [
      'dental-slide',
      { LOGO: assets.LOGO, DOG: dog, CAT: cat },
      'noctune-dental-charts-slide-1920x1080.png',
      1920,
      1080,
    ],
  ])
    await write(name, fill(template, values), width, height)
}
fs.writeFileSync(
  path.join(output, 'manifest.json'),
  JSON.stringify(
    {
      version: 1,
      sourceManifestSha256: hash(fs.readFileSync(path.join(source, 'manifest.json'))),
      exports,
    },
    null,
    2,
  ) + '\n',
)
console.log(`Rendered ${exports.length} marketing assets: ${output}`)
