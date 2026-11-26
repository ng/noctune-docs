import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { mediaEventSegments, sceneAppAudio, validateAppAudio } from './app-audio.mjs'
import { narrate, validateStory } from './narrate.mjs'
import { registerProvider } from './providers/index.mjs'

const OPENED = 1_000_000
const at = (seconds) => OPENED + seconds * 1000
const SRC = 'https://cdn.example/dental-samples/recordings/abc.m4a?Policy=x'

test('media events become clip-time segments of what was audible', () => {
  const events = [
    // Before the in-point: dropped
    { type: 'playing', epochMs: at(1), media: 0, paused: false, src: SRC },
    { type: 'pause', epochMs: at(2), media: 1, paused: true, src: SRC },
    // Straddles the in-point (4 s): trimmed, media start moves with it
    { type: 'playing', epochMs: at(3), media: 10, paused: false, src: SRC },
    // A chart quote's play button seeks while playing; no new `playing` follows
    { type: 'seeking', epochMs: at(7), media: 42, paused: false, src: SRC },
    { type: 'seeked', epochMs: at(7.1), media: 42, paused: false, src: SRC },
    { type: 'pause', epochMs: at(10.1), media: 45, paused: true, src: SRC },
    // Another element: ignored
    { type: 'playing', epochMs: at(11), media: 0, paused: false, src: 'blob:other' },
    // Still playing when the clip ends at 14 s (raw 18 s)
    { type: 'playing', epochMs: at(16), media: 60, paused: false, src: SRC },
  ]
  const segments = mediaEventSegments(events, {
    openedEpochMs: OPENED,
    sourceIn: 4,
    clipDuration: 14,
    src: 'dental-samples/recordings/abc.m4a',
  })
  assert.deepEqual(segments, [
    { clipStart: 0, clipEnd: 3, mediaStart: 11 },
    { clipStart: 3.1, clipEnd: 6.1, mediaStart: 42 },
    { clipStart: 12, clipEnd: 14, mediaStart: 60 },
  ])
})

const scene = (overrides = {}) => ({
  id: 'listen',
  platform: 'web',
  source: 'listen.mp4',
  speechSeconds: 2,
  duration: 9,
  appAudio: {
    source: 'listen-app.m4a',
    label: 'Sample dictation · synthetic voice',
    segments: [{ clipStart: 5, clipEnd: 12, mediaStart: 30 }],
  },
  ...overrides,
})

test('scene pieces follow the in-point, stop at the scene end, and never talk over narration', () => {
  // start 1: heard from scene 4 s to the scene's end at 9 s, from media 30 s
  assert.deepEqual(sceneAppAudio(scene({ start: 1 })), [{ at: 4, from: 30, length: 5 }])
  // start 6: the segment began before the scene, so the media start advances
  assert.throws(() => sceneAppAudio(scene({ start: 6 })), /before the narration ends/)
  assert.deepEqual(sceneAppAudio(scene({ start: 6, speechSeconds: 0 }), { gap: 0 }), [
    { at: 0, from: 31, length: 6 },
  ])
  assert.throws(() => sceneAppAudio(scene({ start: 20 })), /outside the scene/)
  assert.throws(
    () => sceneAppAudio(scene({ start: 3.5, speechSeconds: 1.4 })),
    /starts at 1.50 s, before the narration ends at 1.40 s/,
  )
  assert.deepEqual(sceneAppAudio(scene({ appAudio: undefined })), [])
})

test('app audio fields are validated and need recorded footage', () => {
  validateAppAudio(scene())
  for (const bad of [
    { source: '../escape.m4a' },
    { label: '' },
    { label: 'x'.repeat(61) },
    { segments: [] },
    { segments: [{ clipStart: 3, clipEnd: 2, mediaStart: 0 }] },
    { gain: 5 },
  ])
    assert.throws(
      () => validateAppAudio(scene({ appAudio: { ...scene().appAudio, ...bad } })),
      /Invalid app audio/,
    )
  assert.throws(
    () => validateAppAudio(scene({ instructionCard: ['Read this.'], source: undefined })),
    /needs recorded footage/,
  )
})

function wav(seconds = 0.5) {
  const samples = Math.round(24000 * seconds)
  const bytes = Buffer.alloc(44 + samples * 2)
  bytes.write('RIFF', 0)
  bytes.writeUInt32LE(36 + samples * 2, 4)
  bytes.write('WAVEfmt ', 8)
  bytes.writeUInt32LE(16, 16)
  bytes.writeUInt16LE(1, 20)
  bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(24000, 24)
  bytes.writeUInt32LE(48000, 28)
  bytes.writeUInt16LE(2, 32)
  bytes.writeUInt16LE(16, 34)
  bytes.write('data', 36)
  bytes.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++)
    bytes.writeInt16LE(Math.round(Math.sin(i * 0.1) * 4000), 44 + i * 2)
  return bytes
}

