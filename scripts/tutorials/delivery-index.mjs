// Collect reviewed tutorial deliveries into one local index for review.
// Usage: node scripts/tutorials/delivery-index.mjs tutorials/episodes.json DESTINATION
// Nothing is uploaded; DESTINATION is normally the primary checkout's ignored `.capture/`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const escape = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const deliveryFiles = [
  'walkthrough-captioned.mp4',
  'walkthrough-clean.mp4',
  'walkthrough.srt',
  'walkthrough.vtt',
  'review.html',
  'manifest.json',
  'captions.json',
]

export function validateCatalog(catalog) {
  if (catalog.version !== 1 || !Array.isArray(catalog.episodes) || !catalog.episodes.length)
    throw Error('Expected a version 1 catalog with episodes')
  const ids = new Set()
  for (const episode of catalog.episodes) {
    if (!/^[a-z0-9-]+$/.test(episode.id) || ids.has(episode.id))
      throw Error('Episode IDs must be unique lowercase slugs')
    ids.add(episode.id)
    if (!Number.isInteger(episode.series) || episode.series < 1)
      throw Error(`Episode ${episode.id}: series number required`)
    if (!['web', 'ios', 'hybrid'].includes(episode.platform))
      throw Error(`Episode ${episode.id}: platform must be web, ios, or hybrid`)
    if (!episode.story || !episode.output || !episode.post)
      throw Error(`Episode ${episode.id}: story, output, and post are required`)
    const review = episode.review
    if (typeof review?.framesChecked !== 'boolean' || typeof review?.listened !== 'boolean')
      throw Error(`Episode ${episode.id}: record framesChecked and listened explicitly`)
    // A listen is a person hearing the full export; caption alignment is not one.
    if (review.listened && !review.listenedBy)
      throw Error(`Episode ${episode.id}: a completed listen needs listenedBy`)
  }
}

async function checkPlayer(browser, reviewFile, expectedCues) {
  const page = await browser.newPage()
  try {
    await page.goto(`file://${reviewFile}`)
    const result = await page.evaluate(async () => {
      const video = document.getElementById('clean')
      const track = video.textTracks[0]
      track.mode = 'showing'
      for (let i = 0; i < 50 && !track.cues?.length; i++)
        await new Promise((resolve) => setTimeout(resolve, 100))
      // Disabling a track clears its cue list, so count before toggling off.
      const cues = track.cues?.length ?? 0
      const on = track.mode
      track.mode = 'disabled'
      return { cues, language: track.language, on, off: track.mode }
    })
    if (result.cues !== expectedCues || result.on !== 'showing' || result.off !== 'disabled')
      throw Error(`Player caption check failed: ${reviewFile}`)
    return { checkedAt: new Date().toISOString(), ...result }
  } finally {
    await page.close()
  }
}

export async function buildIndex(catalogFile, destination, root = process.cwd()) {
  const catalog = JSON.parse(fs.readFileSync(catalogFile))
  validateCatalog(catalog)
  fs.mkdirSync(destination, { recursive: true })
  const browser = await chromium.launch()
  const rows = []
  try {
    for (const episode of catalog.episodes) {
      const delivery = path.resolve(root, episode.output, 'delivery')
      if (!fs.existsSync(path.join(delivery, 'manifest.json'))) {
        rows.push({ episode, missing: true })
        continue
      }
      const target = path.join(destination, episode.id)
      fs.mkdirSync(target, { recursive: true })
      for (const file of deliveryFiles)
        fs.copyFileSync(path.join(delivery, file), path.join(target, file))
      const manifest = JSON.parse(fs.readFileSync(path.join(delivery, 'manifest.json')))
      const cues = JSON.parse(fs.readFileSync(path.join(delivery, 'captions.json'))).cues.length
      const player = await checkPlayer(browser, path.join(target, 'review.html'), cues)
      fs.writeFileSync(path.join(target, 'player-qa.json'), JSON.stringify(player, null, 2) + '\n')
      rows.push({ episode, manifest, cues, player })
    }
  } finally {
    await browser.close()
  }
  const status = (row) =>
    row.missing
      ? 'Not rendered'
      : row.episode.review.listened
        ? `Listened by ${escape(row.episode.review.listenedBy)}`
        : 'Full listen pending'
  const body = rows
    .map(
      (row) =>
        `<tr><td>${row.episode.series}</td><td>${
          row.missing
            ? escape(row.episode.title)
            : `<a href="${row.episode.id}/review.html">${escape(row.episode.title)}</a>`
        }</td><td>${row.episode.platform}</td><td>${
          row.missing ? '—' : `${Math.round(row.manifest.duration)} s · ${row.cues} cues`
        }</td><td>${row.missing ? '—' : row.episode.review.framesChecked ? 'Checked' : 'Pending'}</td><td>${status(row)}</td><td>${
          row.missing
            ? '—'
            : `<a href="${row.episode.id}/walkthrough-captioned.mp4">LinkedIn</a> · <a href="${row.episode.id}/walkthrough-clean.mp4">Docs</a> · <a href="${row.episode.id}/walkthrough.vtt">VTT</a> · <a href="${row.episode.id}/walkthrough.srt">SRT</a>`
        }</td></tr>`,
    )
    .join('')
  fs.writeFileSync(
    path.join(destination, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>noctune tutorials · delivery index</title><style>body{font:17px system-ui;background:#f3f8f2;color:#132d2b;max-width:1280px;margin:32px auto;padding:0 24px}table{border-collapse:collapse;width:100%;background:#fff;border-radius:12px;overflow:hidden}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #d8e2de;vertical-align:top}th{background:#e3efea}a{color:#11736f}</style><h1>noctune beginner tutorials</h1><p>Fictional demo data · review drafts, not published. Each episode has a captioned LinkedIn export and a clean docs export with English VTT/SRT from the same narration and timeline.</p><table><thead><tr><th>#</th><th>Episode</th><th>Platform</th><th>Length</th><th>Frames</th><th>Listening</th><th>Files</th></tr></thead><tbody>${body}</tbody></table><p>Generated ${new Date().toISOString()} from tutorials/episodes.json.</p></html>\n`,
  )
  return rows
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [catalog, destination] = process.argv.slice(2)
  try {
    if (!catalog || !destination)
      throw Error('Usage: delivery-index.mjs tutorials/episodes.json DESTINATION')
    const rows = await buildIndex(path.resolve(catalog), path.resolve(destination))
    console.log(
      `Delivery index: ${path.resolve(destination, 'index.html')} (${rows.length} episodes)`,
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
