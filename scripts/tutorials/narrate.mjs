import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { getProvider } from './providers/index.mjs'
import { withStagedOutput } from './staged-output.mjs'

export function speechConfig(env) {
  const provider = env.TUTORIAL_TTS_PROVIDER || 'deepgram'
  const model = env.TUTORIAL_TTS_MODEL || (provider === 'deepgram' ? 'aura-2-arcas-en' : '')
  if (!model) throw Error('Set TUTORIAL_TTS_MODEL')
  return {
    provider,
    model,
    voice: env.TUTORIAL_TTS_VOICE || '',
    instructions: env.TUTORIAL_TTS_INSTRUCTIONS || '',
  }
}
export function validateStory(story) {
  if (story.version !== 1 || !story.title || !Array.isArray(story.scenes) || !story.scenes.length)
    throw Error('Expected a version 1 story with title and scenes')
  // Optional series framing shown beside every scene: `kicker` follows the
  // step/platform label and `tagline` sits under the headline.
  if (story.kicker !== undefined && !/^[A-Z0-9 &·-]{1,24}$/.test(story.kicker))
    throw Error('Kicker must be 1–24 uppercase characters')
  if (
    story.tagline !== undefined &&
    (typeof story.tagline !== 'string' || !story.tagline.trim() || story.tagline.length > 60)
  )
    throw Error('Tagline must contain 1–60 characters')
  const ids = new Set()
  for (const scene of story.scenes) {
    if (!/^[a-z0-9-]+$/.test(scene.id) || ids.has(scene.id))
      throw Error('Scene IDs must be unique lowercase slugs')
    ids.add(scene.id)
    if (
      typeof scene.narration !== 'string' ||
      !scene.narration.trim() ||
      scene.narration.length > 1800
    )
      throw Error(`Scene ${scene.id}: narration must contain 1–1800 characters`)
    if (!['ios', 'web'].includes(scene.platform))
      throw Error(`Scene ${scene.id}: platform must be ios or web`)
  }
}
export const fingerprint = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function timestamp(seconds) {
  const ms = Math.round(seconds * 1000)
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`
}
export function duration(file) {
  const seconds = Number(
    execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
      { encoding: 'utf8' },
    ).trim(),
  )
  if (!Number.isFinite(seconds) || seconds <= 0) throw Error('Invalid audio duration')
  execFileSync('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-'], {
    stdio: 'pipe',
  })
  return seconds
}
export async function narrate(story, config, env, output, cache) {
  validateStory(story)
  const adapter = getProvider(config.provider)
  adapter.validate(config, env)
  fs.mkdirSync(cache, { recursive: true })
  await withStagedOutput(output, async (stage) => {
    const previous = path.join(stage, 'timeline.json')
    if (fs.existsSync(previous)) {
      for (const scene of JSON.parse(fs.readFileSync(previous)).scenes || []) {
        if (/^[a-z0-9-]+\.wav$/.test(scene.audio))
          fs.rmSync(path.join(stage, scene.audio), { force: true })
      }
    }
    let at = 0
    const scenes = []
    for (const scene of story.scenes) {
      const key = fingerprint({ version: 1, config, text: scene.narration })
      const cached = path.join(cache, `${key}.wav`)
      if (!fs.existsSync(cached)) {
        const result = await adapter.synthesize({ text: scene.narration, config, env })
        if (!['wav', 'mp3', 'flac', 'ogg'].includes(result.extension))
          throw Error('Unsupported adapter audio format')
        const temp = `${cached}.${process.pid}.tmp.wav`
        const raw = `${temp}.${result.extension}`
        try {
          fs.writeFileSync(raw, result.bytes)
          execFileSync(
            'ffmpeg',
            [
              '-v',
              'error',
              '-xerror',
              '-y',
              '-i',
              raw,
              '-vn',
              '-c:a',
              'pcm_s16le',
              '-ar',
              '48000',
              '-ac',
              '1',
              temp,
            ],
            { stdio: 'pipe' },
          )
          duration(temp)
          fs.renameSync(temp, cached)
        } finally {
          fs.rmSync(temp, { force: true })
          fs.rmSync(raw, { force: true })
        }
      }
      const speechSeconds = duration(cached)
      // Quantize to 30 fps, retaining a short pause after each scene.
      const seconds = Math.ceil((speechSeconds + 0.45) * 30) / 30
      const audio = `${scene.id}.wav`
      fs.copyFileSync(cached, path.join(stage, audio))
      scenes.push({ ...scene, audio, at, speechSeconds, duration: seconds, cacheKey: key })
      at += seconds
    }
    fs.writeFileSync(
      path.join(stage, 'timeline.json'),
      JSON.stringify({ ...story, speech: config, duration: at, scenes }, null, 2) + '\n',
    )
    // Scene-level cues are deliberately not advertised as word-aligned captions.
    fs.writeFileSync(
      path.join(stage, 'narration.srt'),
      scenes
        .map(
          (s, i) =>
            `${i + 1}\n${timestamp(s.at)} --> ${timestamp(s.at + s.speechSeconds)}\n${s.narration}\n`,
        )
        .join('\n'),
    )
  })
}
async function main() {
  const [storyFile, output, envFile] = process.argv.slice(2)
  if (!storyFile || !output || !envFile)
    throw Error('Usage: node scripts/tutorials/narrate.mjs STORY OUTPUT ENV_FILE')
  process.loadEnvFile(path.resolve(envFile))
  const story = JSON.parse(fs.readFileSync(storyFile, 'utf8'))
  await narrate(
    story,
    speechConfig(process.env),
    process.env,
    path.resolve(output),
    path.resolve(path.dirname(output), '.speech-cache'),
  )
  console.log(`Narration ready: ${path.resolve(output)}`)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
