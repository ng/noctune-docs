import fs from 'node:fs'
import { createHash } from 'node:crypto'
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
    if (scene.instructionCard !== undefined) {
      if (
        scene.source ||
        !Array.isArray(scene.instructionCard) ||
        !scene.instructionCard.length ||
        scene.instructionCard.length > 4 ||
        scene.instructionCard.some(
          (line) => typeof line !== 'string' || !line.trim() || line.length > 50,
        )
      )
        throw Error(`Invalid instruction card: ${scene.id}`)
      if (
        scene.instructionStyle !== undefined &&
        !['checklist', 'sequence', 'evidence'].includes(scene.instructionStyle)
      )
        throw Error(`Invalid instruction style: ${scene.id}`)
      if (scene.instructionStyle === 'evidence' && scene.instructionCard.length > 3)
        throw Error(`Evidence card supports at most three rows: ${scene.id}`)
      if (
        scene.instructionTitle !== undefined &&
        (typeof scene.instructionTitle !== 'string' || scene.instructionTitle.length > 40)
      )
        throw Error(`Invalid instruction title: ${scene.id}`)
      if (
        scene.instructionLabels !== undefined &&
        (!Array.isArray(scene.instructionLabels) ||
          scene.instructionLabels.length !== scene.instructionCard.length ||
          scene.instructionLabels.some((label) => typeof label !== 'string' || label.length > 30))
      )
        throw Error(`Invalid instruction labels: ${scene.id}`)
    } else if (!scene.source) throw Error(`Missing media: ${scene.id}`)
    if (!scene.audio) throw Error(`Missing audio: ${scene.id}`)
    at += scene.duration
  }
  if (!Number.isFinite(story.duration) || Math.abs(story.duration - at) > 0.001)
    throw Error('Timeline total does not match scenes')
}
export async function render(timelineDir, output, roots) {
  const story = JSON.parse(fs.readFileSync(path.join(timelineDir, 'timeline.json')))
  validateTimeline(story)
  // Use the existing horizontal owl + wordmark asset; tint only this render copy.
  const logo = (
    await sharp(fileURLToPath(new URL('../../public/noctune-logo-horizontal.png', import.meta.url)))
      .linear([0, 0, 0], [19, 45, 43])
      .png()
      .toBuffer()
  ).toString('base64')
  const inputs = story.scenes.map((scene) => {
    const root = roots[scene.platform]
    if (!root) throw Error(`Missing ${scene.platform} media root`)
    const source = scene.instructionCard ? null : sourcePath(root, scene.source)
    const audio = sourcePath(timelineDir, scene.audio)
    const motion = /\.(mp4|mov)$/i.test(source)
    if (source && !motion && !/\.(png|webp|jpg|jpeg)$/i.test(source))
      throw Error('Unsupported visual format')
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
      const box = phone ? { x: 1280, y: 64, w: 380, h: 826 } : { x: 610, y: 156, w: 1248, h: 702 }
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
            `<rect x="${left + i * 55}" y="860" width="42" height="4" rx="2" fill="${i <= index ? '#11736F' : '#D2E2DC'}"/>`,
        )
        .join('')
      const frame = scene.instructionCard
        ? ''
        : phone
          ? `<rect x="${box.x - 8}" y="${box.y - 8}" width="${box.w + 16}" height="${box.h + 16}" rx="42" fill="#153D38"/>`
          : `<defs><filter id="browser-shadow" x="-15%" y="-15%" width="130%" height="145%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#153D38" flood-opacity="0.14"/></filter></defs>
          <rect x="${box.x - 2}" y="${box.y - 54}" width="${box.w + 4}" height="${box.h + 56}" rx="16" fill="#EEF2F1" stroke="#CDD9D5" stroke-width="2" filter="url(#browser-shadow)"/>
          <path d="M${box.x + 27} ${box.y - 36}l-8 8 8 8m20-16 8 8-8 8" fill="none" stroke="#788983" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="${box.x + 240}" y="${box.y - 44}" width="${box.w - 480}" height="33" rx="8" fill="#FFFFFF" stroke="#D8E2DE"/>
          <text x="${box.x + box.w / 2}" y="${box.y - 21}" text-anchor="middle" font-size="18" fill="#52655D">app.noctune.ai</text>
          <path d="M${box.x} ${box.y - 1}h${box.w}" stroke="#D5DFDB"/>`
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="#F3F8F2"/><ellipse cx="1680" cy="650" rx="690" ry="880" fill="#CDE7DF"/><g font-family="Arial" fill="#132D2B"><image href="data:image/png;base64,${logo}" x="76" y="56" width="300" height="80" preserveAspectRatio="xMinYMid meet"/><text x="76" y="262" font-size="19" fill="#53716A">${String(index + 1).padStart(2, '0')} / ${phone ? 'iOS' : 'WEB'} WALKTHROUGH</text>${headline}<text x="76" y="820" font-size="20" fill="#4D6963">Your first encounter, step by step.</text>${bars}${frame}<text x="960" y="1050" text-anchor="middle" font-size="19" fill="#4D6963">Fictional demo data · ${scene.instructionCard ? 'Instruction card' : motion ? 'Recorded app footage' : 'Static app capture'}${scene.disclosure ? ' · ' + escape(scene.disclosure) : ''}</text></g></svg>`
      const card = path.join(work, `${index}-card.png`)
      await sharp(Buffer.from(svg)).png().toFile(card)
      const segment = path.join(work, `${index}.mp4`)
      let visualSource = source
      if (scene.instructionCard) {
        visualSource = path.join(work, `${index}-instructions.png`)
        const sequence = scene.instructionStyle === 'sequence'
        const evidence = scene.instructionStyle === 'evidence'
        const gap = evidence || scene.instructionCard.length > 3 ? 120 : 144
        const lines = scene.instructionCard
          .map((line, i) => {
            const y = 174 + i * gap
            const label = scene.instructionLabels?.[i]
            const icon = sequence
              ? `<text x="108" y="${y + 63}" text-anchor="middle" font-size="28" font-weight="700" fill="#FFFFFF">${i + 1}</text>`
              : `<path d="M96 ${y + 55}l8 8 17-19" fill="none" stroke="#11736F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
            const connector =
              sequence && i < scene.instructionCard.length - 1
                ? `<path d="M108 ${y + 90}v${gap - 92}m-6-6 6 6 6-6" fill="none" stroke="#78AAA0" stroke-width="2.5"/>`
                : ''
            return `<rect x="48" y="${y}" width="1152" height="112" rx="18" fill="#F1F7F4"/>${connector}<circle cx="108" cy="${y + 55}" r="28" fill="${sequence ? '#11736F' : '#D8EDE5'}"/>${icon}${label ? `<text x="164" y="${y + 43}" font-size="30" font-weight="700">${escape(label)}</text>` : ''}<text x="164" y="${y + (label ? 80 : 65)}" font-size="30" fill="#4D6963">${escape(line)}</text>`
          })
          .join('')
        const evidenceFlow = evidence
          ? `<g font-size="22" font-weight="700" text-anchor="middle"><rect x="48" y="566" width="330" height="72" rx="16" fill="#FFF1C9"/><text x="213" y="610">Highlighted citation</text><path d="M394 602h64m-8-7 8 7-8 7" fill="none" stroke="#11736F" stroke-width="3"/><rect x="474" y="566" width="330" height="72" rx="16" fill="#D8EDE5"/><text x="639" y="610">Audio seeks</text><text x="850" y="611" font-size="30" fill="#11736F">+</text><rect x="900" y="566" width="300" height="72" rx="16" fill="#D8EDE5"/><text x="1050" y="610">Transcript jumps</text></g>`
          : ''
        await sharp(
          Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="1248" height="702"><rect width="1248" height="702" rx="24" fill="#FFFFFF"/><g font-family="Arial" fill="#132D2B"><rect x="48" y="46" width="36" height="4" rx="2" fill="#11736F"/><text x="98" y="54" font-size="18" letter-spacing="2" fill="#53716A">${sequence ? 'STEP BY STEP' : 'WORKFLOW CHECKLIST'}</text><text x="48" y="121" font-size="44" font-weight="700">${escape(scene.instructionTitle || 'Keep these steps in mind')}</text>${lines}${evidenceFlow}</g></svg>`,
          ),
        )
          .png()
          .toFile(visualSource)
      }
      const visual = motion
        ? ['-ss', String(start), '-i', visualSource]
        : ['-loop', '1', '-framerate', '30', '-i', visualSource]
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
          scenes: inputs.map(({ scene, audio }) => ({
            id: scene.id,
            audioSha256: createHash('sha256').update(fs.readFileSync(audio)).digest('hex'),
            narration: scene.narration,
            at: scene.at,
            duration: scene.duration,
          })),
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
