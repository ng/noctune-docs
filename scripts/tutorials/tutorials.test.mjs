import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { getProvider, registerProvider } from './providers/index.mjs'
import { narrate, validateStory, fingerprint, timestamp } from './narrate.mjs'
import { withStagedOutput } from './staged-output.mjs'

const fakeAudio = () =>
  new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'audio/wav' } })
test('Deepgram routes Flux and Aura to their respective APIs without leaking voice controls', async () => {
  for (const [model, version] of [
    ['flux-haley-en', 'v2'],
    ['aura-2-athena-en', 'v1'],
  ]) {
    await getProvider('deepgram').synthesize({
      text: 'A test.',
      config: { model },
      env: { DEEPGRAM_API_KEY: 'test-key' },
      fetchImpl: async (url, options) => {
        assert.equal(url.pathname, `/${version}/speak`)
        assert.equal(url.searchParams.get('encoding'), 'flac')
        assert.equal(url.searchParams.get('model'), model)
        assert.equal(options.headers.Authorization, 'Token test-key')
        assert.deepEqual(JSON.parse(options.body), { text: 'A test.' })
        return fakeAudio()
      },
    })
  }
  assert.throws(
    () =>
      getProvider('deepgram').validate(
        { model: 'flux-haley-en', voice: 'other' },
        { DEEPGRAM_API_KEY: 'key' },
      ),
    /unsupported/,
  )
})
test('OpenAI adapter maps the common narration contract', async () => {
  await getProvider('openai').synthesize({
    text: 'A test.',
    config: { model: 'gpt-4o-mini-tts', voice: 'cedar', instructions: 'Calm' },
    env: { OPENAI_API_KEY: 'test-key' },
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/audio/speech')
      assert.deepEqual(JSON.parse(options.body), {
        model: 'gpt-4o-mini-tts',
        voice: 'cedar',
        input: 'A test.',
        instructions: 'Calm',
        response_format: 'wav',
      })
      return fakeAudio()
    },
  })
})
test('errors never echo provider response bodies or secrets', async () => {
  for (const response of [
    new Response('test-secret', { status: 401 }),
    new Response('{"secret":"test-secret"}', { headers: { 'content-type': 'application/json' } }),
  ]) {
    await assert.rejects(
      getProvider('deepgram').synthesize({
        text: 'Test.',
        config: { model: 'flux-haley-en' },
        env: { DEEPGRAM_API_KEY: 'test-secret' },
        fetchImpl: async () => response,
      }),
      (error) => !error.message.includes('test-secret'),
    )
  }
})
test('invalid scenes and missing keys fail before requests', () => {
  assert.throws(
    () => getProvider('deepgram').validate({ model: 'flux-haley-en' }, {}),
    /DEEPGRAM_API_KEY/,
  )
  assert.throws(
    () =>
      validateStory({
        version: 1,
        title: 'Test',
        scenes: [{ id: '../escape', narration: 'test', platform: 'web' }],
      }),
    /slugs/,
  )
  const scene = { id: 'one', narration: 'Test.', platform: 'web' }
  assert.throws(
    () => validateStory({ version: 1, title: 'Test', scenes: [scene, scene] }),
    /unique/,
  )
  assert.throws(
    () => validateStory({ version: 1, title: 'Test', kicker: 'lowercase', scenes: [scene] }),
    /Kicker/,
  )
  assert.throws(
    () => validateStory({ version: 1, title: 'Test', tagline: 'x'.repeat(61), scenes: [scene] }),
    /Tagline/,
  )
  validateStory({
    version: 1,
    title: 'Test',
    kicker: 'HYBRID WORKFLOW',
    tagline: 'One visit, from iPhone to web.',
    scenes: [scene],
  })
  assert.notEqual(
    fingerprint({ voice: 'one', text: 'a' }),
    fingerprint({ voice: 'two', text: 'a' }),
  )
  assert.equal(timestamp(61.25), '00:01:01,250')
})
function wav() {
  const samples = 2400
  const bytes = Buffer.alloc(44 + samples * 2)
  bytes.write('RIFF')
  bytes.writeUInt32LE(bytes.length - 8, 4)
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
test('pipeline decodes and caches audio, invalidates changed voices, and preserves previous outputs on failure', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  let calls = 0
  registerProvider('test', {
    validate() {},
    async synthesize() {
      calls++
      return { bytes: wav(), extension: 'wav' }
    },
  })
  const story = {
    version: 1,
    title: 'Test',
    scenes: [{ id: 'one', platform: 'web', narration: 'Test.' }],
  }
  const output = path.join(root, 'output'),
    cache = path.join(root, 'cache')
  const config = { provider: 'test', model: 'test', voice: 'one' }
  await narrate(story, config, {}, output, cache)
  await narrate(story, config, {}, output, cache)
  assert.equal(calls, 1)
  await narrate(story, { ...config, voice: 'two' }, {}, output, cache)
  assert.equal(calls, 2)
  const before = fs.readFileSync(path.join(output, 'timeline.json'), 'utf8')
  assert.ok(JSON.parse(before).scenes[0].duration > 0.1)
  registerProvider('broken', {
    validate() {},
    async synthesize() {
      return { bytes: Buffer.from('not audio'), extension: 'wav' }
    },
  })
  await assert.rejects(narrate(story, { provider: 'broken', model: 'bad' }, {}, output, cache))
  assert.equal(fs.readFileSync(path.join(output, 'timeline.json'), 'utf8'), before)
  await assert.rejects(
    withStagedOutput(output, async (stage) => {
      fs.writeFileSync(path.join(stage, 'timeline.json'), 'bad')
      throw Error('render failure')
    }),
  )
  assert.equal(fs.readFileSync(path.join(output, 'timeline.json'), 'utf8'), before)
  fs.writeFileSync(path.join(output, 'README.md'), 'Keep my notes')
  story.scenes[0].id = 'renamed'
  await narrate(story, config, {}, output, cache)
  assert.equal(fs.existsSync(path.join(output, 'one.wav')), false)
  assert.ok(fs.existsSync(path.join(output, 'renamed.wav')))
  assert.equal(fs.readFileSync(path.join(output, 'README.md'), 'utf8'), 'Keep my notes')
})

