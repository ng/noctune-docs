import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { sourcePath } from './render.mjs'
import { withStagedOutput } from './staged-output.mjs'

const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const probe = (file) =>
  JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], {
      encoding: 'utf8',
    }),
  )

// Normal editorial cuts only. Preserve raw bytes and record every chosen range.
export async function editRecordings(root, recipe, output) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')))
  if (recipe.version !== 1 || !Array.isArray(recipe.scenes) || !recipe.scenes.length)
    throw Error('Expected a version 1 edit recipe')
  const ids = new Set(),
    checked = new Map()
  const scenes = recipe.scenes.map((scene) => {
    if (!/^[a-z0-9-]+$/.test(scene.id) || ids.has(scene.id)) throw Error('Invalid edit scene ID')
    ids.add(scene.id)
    const duration = scene.duration ?? 32
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 600 ||
      !Array.isArray(scene.cuts) ||
      !scene.cuts.length
    )
      throw Error('Invalid edit duration/cuts')
    let total = 0
    const cuts = scene.cuts.map((cut) => {
      if (!checked.has(cut.source)) {
        const entry = manifest.clips.find((clip) => clip.file === cut.source)
        if (!entry?.usable) throw Error(`Unapproved source take: ${cut.source}`)
        const file = sourcePath(root, cut.source)
        if (hash(file) !== entry.sha256) throw Error(`Source checksum changed: ${cut.source}`)
        const media = probe(file),
          video = media.streams.find((stream) => stream.codec_type === 'video')
        if (!video || !Number.isFinite(Number(media.format.duration)))
          throw Error('Invalid source video')
        checked.set(cut.source, {
          file,
          entry,
          seconds: Number(media.format.duration),
          width: video.width,
          height: video.height,
        })
      }
      const source = checked.get(cut.source)
      if (
        !Number.isFinite(cut.start) ||
        cut.start < 0 ||
        !Number.isFinite(cut.duration) ||
        cut.duration <= 0 ||
        cut.start + cut.duration > source.seconds + 0.001
      )
        throw Error(`Cut exceeds source footage: ${scene.id}`)
      const hold = cut.hold ?? 0
      if (!Number.isFinite(hold) || hold < 0 || hold > 600)
        throw Error(`Invalid reading hold: ${scene.id}`)
      total += cut.duration + hold
      return { ...cut, hold, ...source }
    })
    if (total > duration + 0.001) throw Error(`Cuts exceed target duration: ${scene.id}`)
    if (cuts.some((cut) => cut.width !== cuts[0].width || cut.height !== cuts[0].height))
      throw Error('One scene must use matching source dimensions')
    return { id: scene.id, duration, total, cuts }
  })
  await withStagedOutput(output, async (stage) => {
    const old = path.join(stage, 'manifest.json')
    if (fs.existsSync(old))
      for (const clip of JSON.parse(fs.readFileSync(old)).clips || []) {
        if (/^[a-z0-9-]+\.mp4$/.test(clip.file))
          fs.rmSync(path.join(stage, clip.file), { force: true })
      }
    const clips = []
    for (const scene of scenes) {
      const file = `${scene.id}.mp4`,
        destination = path.join(stage, file)
      // Simulator captures are variable-rate and write no frames while the
      // screen is static. Convert to constant 30 fps from the source's start
      // before trimming; seeking the input would skip to the next written frame
      // and drop that static screen time.
      const inputs = scene.cuts.flatMap((cut) => ['-i', cut.file])
      const filters = scene.cuts.map(
        (cut, i) =>
          `[${i}:v]fps=30,trim=start=${cut.start}:duration=${cut.duration},setpts=PTS-STARTPTS,setsar=1,tpad=stop_mode=clone:stop_duration=${cut.hold},trim=duration=${cut.duration + cut.hold},setpts=PTS-STARTPTS[v${i}]`,
      )
      filters.push(
        scene.cuts.map((_, i) => `[v${i}]`).join('') +
          `concat=n=${scene.cuts.length}:v=1:a=0,tpad=stop_mode=clone:stop_duration=${scene.duration},trim=duration=${scene.duration},setpts=PTS-STARTPTS[out]`,
      )
      execFileSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          ...inputs,
          '-filter_complex',
          filters.join(';'),
          '-map',
          '[out]',
          '-an',
          '-r',
          '30',
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          destination,
        ],
        { stdio: 'pipe' },
      )
      if (Math.abs(Number(probe(destination).format.duration) - scene.duration) > 0.1)
        throw Error(`Edited duration mismatch: ${scene.id}`)
      clips.push({
        id: scene.id,
        file,
        duration: scene.duration,
        sha256: hash(destination),
        finalFrameHoldSeconds: Math.max(0, scene.duration - scene.total),
        cuts: scene.cuts.map((cut) => ({
          source: cut.source,
          sha256: cut.entry.sha256,
          start: cut.start,
          duration: cut.duration,
          hold: cut.hold,
        })),
      })
    }
    fs.writeFileSync(
      path.join(stage, 'manifest.json'),
      JSON.stringify(
        {
          version: 1,
          appCommit: manifest.appCommit,
          coreCommit: manifest.coreCommit,
          device: manifest.device,
          rawManifestSha256: hash(path.join(root, 'manifest.json')),
          clips,
        },
        null,
        2,
      ) + '\n',
    )
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [root, recipe, output] = process.argv.slice(2)
    if (!root || !recipe || !output)
      throw Error('Usage: edit-recordings.mjs RAW_ROOT RECIPE OUTPUT')
    await editRecordings(
      path.resolve(root),
      JSON.parse(fs.readFileSync(recipe)),
      path.resolve(output),
    )
    console.log('Edited clips ready; raw provenance retained.')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
