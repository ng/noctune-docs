// Publish listened-to tutorial videos to the docs media CDN and record them in
// tutorials/published.json, which <TutorialVideo> reads at build time.
// Usage: pnpm tutorials:publish [--dry-run | --write] [DELIVERY_DIR]
// DELIVERY_DIR defaults to the primary checkout's ignored `.capture/tutorials/delivery`.
// Never runs during `pnpm build`; only clean (uncaptioned) MP4s and posters are uploaded.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { validateCatalog } from './delivery-index.mjs'

export const contentTypes = { mp4: 'video/mp4', jpg: 'image/jpeg' }
const cacheControl = 'public, max-age=31536000, immutable'
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Only a full listen by a named person plus a frame check makes an episode publishable. */
export const isApproved = (episode) =>
  episode.review.framesChecked === true &&
  episode.review.listened === true &&
  Boolean(episode.review.listenedBy)

export function location(sha256, filename, origin) {
  const host = new URL(origin)
  if (host.protocol !== 'https:' || host.pathname !== '/' || host.search || host.hash)
    throw Error('MEDIA_ORIGIN must be an HTTPS origin without a path')
  if (!/^[a-f0-9]{64}$/.test(sha256) || !/^[a-z0-9-]+\.(mp4|jpg)$/.test(filename))
    throw Error(`Invalid media object: ${filename}`)
  const suffix = `${sha256}/${filename}`
  return { key: `assets/${suffix}`, url: `${host.origin}/assets/${suffix}` }
}

export function aws(args) {
  try {
    return JSON.parse(
      execFileSync('aws', [...args, '--output', 'json', '--no-cli-pager'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }) || '{}',
    )
  } catch (error) {
    throw Error(`AWS ${args[0]} ${args[1]} failed: ${error.stderr?.toString() || error.message}`, {
      cause: error,
    })
  }
}

export function extractPoster(video, seconds = 2) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-poster-')), 'poster.jpg')
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-ss',
    String(seconds),
    '-i',
    video,
    '-frames:v',
    '1',
    '-q:v',
    '3',
    file,
  ])
  return fs.readFileSync(file)
}

async function verifyDelivery(entry, bytes, type, fetcher) {
  const response = await fetcher(entry.url, {
    headers: { 'Accept-Encoding': 'identity' },
    signal: AbortSignal.timeout(120000),
    redirect: 'error',
  })
  if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== type)
    throw Error(`CDN delivery failed: ${entry.url}`)
  const received = Buffer.from(await response.arrayBuffer())
  if (received.length !== bytes.length || digest(received) !== digest(bytes))
    throw Error(`CDN checksum mismatch: ${entry.url}`)
}

async function putObject({ bucket, entry, bytes, file, type, runAws, fetcher, log }) {
  const sha256 = digest(bytes)
  const found = runAws([
    's3api',
    'list-objects-v2',
    '--bucket',
    bucket,
    '--prefix',
    entry.key,
    '--max-keys',
    '1',
  ])
  if (!found.Contents?.some((object) => object.Key === entry.key)) {
    runAws([
      's3api',
      'put-object',
      '--bucket',
      bucket,
      '--key',
      entry.key,
      '--body',
      file,
      '--content-type',
      type,
      '--cache-control',
      cacheControl,
      '--metadata',
      JSON.stringify({ sha256 }),
      '--checksum-algorithm',
      'SHA256',
      '--checksum-sha256',
      Buffer.from(sha256, 'hex').toString('base64'),
      '--if-none-match',
      '*',
    ])
    log(`[uploaded] ${entry.key}`)
  }
  const head = runAws([
    's3api',
    'head-object',
    '--bucket',
    bucket,
    '--key',
    entry.key,
    '--checksum-mode',
    'ENABLED',
  ])
  if (
    head.ContentLength !== bytes.length ||
    head.ChecksumSHA256 !== Buffer.from(sha256, 'hex').toString('base64') ||
    head.ContentType !== type ||
    head.CacheControl !== cacheControl
  )
    throw Error(`Stored object verification failed: ${entry.key}`)
  await verifyDelivery(entry, bytes, type, fetcher)
  log(`[verified] ${entry.url}`)
}