test('renderer handles web, iOS, and instruction cards and rejects unsafe inputs', async (t) => {
  const { render, sourcePath, validateTimeline } = await import('./render.mjs')
  const { default: sharp } = await import('sharp')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-render-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const media = path.join(root, 'media')
  fs.mkdirSync(media)
  await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#fff' } })
    .png()
    .toFile(path.join(media, 'web.png'))
  await sharp({ create: { width: 440, height: 956, channels: 3, background: '#123' } })
    .png()
    .toFile(path.join(media, 'ios.png'))
  const story = {
    version: 1,
    title: 'Rendering fixture',
    scenes: [
      {
        id: 'web',
        platform: 'web',
        headline: ['Web fixture'],
        narration: 'Web.',
        source: 'web.png',
      },
      {
        id: 'ios',
        platform: 'ios',
        headline: ['iOS fixture'],
        narration: 'Phone.',
        source: 'ios.png',
      },
      {
        id: 'card',
        platform: 'web',
        headline: ['Review'],
        narration: 'Review.',
        instructionCard: ['Check the draft.'],
        instructionTitle: 'Review evidence',
        instructionLabels: ['Follow the citation'],
        instructionStyle: 'evidence',
      },
    ],
  }
  registerProvider('render-test', {
    validate() {},
    async synthesize() {
      return { bytes: wav(), extension: 'wav' }
    },
  })
  const narration = path.join(root, 'narration'),
    output = path.join(root, 'video')
  await narrate(
    story,
    { provider: 'render-test', model: 'test' },
    {},
    narration,
    path.join(root, 'cache'),
  )
  await render(narration, output, { web: media, ios: media })
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json')))
  const phonePixels = await sharp(path.join(output, 'qa', 'ios.png'))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const pixel = (x, y) => [
    ...phonePixels.data.subarray(
      (y * phonePixels.info.width + x) * 3,
      (y * phonePixels.info.width + x) * 3 + 3,
    ),
  ]
  // All four capture corners reveal the pale background; the screen stays intact.
  for (const [x, y] of [
    [1280, 64],
    [1659, 64],
    [1280, 889],
    [1659, 889],
  ])
    assert.ok(
      pixel(x, y).every((v) => v > 150),
      `Unclipped phone corner at ${x},${y}`,
    )
  const center = pixel(1470, 450)
  assert.ok(center[0] < 35 && center[1] < 50 && center[2] < 70)
  assert.equal(manifest.fullDecodePassed, true)
  assert.equal(manifest.published, false)
  assert.equal(manifest.visualReviewPassed, false)
  assert.ok(fs.statSync(path.join(output, 'walkthrough-landscape.mp4')).size > 1000)
  assert.throws(() => sourcePath(media, '../elsewhere.png'), /escapes/)
  fs.symlinkSync(path.join(output, 'walkthrough-landscape.mp4'), path.join(media, 'escape.mp4'))
  assert.throws(() => sourcePath(media, 'escape.mp4'), /symlink escapes/)
  fs.writeFileSync(path.join(output, 'qa', 'notes.md'), 'Keep review notes')
  const shorter = { ...story, scenes: [story.scenes[0]] }
  await narrate(
    shorter,
    { provider: 'render-test', model: 'test' },
    {},
    narration,
    path.join(root, 'cache'),
  )
  await render(narration, output, { web: media })
  assert.equal(fs.existsSync(path.join(output, 'qa', 'ios.png')), false)
  assert.equal(fs.existsSync(path.join(output, 'qa', 'card.png')), false)
  assert.equal(fs.readFileSync(path.join(output, 'qa', 'notes.md'), 'utf8'), 'Keep review notes')
  await narrate(
    story,
    { provider: 'render-test', model: 'test' },
    {},
    narration,
    path.join(root, 'cache'),
  )
  const timeline = JSON.parse(fs.readFileSync(path.join(narration, 'timeline.json')))
  const cardRows = timeline.scenes[2].instructionCard
  timeline.scenes[2].instructionCard = ['One', 'Two', 'Three', 'Four']
  assert.throws(() => validateTimeline(timeline), /at most three rows/)
  timeline.scenes[2].instructionCard = cardRows
  timeline.scenes[2].instructionLabels = []
  assert.throws(() => validateTimeline(timeline), /Invalid instruction labels/)
  timeline.scenes[2].instructionLabels = ['Follow the citation']
  timeline.scenes[2].instructionStyle = 'unknown'
  assert.throws(() => validateTimeline(timeline), /Invalid instruction style/)
  timeline.scenes[2].instructionStyle = 'evidence'
  timeline.scenes[2].source = 'web.png'
  assert.throws(() => validateTimeline(timeline), /Invalid instruction card/)
  delete timeline.scenes[2].source
  timeline.scenes[2].instructionCard = ['x'.repeat(51)]
  assert.throws(() => validateTimeline(timeline), /Invalid instruction card/)
  timeline.scenes[2].instructionCard = ['Check the draft.']
  timeline.scenes[1].at += 1
  assert.throws(() => validateTimeline(timeline), /timing/)
})

