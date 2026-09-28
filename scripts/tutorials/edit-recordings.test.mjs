import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { editRecordings } from './edit-recordings.mjs'

test('editor preserves cut order and final hold across frame rates, rejects changed or rejected sources', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorial-edit-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const clips = []
  for (const [color, fps] of [
    ['red', 15],
    ['blue', 24],
  ]) {
    const file = `${color}.mp4`,
      full = path.join(root, file)
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      `color=${color}:s=160x90:d=1:r=${fps}`,
      '-c:v',
      'libx264',
      full,
    ])
    clips.push({
      file,
      usable: true,
      sha256: createHash('sha256').update(fs.readFileSync(full)).digest('hex'),
    })
  }
  const manifest = path.join(root, 'manifest.json')
  const saveManifest = () => fs.writeFileSync(manifest, JSON.stringify({ clips }))
  saveManifest()
  const output = path.join(root, 'edited')
  const recipe = {
    version: 1,
    scenes: [
      {
        id: 'sequence',
        duration: 1.75,
        cuts: [
          { source: 'red.mp4', start: 0.2, duration: 0.5, hold: 0.25 },
          { source: 'blue.mp4', start: 0.1, duration: 0.5 },
        ],
      },
    ],
  }
  await editRecordings(root, recipe, output)
  const video = path.join(output, 'sequence.mp4')
  const pixel = (at) =>
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-ss',
      String(at),
      '-i',
      video,
      '-frames:v',
      '1',
      '-vf',
      'scale=1:1',
      '-pix_fmt',
      'rgb24',
      '-f',
      'rawvideo',
      '-',
    ])
  assert.ok(pixel(0.2)[0] > 200)
  assert.ok(pixel(0.65)[0] > 200)
  assert.ok(pixel(0.9)[2] > 200)
  assert.ok(pixel(1.4)[2] > 200)
  const metadata = JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', video]),
  )
  assert.equal(metadata.streams[0].r_frame_rate, '30/1')
  const delivered = fs.readFileSync(video)
  recipe.scenes[0].cuts[0].start = 0.9
  await assert.rejects(editRecordings(root, recipe, output), /exceeds source/)
  recipe.scenes[0].cuts[0].start = 0.2
  recipe.scenes[0].cuts[0].hold = -1
  await assert.rejects(editRecordings(root, recipe, output), /Invalid reading hold/)
  recipe.scenes[0].cuts[0].hold = 0.25
  clips[0].usable = false
  saveManifest()
  await assert.rejects(editRecordings(root, recipe, output), /Unapproved source/)
  clips[0].usable = true
  clips[0].sha256 = 'changed'
  saveManifest()
  await assert.rejects(editRecordings(root, recipe, output), /checksum changed/)
  assert.deepEqual(fs.readFileSync(video), delivered)
})