// Dependencies are injectable so tests never contact AWS, the CDN, or FFmpeg.
export async function publish({
  catalog,
  previous = { version: 1, videos: {} },
  delivery,
  captionsDir,
  bucket,
  origin,
  write = false,
  runAws = aws,
  fetcher = fetch,
  poster = extractPoster,
  log = console.log,
}) {
  validateCatalog(catalog)
  if (write && !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket || ''))
    throw Error('Set MEDIA_BUCKET to the Terraform docs_media bucket')
  const videos = { ...previous.videos }
  const approved = catalog.episodes.filter(isApproved)
  for (const episode of catalog.episodes.filter((episode) => !isApproved(episode)))
    log(`[skipped] ${episode.id}: full listen not recorded in tutorials/episodes.json`)
  // Validate every approved delivery before any upload.
  const sources = approved.map((episode) => {
    const dir = path.join(delivery, episode.id)
    const file = path.join(dir, 'walkthrough-clean.mp4')
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')))
    const vtt = fs.readFileSync(path.join(dir, 'walkthrough.vtt'), 'utf8')
    if (!vtt.startsWith('WEBVTT')) throw Error(`${episode.id}: walkthrough.vtt is not WebVTT`)
    if (!manifest.fullDecodePassed) throw Error(`${episode.id}: full decode check has not passed`)
    return { episode, file, manifest, vtt, bytes: fs.readFileSync(file) }
  })
  for (const { episode, file, manifest, vtt, bytes } of sources) {
    const video = location(digest(bytes), `${episode.id}.mp4`, origin)
    if (!write) {
      log(`[dry-run] ${episode.id} → s3://${bucket || '$MEDIA_BUCKET'}/${video.key}`)
      continue
    }
    await putObject({
      bucket,
      entry: video,
      bytes,
      file,
      type: contentTypes.mp4,
      runAws,
      fetcher,
      log,
    })
    const posterBytes = poster(file)
    const posterFile = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-poster-')),
      'poster.jpg',
    )
    fs.writeFileSync(posterFile, posterBytes)
    const still = location(digest(posterBytes), `${episode.id}.jpg`, origin)
    await putObject({
      bucket,
      entry: still,
      bytes: posterBytes,
      file: posterFile,
      type: contentTypes.jpg,
      runAws,
      fetcher,
      log,
    })
    fs.mkdirSync(captionsDir, { recursive: true })
    fs.writeFileSync(path.join(captionsDir, `${episode.id}.vtt`), vtt)
    videos[episode.id] = {
      title: episode.title,
      platform: episode.platform,
      series: episode.series,
      url: video.url,
      sha256: digest(bytes),
      bytes: bytes.length,
      poster: still.url,
      captions: `/tutorials/${episode.id}.vtt`,
      duration: Math.round(manifest.duration * 10) / 10,
      width: manifest.width,
      height: manifest.height,
      listenedBy: episode.review.listenedBy,
    }
  }
  return { version: 1, videos }
}

async function main() {
  const args = process.argv.slice(2)
  const flags = args.filter((arg) => arg.startsWith('--'))
  const positional = args.filter((arg) => !arg.startsWith('--'))
  if (
    flags.some((flag) => !['--write', '--dry-run'].includes(flag)) ||
    (flags.includes('--write') && flags.includes('--dry-run')) ||
    positional.length > 1
  )
    throw Error('Usage: pnpm tutorials:publish [--dry-run | --write] [DELIVERY_DIR]')
  const write = flags.includes('--write')
  const receipt = 'tutorials/published.json'
  const result = await publish({
    catalog: JSON.parse(fs.readFileSync('tutorials/episodes.json')),
    previous: JSON.parse(fs.readFileSync(receipt)),
    delivery: path.resolve(positional[0] || '.capture/tutorials/delivery'),
    captionsDir: 'public/tutorials',
    bucket: process.env.MEDIA_BUCKET,
    origin: process.env.MEDIA_ORIGIN || 'https://docs-media.noctune.ai',
    write,
  })
  if (write) {
    fs.writeFileSync(`${receipt}.tmp`, `${JSON.stringify(result, null, 2)}\n`)
    fs.renameSync(`${receipt}.tmp`, receipt)
    console.log(`Verified receipt saved. Review and commit ${receipt} and public/tutorials/.`)
  } else console.log('Dry run only; no AWS calls or files changed. Add --write to publish.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