test('captions preserve authored wording, flag recognition corrections, and bound line lengths', async () => {
  const { scriptWords, cuesFromWords, transcribeDeepgram } = await import('./captions.mjs')
  const text =
    'Open Messages to follow up with your client. Encounter-linked replies keep the conversation connected to the visit.'
  const recognized =
    'Open Messages to follow-up with your client. EncounterLink replies keep the conversation connected to the visit.'.split(
      ' ',
    )
  const words = recognized.map((word, i) => ({
    word,
    punctuated_word: word,
    start: i * 0.3,
    end: i * 0.3 + 0.28,
  }))
  const aligned = scriptWords(text, words, 10)
  assert.equal(aligned.corrections.length, 1)
  assert.ok(aligned.words.some((word) => word.text === 'Encounter-linked'))
  const cues = cuesFromWords(aligned.words, 5)
  assert.ok(
    cues.every(
      (cue) =>
        cue.start >= 5 &&
        cue.end > cue.start &&
        cue.text.split('\n').length <= 2 &&
        cue.text.split('\n').every((line) => line.length <= 42),
    ),
  )
  assert.equal(cues.map((c) => c.text.replaceAll('\n', ' ')).join(' '), text)
  assert.deepEqual(
    scriptWords(
      'iPhone follow-up.',
      [
        { word: 'i', start: 0, end: 0.1 },
        { word: 'Phone', start: 0.1, end: 0.4 },
        { word: 'follow', start: 0.5, end: 0.7 },
        { word: 'up.', start: 0.7, end: 0.9 },
      ],
      1,
    ).words,
    [
      { text: 'iPhone', start: 0, end: 0.4 },
      { text: 'follow-up.', start: 0.5, end: 0.9 },
    ],
  )
  assert.deepEqual(
    scriptWords(
      'address so replies',
      [
        { word: 'address', start: 0, end: 0.6 },
        { word: 'so', start: 0.45, end: 0.7 },
        { word: 'replies', start: 0.7, end: 1.1 },
      ],
      2,
    ).words.map((w) => w.start),
    [0, 0.6, 0.7],
  )
  // A short word reported entirely inside the previous word follows it instead.
  assert.deepEqual(
    scriptWords(
      'window and',
      [
        { word: 'window', start: 0, end: 0.56 },
        { word: 'and', start: 0.3, end: 0.53 },
      ],
      2,
    ).words.map((w) => [w.start, +w.end.toFixed(2)]),
    [
      [0, 0.56],
      [0.56, 0.61],
    ],
  )
  assert.throws(
    () =>
      scriptWords(
        'far apart',
        [
          { word: 'far', start: 0, end: 1.5 },
          { word: 'apart', start: 0.5, end: 1.8 },
        ],
        2,
      ),
    /Invalid caption word timing/,
  )
  assert.throws(() => scriptWords('Missing words.', words, 10), /alignment needs review/)
  assert.throws(
    () => scriptWords('Wrong.', [{ word: 'Different.', start: 0, end: 1 }], 2),
    /differs too much/,
  )
  assert.throws(
    () => scriptWords('Hello.', [{ word: 'Hello.', start: 1.01, end: 1.05 }], 1),
    /Invalid caption word timing/,
  )
  assert.throws(
    () => scriptWords('Hello.', [{ word: 'Hello.', start: 1, end: 1.05 }], 1),
    /Invalid caption word timing/,
  )
  assert.equal(
    scriptWords('Hello.', [{ word: 'Hello.', start: 0.8, end: 1.05 }], 1).words[0].end,
    1,
  )
  await assert.rejects(
    () =>
      transcribeDeepgram(
        Buffer.from('test'),
        { DEEPGRAM_API_KEY: 'secret' },
        async () => new Response('secret-echo', { status: 200 }),
      ),
    (error) => error.message === 'Caption timing provider returned invalid JSON',
  )
  await assert.rejects(
    transcribeDeepgram(
      Buffer.from('audio'),
      { DEEPGRAM_API_KEY: 'secret' },
      async () => new Response('secret', { status: 403 }),
    ),
    (error) => !error.message.includes('secret'),
  )
})