test('hold lengthens a scene after its narration', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-hold-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  registerProvider('hold-test', {
    validate() {},
    async synthesize() {
      return { bytes: wav(), extension: 'wav' }
    },
  })
  const story = {
    version: 1,
    title: 'Hold',
    scenes: [{ id: 'one', platform: 'web', narration: 'Listen.', hold: 3 }],
  }
  assert.throws(
    () => validateStory({ ...story, scenes: [{ ...story.scenes[0], hold: 25 }] }),
    /hold must be/,
  )
  const output = path.join(root, 'narration')
  await narrate(story, { provider: 'hold-test', model: 'test' }, {}, output, path.join(root, 'c'))
  const [timed] = JSON.parse(fs.readFileSync(path.join(output, 'timeline.json'))).scenes
  assert.equal(timed.duration, Math.ceil((timed.speechSeconds + 0.45 + 3) * 30) / 30)
})

/** Mean absolute sample level of the rendered audio between two times */
function level(file, from, to) {
  const pcm = execFileSync('ffmpeg', [
    '-v',
    'error',
    '-ss',
    String(from),
    '-t',
    String(to - from),
    '-i',
    file,
    '-ac',
    '1',
    '-ar',
    '8000',
    '-f',
    's16le',
    '-',
  ])
  let sum = 0
  for (let i = 0; i + 1 < pcm.length; i += 2) sum += Math.abs(pcm.readInt16LE(i))
  return sum / (pcm.length / 2)
}

test('the renderer mixes the played file in at the moments the footage plays it', async (t) => {
  const { render } = await import('./render.mjs')
  const { prepareMedia } = await import('./prepare-media.mjs')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-app-audio-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const recordings = path.join(root, 'recordings')
  fs.mkdirSync(recordings)
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'testsrc=size=1600x900:rate=30:duration=8',
    '-pix_fmt',
    'yuv420p',
    path.join(recordings, 'listen.mp4'),
  ])
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=24000:duration=20',
    '-c:a',
    'aac',
    path.join(recordings, 'listen-app.m4a'),
  ])
  const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  const shot = {
    id: 'listen',
    file: 'listen.mp4',
    sha256: sha(path.join(recordings, 'listen.mp4')),
    appAudio: {
      file: 'listen-app.m4a',
      label: 'Sample dictation · synthetic voice',
      sha256: sha(path.join(recordings, 'listen-app.m4a')),
      segments: [{ clipStart: 2, clipEnd: 4, mediaStart: 5 }],
    },
  }
  fs.writeFileSync(
    path.join(recordings, 'capture-manifest.json'),
    JSON.stringify({ coreCommit: 'fixture', shots: [shot] }),
  )
  const storyFile = path.join(root, 'story.json')
  fs.writeFileSync(
    storyFile,
    JSON.stringify({
      version: 1,
      title: 'App audio',
      scenes: [
        { id: 'listen', platform: 'web', headline: ['Listen'], narration: 'Listen.', hold: 4 },
        {
          id: 'outro',
          platform: 'web',
          headline: ['Bye'],
          narration: 'Bye.',
          brandCard: ['noctune.ai'],
        },
      ],
    }),
  )
  const prepared = path.join(root, 'prepared')
  await prepareMedia(storyFile, recordings, prepared, root)
  const story = JSON.parse(fs.readFileSync(path.join(prepared, 'story.json')))
  // Brand cards need no media and pass through unchanged
  assert.deepEqual(story.scenes[1].brandCard, ['noctune.ai'])
  story.scenes = [story.scenes[0]]
  assert.deepEqual(story.scenes[0].appAudio, {
    source: 'listen-app.m4a',
    label: 'Sample dictation · synthetic voice',
    segments: [{ clipStart: 2, clipEnd: 4, mediaStart: 5 }],
  })
  const sources = JSON.parse(fs.readFileSync(path.join(prepared, 'sources.json')))
  assert.equal(sources[0].appAudioSha256, shot.appAudio.sha256)

  registerProvider('app-audio-test', {
    validate() {},
    async synthesize() {
      return { bytes: wav(0.5), extension: 'wav' }
    },
  })
  const narration = path.join(root, 'narration')
  await narrate(
    story,
    { provider: 'app-audio-test', model: 'test' },
    {},
    narration,
    path.join(root, 'cache'),
  )
  const output = path.join(root, 'video')
  await render(narration, output, { web: path.join(prepared, 'media') })
  const video = path.join(output, 'walkthrough-landscape.mp4')
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json')))
  assert.deepEqual(manifest.appAudio, [
    {
      scene: 'listen',
      label: 'Sample dictation · synthetic voice',
      sha256: shot.appAudio.sha256,
      pieces: [{ at: 2, from: 5, length: 2 }],
    },
  ])
  assert.equal(manifest.scenes[0].appAudio, undefined)
  // Silent between the narration and the playback, loud while it plays, silent after
  const before = level(video, 1.1, 1.8)
  const during = level(video, 2.3, 3.7)
  const after = level(video, 4.3, 4.8)
  assert.ok(during > 1000, `expected the played file in the mix, got ${during}`)
  assert.ok(before < 50 && after < 50, `expected silence around it, got ${before}, ${after}`)

  // A changed file is refused rather than mixed
  fs.writeFileSync(path.join(recordings, 'listen-app.m4a'), 'changed')
  await assert.rejects(prepareMedia(storyFile, recordings, prepared, root), /App audio checksum/)
})
