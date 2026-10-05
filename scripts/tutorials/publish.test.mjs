import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { isApproved, location, publish } from './publish.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const episode = (id, review) => ({
  id,
  series: 1,
  title: `Episode ${id}`,
  platform: 'web',
  story: `tutorials/${id}.json`,
  output: `.tutorial-output/${id}`,
  post: 'social/linkedin/01.md',
  review,
})
const approved = { framesChecked: true, listened: true, listenedBy: 'Reviewer' }
const pending = { framesChecked: true, listened: false }

function fixture(ids) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-publish-'))
  for (const id of ids) {
    fs.mkdirSync(path.join(root, id))
    fs.writeFileSync(path.join(root, id, 'walkthrough-clean.mp4'), `video-${id}`)
    fs.writeFileSync(
      path.join(root, id, 'walkthrough.vtt'),
      'WEBVTT\n\n00:00.000 --> 00:01.000\nHi\n',
    )
    fs.writeFileSync(
      path.join(root, id, 'manifest.json'),
      JSON.stringify({ duration: 47.65, width: 1920, height: 1080, fullDecodePassed: true }),
    )
  }
  return root
}

// In-memory S3 + CDN keyed by object key.
function fakeStore() {
  const objects = new Map()
  const calls = []
  const runAws = (args) => {
    calls.push(args[1])
    const key = args[args.indexOf('--key') + 1]
    if (args[1] === 'list-objects-v2') {
      const prefix = args[args.indexOf('--prefix') + 1]
      return { Contents: objects.has(prefix) ? [{ Key: prefix }] : [] }
    }
    if (args[1] === 'put-object') {
      const body = fs.readFileSync(args[args.indexOf('--body') + 1])
      objects.set(key, { body, type: args[args.indexOf('--content-type') + 1] })
      return {}
    }
    const object = objects.get(key)
    return {
      ContentLength: object.body.length,
      ChecksumSHA256: createHash('sha256').update(object.body).digest('base64'),
      ContentType: object.type,
      CacheControl: 'public, max-age=31536000, immutable',
    }
  }
  const fetcher = async (url) => {
    const object = objects.get(new URL(url).pathname.slice(1))
    return new Response(object.body, { headers: { 'content-type': object.type } })
  }
  return { objects, calls, runAws, fetcher }
}

const base = (delivery, store, captionsDir) => ({
  delivery,
  captionsDir,
  bucket: 'prod-noctune-6325-docs-media',
  origin: 'https://docs-media.noctune.ai',
  runAws: store.runAws,
  fetcher: store.fetcher,
  poster: (file) => Buffer.from(`poster-${path.basename(path.dirname(file))}`),
  log: () => {},
})

test('only episodes with a named full listen and frame check are approved', () => {
  assert.equal(isApproved(episode('a', approved)), true)
  assert.equal(isApproved(episode('a', pending)), false)
  assert.equal(
    isApproved(episode('a', { framesChecked: false, listened: true, listenedBy: 'R' })),
    false,
  )
})

test('object keys are content-addressed under the CDN-readable assets prefix', () => {
  const hash = sha('x')
  assert.deepEqual(location(hash, 'sentinel-web.mp4', 'https://docs-media.noctune.ai'), {
    key: `assets/${hash}/sentinel-web.mp4`,
    url: `https://docs-media.noctune.ai/assets/${hash}/sentinel-web.mp4`,
  })
  assert.throws(() => location(hash, '../x.mp4', 'https://docs-media.noctune.ai'), /Invalid/)
  assert.throws(() => location(hash, 'x.mp4', 'http://docs-media.noctune.ai'), /HTTPS/)
})

test('write uploads approved clean videos and posters, skips pending ones, and is idempotent', async () => {
  const delivery = fixture(['done', 'later'])
  const captionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-captions-'))
  const store = fakeStore()
  const catalog = { version: 1, episodes: [episode('done', approved), episode('later', pending)] }
  const first = await publish({ ...base(delivery, store, captionsDir), catalog, write: true })
  assert.deepEqual(Object.keys(first.videos), ['done'])
  assert.equal(first.videos.done.sha256, sha('video-done'))
  assert.equal(first.videos.done.captions, '/tutorials/done.vtt')
  assert.equal(first.videos.done.listenedBy, 'Reviewer')
  assert.ok(fs.readFileSync(path.join(captionsDir, 'done.vtt'), 'utf8').startsWith('WEBVTT'))
  assert.equal(store.objects.size, 2)
  assert.equal(store.calls.filter((call) => call === 'put-object').length, 2)

  const second = await publish({
    ...base(delivery, store, captionsDir),
    catalog,
    previous: first,
    write: true,
  })
  assert.deepEqual(second, first)
  assert.equal(store.calls.filter((call) => call === 'put-object').length, 2)
})

test('dry run makes no AWS calls and keeps the previous receipt', async () => {
  const delivery = fixture(['done'])
  const store = fakeStore()
  const previous = { version: 1, videos: { old: { title: 'Old' } } }
  const result = await publish({
    ...base(delivery, store, os.tmpdir()),
    catalog: { version: 1, episodes: [episode('done', approved)] },
    previous,
  })
  assert.deepEqual(result, previous)
  assert.equal(store.calls.length, 0)
})

test('a CDN byte mismatch fails the publish', async () => {
  const delivery = fixture(['done'])
  const store = fakeStore()
  await assert.rejects(
    publish({
      ...base(delivery, store, os.tmpdir()),
      fetcher: async () => new Response('tampered', { headers: { 'content-type': 'video/mp4' } }),
      catalog: { version: 1, episodes: [episode('done', approved)] },
      write: true,
    }),
    /checksum mismatch/,
  )
})