test('caption delivery rejects stale or overlapping captions and generates clean and burned exports', async (t) => {
  const { render } = await import('./render.mjs')
  const { captionVideo, validateCues } = await import('./caption-video.mjs')
  const { default: sharp } = await import('sharp')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'caption-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const media = path.join(root, 'media')
  fs.mkdirSync(media)
  await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#fff' } })
    .png()
    .toFile(path.join(media, 'web.png'))
  registerProvider('caption-test', {
    validate() {},
    async synthesize() {
      return { bytes: wav(), extension: 'wav' }
    },
  })
  const story = {
    version: 1,
    title: 'iOS <review> fixture',
    scenes: [
      {
        id: 'web',
        platform: 'web',
        headline: ['Web fixture'],
        narration: 'Hello.',
        source: 'web.png',
      },
    ],
  }
  const narration = path.join(root, 'narration'),
    video = path.join(root, 'video'),
    captionDir = path.join(root, 'captions'),
    delivery = path.join(root, 'delivery')
  await narrate(
    story,
    { provider: 'caption-test', model: 'test' },
    {},
    narration,
    path.join(root, 'cache'),
  )
  await render(narration, video, { web: media })
  const manifest = JSON.parse(fs.readFileSync(path.join(video, 'manifest.json')))
  const data = {
    duration: manifest.duration,
    scenes: manifest.scenes,
    cues: [{ start: 0, end: 0.3, text: 'Hello.' }],
    corrections: [],
  }
  assert.throws(() => validateCues({ ...data, scenes: [] }, manifest), /do not match/)
  assert.throws(
    () => validateCues({ ...data, cues: [...data.cues, ...data.cues] }, manifest),
    /overlapping/,
  )
  fs.mkdirSync(captionDir)
  fs.writeFileSync(path.join(captionDir, 'captions.json'), JSON.stringify(data))
  fs.writeFileSync(path.join(captionDir, 'walkthrough.srt'), 'stale srt')
  fs.writeFileSync(path.join(captionDir, 'walkthrough.vtt'), 'stale vtt')
  await captionVideo(video, captionDir, delivery)
  assert.ok(fs.statSync(path.join(delivery, 'walkthrough-captioned.mp4')).size > 1000)
  assert.equal(
    fs.readFileSync(path.join(delivery, 'walkthrough.srt'), 'utf8'),
    '1\n00:00:00,000 --> 00:00:00,300\nHello.\n',
  )
  assert.equal(
    fs.readFileSync(path.join(delivery, 'walkthrough.vtt'), 'utf8'),
    'WEBVTT\n\n00:00:00.000 --> 00:00:00.300\nHello.\n',
  )
  const html = fs.readFileSync(path.join(delivery, 'review.html'), 'utf8')
  assert.ok(html.includes('iOS &lt;review&gt; fixture'))
  assert.ok(!html.includes('Arcas narration'))
  assert.ok(!html.includes('Browser frame'))
  assert.deepEqual(
    fs.readFileSync(path.join(video, 'walkthrough-landscape.mp4')),
    fs.readFileSync(path.join(delivery, 'walkthrough-clean.mp4')),
  )
  assert.ok(
    fs.readFileSync(path.join(delivery, 'review.html'), 'utf8').includes("t.kind='captions'"),
  )
})

