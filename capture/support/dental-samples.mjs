// Dental chart samples in the capture database, shared by the screenshot spec
// (`capture/dental-authenticated.spec.ts`) and the tutorial shots
// (`scripts/tutorials/web-shots.mjs`).
//
// noctune Core's docs capture seeder (`scripts/dental-samples/docs-capture.ts`)
// writes these encounters into the capture user's personal workspace, with ids
// derived from that user. Core pins the same ids in
// `DOCS_CAPTURE_DENTAL_ENCOUNTERS` and tests them against its plan. Each
// encounter's transcript and chart sit on the timeline of a committed
// synthetic-speech recording of an invented dictation
// (`scripts/dental-samples/recordings/<recording>.m4a`, Git LFS). Nothing is
// uploaded: `serveDentalRecordings` answers the page's signed audio request
// with that file, so the player loads, plays and seeks real audio.
import fs from 'node:fs'
import path from 'node:path'

/** The personal workspace sentinel for Core's `noctune-practice-id` cookie */
export const PERSONAL_WORKSPACE = 'personal'

export const DENTAL = {
  murphy: {
    id: '5c81afb0-47f7-5d5b-aff2-58376539ac28',
    patient: 'Murphy',
    recording: 'canine-full-cohat-long',
  },
  pepper: {
    id: '30e92f3c-1f0c-584a-a8f1-efbe752ee3b3',
    patient: 'Pepper',
    recording: 'canine-yorkie-perio-recheck',
  },
  bruno: {
    id: '2d52ba7b-241a-552c-b216-e90a6c685265',
    patient: 'Bruno',
    recording: 'canine-large-breed-fractures',
  },
  otis: {
    id: 'cdf7cdcc-a9dc-54ab-ab7e-a45717441589',
    patient: 'Otis',
    recording: 'canine-brachycephalic-crowding',
  },
  tigger: {
    id: '63867eed-0f59-568d-a86d-22bb596aa440',
    patient: 'Tigger',
    recording: 'feline-resorption-recheck',
  },
  tiggerFirstVisit: {
    id: 'f7aa5894-c679-5814-b2c2-7872819c6646',
    patient: 'Tigger',
    recording: 'feline-resorption-first-visit',
  },
  smokeyNoChart: {
    id: '97b9b0c8-d2bd-5792-92c6-f74536b9cffd',
    patient: 'Smokey',
    recording: 'feline-stomatitis',
  },
  oscarSuggested: {
    id: '42a21a93-5e93-5961-802c-d584e0691fa8',
    patient: 'Oscar',
    recording: 'oscar-suggested',
  },
  duchessSkipped: {
    id: '6ce9b375-d662-57a3-9d67-8724a061211a',
    patient: 'Duchess',
    recording: 'duchess-skipped',
  },
}

const RECORDINGS = 'scripts/dental-samples/recordings'

/** The committed recording behind a sample encounter, in a Core checkout */
export function dentalRecordingPath(coreDir, sample) {
  const file = path.join(coreDir, RECORDINGS, `${sample.recording}.m4a`)
  const head = fs.readFileSync(file).subarray(0, 64).toString('latin1')
  if (head.startsWith('version https://git-lfs'))
    throw new Error(`${file} is a Git LFS pointer; run git lfs pull in ${coreDir}`)
  return file
}

/** The part of the signed audio URL that names a sample encounter's recording */
export const dentalAudioKey = (sample) => `dental-samples/recordings/${sample.id}.m4a`

/** Open the capture user's personal workspace, where the samples live */
export async function usePersonalWorkspace(context, baseURL) {
  await context.addCookies([
    { name: 'noctune-practice-id', value: PERSONAL_WORKSPACE, url: baseURL },
  ])
}

/**
 * Answer each sample encounter's signed audio request with its committed
 * recording, with byte ranges, as CloudFront would. Registered after any
 * catch-all audio mock so it takes precedence for these keys.
 */
export async function serveDentalRecordings(page, coreDir) {
  const byId = new Map(Object.values(DENTAL).map((sample) => [sample.id, sample]))
  const cache = new Map()
  await page.route(
    /\/dental-samples\/recordings\/([0-9a-f-]{36})\.m4a(?:\?.*)?$/,
    async (route) => {
      const id = /recordings\/([0-9a-f-]{36})\.m4a/.exec(route.request().url())?.[1]
      const sample = id ? byId.get(id) : undefined
      if (!sample) return route.fulfill({ status: 404, body: 'Unknown dental sample' })
      if (!cache.has(id)) cache.set(id, fs.readFileSync(dentalRecordingPath(coreDir, sample)))
      const bytes = cache.get(id)
      const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range || '')
      const start = range ? Number(range[1]) : 0
      const end = range?.[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1
      await route.fulfill({
        status: range ? 206 : 200,
        contentType: 'audio/mp4',
        headers: {
          'accept-ranges': 'bytes',
          ...(range ? { 'content-range': `bytes ${start}-${end}/${bytes.length}` } : {}),
        },
        body: bytes.subarray(start, end + 1),
      })
    },
  )
}
