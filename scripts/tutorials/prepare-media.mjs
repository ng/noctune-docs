import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { validateStory } from './narrate.mjs'
import { sourcePath } from './render.mjs'
import { withStagedOutput } from './staged-output.mjs'

// Build a portable media root without modifying source screenshots or story copy.
export async function prepareMedia(
  storyFile,
  recordingRoot,
  output,
  screenshotRoot,
  replaceCards = [],
) {
  const story = JSON.parse(fs.readFileSync(storyFile))
  validateStory(story)
  // Several capture runs may be combined; a later root replaces an earlier shot.
  const byId = new Map()
  for (const root of [recordingRoot].flat()) {
    const recordings = JSON.parse(fs.readFileSync(path.join(root, 'capture-manifest.json')))
    for (const shot of recordings.shots)
      byId.set(shot.id, {
        ...shot,
        root,
        coreCommit: shot.coreCommit || recordings.coreCommit,
        capturedAt: shot.capturedAt || recordings.capturedAt,
      })
  }
  for (const id of replaceCards) {
    if (!story.scenes.some((scene) => scene.id === id && scene.instructionCard) || !byId.has(id))
      throw Error(`Missing instruction card or replacement recording: ${id}`)
  }
  await withStagedOutput(path.resolve(output), async (stage) => {
    const media = path.join(stage, 'media')
    fs.rmSync(media, { recursive: true, force: true })
    fs.mkdirSync(media, { recursive: true })
    const sources = []
    for (const scene of story.scenes) {
      if (scene.instructionCard && !replaceCards.includes(scene.id)) continue
      if (scene.instructionCard) {
        for (const key of [
          'instructionCard',
          'instructionTitle',
          'instructionLabels',
          'instructionStyle',
          'disclosure',
        ])
          delete scene[key]
      }
      if (scene.platform !== 'web') throw Error('This assembler accepts web stories only')
      const clip = byId.get(scene.id)
      if (clip?.disclosure) scene.disclosure = clip.disclosure
      const source = clip
        ? sourcePath(clip.root, clip.file)
        : sourcePath(screenshotRoot, scene.source)
      const sha256 = createHash('sha256').update(fs.readFileSync(source)).digest('hex')
      if (clip && sha256 !== clip.sha256) throw Error(`Recording checksum changed: ${scene.id}`)
      scene.source = `${scene.id}${path.extname(source)}`
      fs.copyFileSync(source, path.join(media, scene.source))
      sources.push({
        scene: scene.id,
        sha256,
        kind: clip ? 'recorded' : 'static',
        ...(clip
          ? {
              coreCommit: clip.coreCommit,
              capturedAt: clip.capturedAt,
            }
          : {}),
      })
    }
    fs.writeFileSync(path.join(stage, 'story.json'), JSON.stringify(story, null, 2) + '\n')
    fs.writeFileSync(path.join(stage, 'sources.json'), JSON.stringify(sources, null, 2) + '\n')
  })
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [story, recordings, output, replace = ''] = process.argv.slice(2)
  try {
    if (!story || !recordings || !output)
      throw Error('Usage: prepare-media.mjs STORY RECORDINGS[,MORE] OUTPUT [REPLACE_CARD_IDS]')
    await prepareMedia(
      story,
      recordings.split(','),
      output,
      fileURLToPath(new URL('../../public/screenshots', import.meta.url)),
      replace ? replace.split(',') : [],
    )
    console.log(`Prepared story and media: ${path.resolve(output)}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