test('rejected caption timing can retry, and old invalid cache is evicted', async (t) => {
  const { captions } = await import('./captions.mjs')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'caption-cache-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const narration = path.join(root, 'narration'),
    output = path.join(root, 'captions')
  fs.mkdirSync(narration)
  fs.writeFileSync(path.join(narration, 'one.wav'), wav())
  fs.writeFileSync(
    path.join(narration, 'timeline.json'),
    JSON.stringify({
      version: 1,
      title: 'Cache',
      duration: 1.5,
      scenes: [
        {
          id: 'one',
          platform: 'web',
          headline: ['Test'],
          narration: 'Hello.',
          instructionCard: ['Test'],
          at: 0,
          duration: 1.5,
          speechSeconds: 1,
          audio: 'one.wav',
        },
      ],
    }),
  )
  let calls = 0
  const transcribe = async () => {
    calls++
    return [{ word: calls === 1 ? 'Wrong.' : 'Hello.', start: 0, end: 0.5 }]
  }
  await assert.rejects(captions(narration, output, {}, transcribe), /differs too much/)
  assert.deepEqual(fs.readdirSync(path.join(root, '.caption-cache')), [])
  await captions(narration, output, {}, transcribe)
  await captions(narration, output, {}, transcribe)
  assert.equal(calls, 2)
  const cached = path.join(
    root,
    '.caption-cache',
    fs.readdirSync(path.join(root, '.caption-cache'))[0],
  )
  fs.writeFileSync(cached, JSON.stringify([{ word: 'Wrong.', start: 0, end: 0.5 }]))
  await assert.rejects(captions(narration, output, {}, transcribe), /entry removed/)
  assert.equal(fs.existsSync(cached), false)
  await captions(narration, output, {}, transcribe)
  assert.equal(calls, 3)
})

