import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { withStagedOutput } from './staged-output.mjs'
import { validateStory } from './narrate.mjs'

const run = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'pipe' })
const probe = (file) =>
  JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], {
      encoding: 'utf8',
    }),
  )
const escape = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
export function sourcePath(root, relative) {
  if (!relative || path.isAbsolute(relative))
    throw Error('Media paths must be relative to their configured root')
  const resolved = path.resolve(root, relative)
  if (!resolved.startsWith(path.resolve(root) + path.sep))
    throw Error('Media path escapes source root')
  const real = fs.realpathSync(resolved)
  if (!real.startsWith(fs.realpathSync(root) + path.sep))
    throw Error('Media symlink escapes source root')
  return real
}
export function validateTimeline(story) {
  validateStory(story)
  let at = 0
  for (const scene of story.scenes) {
    if (
      !Number.isFinite(scene.duration) ||
      scene.duration <= 0 ||
      !Number.isFinite(scene.at) ||
      Math.abs(scene.at - at) > 0.001 ||
      !Number.isFinite(scene.speechSeconds) ||
      scene.speechSeconds <= 0 ||
      scene.speechSeconds > scene.duration
    )
      throw Error(`Invalid timing: ${scene.id}`)
    if (
      !Array.isArray(scene.headline) ||
      !scene.headline.length ||
      scene.headline.length > 3 ||
      scene.headline.some((line) => typeof line !== 'string' || line.length > 36)
    )
      throw Error(`Headline needs 1–3 short lines: ${scene.id}`)
    if (!scene.source || !scene.audio) throw Error(`Missing media: ${scene.id}`)
    at += scene.duration
  }
  if (!Number.isFinite(story.duration) || Math.abs(story.duration - at) > 0.001)
    throw Error('Timeline total does not match scenes')
}
export async function render(timelineDir, output, roots) {
  const story = JSON.parse(fs.readFileSync(path.join(timelineDir, 'timeline.json')))
  validateTimeline(story)
  const inputs = story.scenes.map((scene) => {
    const root = roots[scene.platform]
    if (!root) throw Error(`Missing ${scene.platform} media root`)
    const source = sourcePath(root, scene.source)
    const audio = sourcePath(timelineDir, scene.audio)
    const motion = /\.(mp4|mov)$/i.test(source)
    if (!motion && !/\.(png|webp|jpg|jpeg)$/i.test(source)) throw Error('Unsupported visual format')
    const start = scene.start ?? 0
    if (!Number.isFinite(start) || start < 0) throw Error('Invalid source start')
    if (motion && Number(probe(source).format.duration) < start + scene.duration)
      throw Error(
        `Footage too short for narration: ${scene.id}. Supply a longer take or use an explicit still.`,
      )
    const measuredAudio = Number(probe(audio).format.duration)
    if (!Number.isFinite(measuredAudio) || Math.abs(measuredAudio - scene.speechSeconds) > 0.1)
      throw Error(`Audio changed since narration: ${scene.id}`)
    return { scene, source, audio, motion, start }
  })
  await withStagedOutput(output, async (stage) => {
    const work = path.join(stage, 'work'),
      qa = path.join(stage, 'qa')
    fs.mkdirSync(work, { recursive: true })
    fs.mkdirSync(qa, { recursive: true })
    const segments = []
    for (const [index, { scene, source, audio, motion, start }] of inputs.entries()) {
      const phone = scene.platform === 'ios'
      const box = phone ? { x: 1260, y: 64, w: 420, h: 912 } : { x: 610, y: 156, w: 1248, h: 702 }
      const left = 76,
        fontSize = phone ? 60 : 40
      const headline = scene.headline
        .map(
          (line, i) =>
            `<text x="${left}" y="${370 + i * (fontSize + 14)}" font-size="${fontSize}" font-weight="700">${escape(line)}</text>`,
        )
        .join('')
      const bars = story.scenes
        .map(
          (_, i) =>
            `<rect x="${left + i * 55}" y="955" width="42" height="4" rx="2" fill="${i <= index ? '#11736F' : '#D2E2DC'}"/>`,
        )
        .join('')
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="#F3F8F2"/><ellipse cx="1680" cy="650" rx="690" ry="880" fill="#CDE7DF"/><g font-family="Arial" fill="#132D2B"><text x="76" y="116" font-size="48" font-weight="700">noctune</text><text x="76" y="262" font-size="19" fill="#53716A">${String(index + 1).padStart(2, '0')} / ${phone ? 'iOS' : 'WEB'} WALKTHROUGH</text>${headline}<text x="76" y="900" font-size="20" fill="#4D6963">Your first encounter, step by step.</text>${bars}<rect x="${box.x - 8}" y="${box.y - 8}" width="${box.w + 16}" height="${box.h + 16}" rx="${phone ? 42 : 16}" fill="#153D38"/><text x="960" y="1032" text-anchor="middle" font-size="19" fill="#4D6963">Fictional demo data · AI narration · ${motion ? 'Recorded app footage' : 'Static app capture'}${scene.disclosure ? ' · ' + escape(scene.disclosure) : ''}</text></g></svg>`
      const card = path.join(work, `${index}-card.png`)
      await sharp(Buffer.from(svg)).png().toFile(card)
      const segment = path.join(work, `${index}.mp4`)
      const visual = motion
        ? ['-ss', String(start), '-i', source]
        : ['-loop', '1', '-framerate', '30', '-i', source]
      run([
        '-loop',
        '1',
        '-framerate',
        '30',
        '-i',
        card,
        ...visual,
        '-i',
        audio,
        '-filter_complex',
        `[1:v]setpts=PTS-STARTPTS,scale=${box.w}:${box.h}:force_original_aspect_ratio=decrease,pad=${box.w}:${box.h}:(ow-iw)/2:(oh-ih)/2:color=0xF3F8F2,setsar=1[screen];[0:v][screen]overlay=${box.x}:${box.y}:shortest=1,format=yuv420p[v];[2:a]apad,aresample=48000[a]`,
        '-map',
        '[v]',
        '-map',
        '[a]',
        '-t',
        String(scene.duration),
        '-r',
        '30',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ac',
        '2',
        '-ar',
        '48000',
        '-movflags',
        '+faststart',
        segment,
      ])
      run([
        '-ss',
        String(Math.min(1, scene.duration / 2)),
        '-i',
        segment,
        '-frames:v',
        '1',
        path.join(qa, `${scene.id}.png`),
      ])
      segments.push(segment)
    }
    const list = path.join(work, 'concat.txt')
    fs.writeFileSync(
      list,
      segments.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join('\n'),
    )
    const video = path.join(stage, 'walkthrough-landscape.mp4')
    run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', video])
    run(['-xerror', '-i', video, '-f', 'null', '-'])
    const metadata = probe(video),
      v = metadata.streams.find((s) => s.codec_type === 'video'),
      a = metadata.streams.find((s) => s.codec_type === 'audio')
    if (
      v?.width !== 1920 ||
      v?.height !== 1080 ||
      v?.codec_name !== 'h264' ||
      a?.codec_name !== 'aac' ||
      Math.abs(Number(metadata.format.duration) - story.duration) > 0.25
    )
      throw Error('Video failed delivery checks')
    fs.copyFileSync(path.join(timelineDir, 'narration.srt'), path.join(stage, 'walkthrough.srt'))
    fs.writeFileSync(
      path.join(stage, 'manifest.json'),
      JSON.stringify(
        {
          title: story.title,
          duration: Number(metadata.format.duration),
          width: 1920,
          height: 1080,
          speech: story.speech,
          fullDecodePassed: true,
          visualReviewPassed: false,
          published: false,
        },
        null,
        2,
      ) + '\n',
    )
    const tiles = await Promise.all(
      story.scenes.map(async (s, i) => ({
        input: await sharp(path.join(qa, `${s.id}.png`))
          .resize(640, 360)
          .toBuffer(),
        left: (i % 2) * 640,
        top: Math.floor(i / 2) * 360,
      })),
    )
    await sharp({
      create: {
        width: 1280,
        height: Math.ceil(tiles.length / 2) * 360,
        channels: 3,
        background: '#F3F8F2',
      },
    })
      .composite(tiles)
      .png()
      .toFile(path.join(qa, 'contact-sheet.png'))
    fs.rmSync(work, { recursive: true, force: true })
  })
}
async function main() {
  const [timelineDir, output, webRoot, iosRoot] = process.argv.slice(2)
  if (!timelineDir || !output || !webRoot)
    throw Error(
      'Usage: node scripts/tutorials/render.mjs NARRATION OUTPUT WEB_MEDIA_ROOT [IOS_MEDIA_ROOT]',
    )
  await render(path.resolve(timelineDir), path.resolve(output), {
    web: path.resolve(webRoot),
    ...(iosRoot ? { ios: path.resolve(iosRoot) } : {}),
  })
  console.log(`Video ready: ${path.resolve(output)}`)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
