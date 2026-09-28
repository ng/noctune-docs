import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'
import { writeSubtitles } from './subtitles.mjs'
import { sourcePath, validateTimeline } from './render.mjs'
import { withStagedOutput } from './staged-output.mjs'

export async function transcribeDeepgram(bytes, env, fetchImpl = fetch) {
  if (!env.DEEPGRAM_API_KEY?.trim()) throw Error('Set DEEPGRAM_API_KEY for caption timing')
  let response
  try {
    response = await fetchImpl(
      'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&keyterm=noctune',
      {
        method: 'POST',
        headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, 'Content-Type': 'audio/wav' },
        body: bytes,
        signal: AbortSignal.timeout(120000),
      },
    )
  } catch {
    throw Error('Caption timing request failed or timed out')
  }
  if (!response.ok) throw Error(`Caption timing provider returned HTTP ${response.status}`)
  let data
  try {
    data = await response.json()
  } catch {
    throw Error('Caption timing provider returned invalid JSON')
  }
  const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words
  if (!Array.isArray(words) || !words.length)
    throw Error('Caption timing provider returned no words')
  return words
}
const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/^nocturne$/, 'noctune')
const tokens = (text) =>
  text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ')
    .split(/\s+/)
    .filter(Boolean)
// Keep authored text. Require one-to-one word timing and report recognition corrections.
export function scriptWords(text, words, speechSeconds) {
  const script = tokens(text)
  const expanded = words.flatMap((word) => {
    const parts = tokens(word.punctuated_word || word.word)
    return parts.map((part, i) => ({
      word: part,
      start: word.start + ((word.end - word.start) * i) / parts.length,
      end: word.start + ((word.end - word.start) * (i + 1)) / parts.length,
    }))
  })
  if (script.length !== expanded.length)
    throw Error(
      `Caption alignment needs review: script has ${script.length} words, transcription has ${expanded.length}`,
    )
  const corrections = []
  let previousEnd = 0
  const aligned = script.map((word, i) => {
    const timed = expanded[i]
    if (normalize(word) !== normalize(timed.word))
      corrections.push({ index: i, script: word, recognized: timed.word })
    if (
      !Number.isFinite(timed.start) ||
      !Number.isFinite(timed.end) ||
      timed.start < 0 ||
      timed.start >= speechSeconds ||
      timed.start < previousEnd - 0.01 ||
      timed.end <= timed.start ||
      timed.end > speechSeconds + 0.1
    )
      throw Error('Invalid caption word timing')
    previousEnd = timed.end
    return { text: word, start: timed.start, end: Math.min(timed.end, speechSeconds) }
  })
  if (corrections.length / script.length > 0.1)
    throw Error('Caption transcription differs too much from script; alignment needs review')
  // Normalization may split iPhone or a hyphenated word for timing alignment.
  // Rejoin those pieces so captions retain the exact authored spelling.
  let position = 0
  const authored = text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const count = tokens(word).length
      if (!count) throw Error('Caption token has no spoken word')
      const first = aligned[position]
      position += count
      return { text: word, start: first.start, end: aligned[position - 1].end }
    })
  return { words: authored, corrections }
}
export function cuesFromWords(words, offset = 0) {
  const cues = []
  function emit(group) {
    if (!group.length) return
    const text = group.map((w) => w.text).join(' ')
    let lines = text.length <= 42 ? [text] : null
    let best = Infinity
    for (let i = 1; text.length > 42 && i < group.length; i++) {
      const left = group
        .slice(0, i)
        .map((w) => w.text)
        .join(' ')
      const right = group
        .slice(i)
        .map((w) => w.text)
        .join(' ')
      const cost = Math.abs(left.length - right.length)
      if (left.length <= 42 && right.length <= 42 && cost < best) {
        lines = [left, right]
        best = cost
      }
    }
    if ((!lines || group.at(-1).end - group[0].start > 4.5) && group.length > 1) {
      const middle = Math.ceil(group.length / 2)
      emit(group.slice(0, middle))
      emit(group.slice(middle))
      return
    }
    if (!lines) throw Error('Caption word exceeds line width')
    cues.push({
      start: offset + group[0].start,
      end: offset + group.at(-1).end,
      text: lines.join('\n'),
    })
  }
  let sentence = []
  for (const word of words) {
    if (word.text.length > 42) throw Error('Caption word exceeds line width')
    if (sentence.length && word.start - sentence.at(-1).end > 0.45) {
      emit(sentence)
      sentence = []
    }
    sentence.push(word)
    if (/[.!?]$/.test(word.text)) {
      emit(sentence)
      sentence = []
    }
  }
  emit(sentence)
  return cues.map((cue, i) => ({
    ...cue,
    end: Math.min(Math.max(cue.end + 0.15, cue.start + 0.75), cues[i + 1]?.start ?? Infinity),
  }))
}
export async function captions(timelineDir, output, env, transcribe = transcribeDeepgram) {
  const story = JSON.parse(fs.readFileSync(path.join(timelineDir, 'timeline.json')))
  validateTimeline(story)
  const cache = path.resolve(path.dirname(output), '.caption-cache')
  fs.mkdirSync(cache, { recursive: true })
  const cues = [],
    scenes = [],
    corrections = []
  for (const scene of story.scenes) {
    const bytes = fs.readFileSync(sourcePath(timelineDir, scene.audio))
    const key = createHash('sha256').update('deepgram-nova3-noctune-v1').update(bytes).digest('hex')
    const cached = path.join(cache, `${key}.json`)
    const fromCache = fs.existsSync(cached)
    let aligned, sceneCues, words
    try {
      words = fromCache ? JSON.parse(fs.readFileSync(cached)) : await transcribe(bytes, env)
      aligned = scriptWords(scene.narration, words, scene.speechSeconds)
      sceneCues = cuesFromWords(aligned.words, scene.at).map((cue) => ({
        ...cue,
        end: Math.min(cue.end, scene.at + scene.duration),
      }))
    } catch (error) {
      if (fromCache) {
        fs.rmSync(cached, { force: true })
        throw Error(
          `${scene.id}: cached caption timing rejected; entry removed. Rerun caption timing.`,
        )
      }
      throw Error(`${scene.id}: ${error.message}`)
    }
    // Rejected results must not make the next attempt reuse the same failure.
    if (!fromCache) {
      const temporary = `${cached}.${randomUUID()}.tmp`
      try {
        fs.writeFileSync(temporary, JSON.stringify(words))
        fs.renameSync(temporary, cached)
      } finally {
        fs.rmSync(temporary, { force: true })
      }
    }
    cues.push(...sceneCues)
    corrections.push(...aligned.corrections.map((c) => ({ scene: scene.id, ...c })))
    scenes.push({
      id: scene.id,
      audioSha256: createHash('sha256').update(bytes).digest('hex'),
      narration: scene.narration,
      at: scene.at,
      duration: scene.duration,
    })
  }
  await withStagedOutput(path.resolve(output), async (stage) => {
    fs.writeFileSync(
      path.join(stage, 'captions.json'),
      JSON.stringify(
        {
          version: 1,
          duration: story.duration,
          scenes,
          cues,
          corrections,
          listeningReviewPassed: false,
        },
        null,
        2,
      ) + '\n',
    )
    writeSubtitles(stage, cues)
  })
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [timelineDir, output, envFile] = process.argv.slice(2)
  try {
    if (!timelineDir || !output || !envFile)
      throw Error('Usage: captions.mjs NARRATION OUTPUT ENV_FILE')
    process.loadEnvFile(path.resolve(envFile))
    await captions(path.resolve(timelineDir), output, process.env)
    console.log(`Timed captions ready: ${path.resolve(output)}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