test('media assembly verifies recordings and preserves previous output on a changed checksum', async (t) => {
  const { prepareMedia } = await import('./prepare-media.mjs')
  const { createHash } = await import('node:crypto')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-assembly-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const recordings = path.join(root, 'recordings'),
    screenshots = path.join(root, 'screenshots'),
    output = path.join(root, 'prepared')
  fs.mkdirSync(recordings)
  fs.mkdirSync(screenshots)
  fs.writeFileSync(path.join(recordings, 'start.mp4'), 'recorded bytes')
  fs.writeFileSync(path.join(screenshots, 'process.webp'), 'static bytes')
  const storyFile = path.join(root, 'story.json')
  fs.writeFileSync(
    storyFile,
    JSON.stringify({
      version: 1,
      title: 'Assembly',
      scenes: [
        { id: 'start', platform: 'web', narration: 'Start.', source: 'absent.webp' },
        { id: 'process', platform: 'web', narration: 'Wait.', source: 'process.webp' },
        { id: 'review', platform: 'web', narration: 'Review.', instructionCard: ['Review.'] },
      ],
    }),
  )
  fs.writeFileSync(
    path.join(recordings, 'capture-manifest.json'),
    JSON.stringify({
      coreCommit: 'fixture',
      shots: [
        {
          id: 'start',
          file: 'start.mp4',
          sha256: createHash('sha256').update('recorded bytes').digest('hex'),
        },
      ],
    }),
  )
  await prepareMedia(storyFile, recordings, output, screenshots)
  assert.equal(fs.readFileSync(path.join(output, 'media', 'start.mp4'), 'utf8'), 'recorded bytes')
  assert.equal(fs.readFileSync(path.join(output, 'media', 'process.webp'), 'utf8'), 'static bytes')
  const story = JSON.parse(fs.readFileSync(path.join(output, 'story.json')))
  assert.equal(story.scenes[0].source, 'start.mp4')
  assert.deepEqual(story.scenes[2].instructionCard, ['Review.'])
  await assert.rejects(
    prepareMedia(storyFile, recordings, output, screenshots, ['review']),
    /Missing instruction card/,
  )
  const manifestFile = path.join(recordings, 'capture-manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestFile))
  fs.writeFileSync(path.join(recordings, 'review.mp4'), 'review footage')
  manifest.shots.push({
    id: 'review',
    file: 'review.mp4',
    sha256: createHash('sha256').update('review footage').digest('hex'),
  })
  fs.writeFileSync(manifestFile, JSON.stringify(manifest))
  await prepareMedia(storyFile, recordings, output, screenshots, ['review'])
  const replaced = JSON.parse(fs.readFileSync(path.join(output, 'story.json')))
  assert.equal(replaced.scenes[2].source, 'review.mp4')
  assert.equal(replaced.scenes[2].instructionCard, undefined)
  // A later capture root supplies a newer take of the same shot.
  const retake = path.join(root, 'retake')
  fs.mkdirSync(retake)
  fs.writeFileSync(path.join(retake, 'start.mp4'), 'retake bytes')
  fs.writeFileSync(
    path.join(retake, 'capture-manifest.json'),
    JSON.stringify({
      coreCommit: 'retake',
      shots: [
        {
          id: 'start',
          file: 'start.mp4',
          sha256: createHash('sha256').update('retake bytes').digest('hex'),
        },
      ],
    }),
  )
  await prepareMedia(storyFile, [recordings, retake], output, screenshots, ['review'])
  assert.equal(fs.readFileSync(path.join(output, 'media', 'start.mp4'), 'utf8'), 'retake bytes')
  const combined = JSON.parse(fs.readFileSync(path.join(output, 'sources.json')))
  assert.equal(combined.find((source) => source.scene === 'start').coreCommit, 'retake')
  assert.equal(combined.find((source) => source.scene === 'review').coreCommit, 'fixture')
  fs.writeFileSync(path.join(recordings, 'start.mp4'), 'changed')
  await assert.rejects(prepareMedia(storyFile, recordings, output, screenshots), /checksum changed/)
  assert.equal(fs.readFileSync(path.join(output, 'media', 'start.mp4'), 'utf8'), 'retake bytes')
})

test('capture timing locates encoded ready frames instead of loading footage', async (t) => {
  const { locateReadyFrame } = await import('./video-timing.mjs')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-timing-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const video = path.join(root, 'clip.mp4'),
    reference = path.join(root, 'ready.png')
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'color=blue:s=160x90:d=1:r=30',
    '-f',
    'lavfi',
    '-i',
    'color=red:s=160x90:d=2:r=30',
    '-filter_complex',
    '[0:v][1:v]concat=n=2:v=1:a=0',
    '-c:v',
    'libx264',
    video,
  ])
  execFileSync('ffmpeg', ['-v', 'error', '-ss', '1.5', '-i', video, '-frames:v', '1', reference])
  const matched = await locateReadyFrame(video, reference)
  assert.ok(matched.sourceIn >= 0.9 && matched.sourceIn <= 1.2)
  assert.ok(matched.frameDifference < 1)
  // A loading skeleton can differ from the ready page by only a little text.
  // The screenshot moment bounds the search so it cannot match the skeleton.
  const similar = path.join(root, 'similar.mp4'),
    readyText = path.join(root, 'ready-text.png')
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'color=red:s=160x90:d=3:r=30',
    '-f',
    'lavfi',
    '-i',
    'color=red:s=160x90:d=3:r=30,drawbox=x=10:y=10:w=2:h=2:color=white:t=fill',
    '-filter_complex',
    '[0:v][1:v]concat=n=2:v=1:a=0',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv444p',
    similar,
  ])
  execFileSync('ffmpeg', ['-v', 'error', '-ss', '5', '-i', similar, '-frames:v', '1', readyText])
  const bounded = await locateReadyFrame(similar, readyText, { near: 5.5 })
  assert.ok(bounded.sourceIn >= 3 && bounded.sourceIn <= 5.5, `in-point ${bounded.sourceIn}`)
})

test('delivery catalog requires explicit review status and a named listener', async () => {
  const { validateCatalog } = await import('./delivery-index.mjs')
  const episode = {
    id: 'first-encounter-web',
    series: 1,
    title: 'Web',
    platform: 'web',
    story: 'tutorials/first-encounter-web.json',
    output: '.tutorial-output/first-encounter-recorded',
    post: 'social/linkedin/01-first-encounter.md',
    review: { framesChecked: true, listened: false },
  }
  validateCatalog({ version: 1, episodes: [episode] })
  assert.throws(
    () =>
      validateCatalog({ version: 1, episodes: [{ ...episode, review: { framesChecked: true } }] }),
    /explicitly/,
  )
  assert.throws(
    () =>
      validateCatalog({
        version: 1,
        episodes: [{ ...episode, review: { framesChecked: true, listened: true } }],
      }),
    /listenedBy/,
  )
  assert.throws(() => validateCatalog({ version: 1, episodes: [episode, episode] }), /unique/)
  const catalog = JSON.parse(
    fs.readFileSync(new URL('../../tutorials/episodes.json', import.meta.url)),
  )
  validateCatalog(catalog)
})
