import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
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
})

test('renderer handles web and iOS inputs and rejects timing and source escapes', async (t) => {
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
  assert.equal(manifest.fullDecodePassed, true)
  assert.equal(manifest.published, false)
  assert.equal(manifest.visualReviewPassed, false)
  assert.ok(fs.statSync(path.join(output, 'walkthrough-landscape.mp4')).size > 1000)
  assert.throws(() => sourcePath(media, '../elsewhere.png'), /escapes/)
  fs.symlinkSync(path.join(output, 'walkthrough-landscape.mp4'), path.join(media, 'escape.mp4'))
  assert.throws(() => sourcePath(media, 'escape.mp4'), /symlink escapes/)
  const timeline = JSON.parse(fs.readFileSync(path.join(narration, 'timeline.json')))
  timeline.scenes[1].at += 1
  assert.throws(() => validateTimeline(timeline), /timing/)
})
