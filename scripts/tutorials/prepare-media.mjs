import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { validateStory } from './narrate.mjs'
import { sourcePath } from './render.mjs'
import { withStagedOutput } from './staged-output.mjs'

// Build a portable media root without modifying source screenshots or story copy.
export async function prepareMedia(storyFile, recordingRoot, output, screenshotRoot) {
  const story = JSON.parse(fs.readFileSync(storyFile))
  validateStory(story)
  const recordings = JSON.parse(fs.readFileSync(path.join(recordingRoot, 'capture-manifest.json')))
  const byId = new Map(recordings.shots.map((shot) => [shot.id, shot]))
  await withStagedOutput(path.resolve(output), async (stage) => {
    const media = path.join(stage, 'media')
    fs.rmSync(media, { recursive: true, force: true })
    fs.mkdirSync(media, { recursive: true })
    const sources = []
    for (const scene of story.scenes) {
      if (scene.instructionCard) continue
      if (scene.platform !== 'web') throw Error('This assembler accepts web stories only')
      const clip = byId.get(scene.id)
      const source = clip
        ? sourcePath(recordingRoot, clip.file)
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
              coreCommit: clip.coreCommit || recordings.coreCommit,
              capturedAt: clip.capturedAt || recordings.capturedAt,
            }
          : {}),
      })
    }
    fs.writeFileSync(path.join(stage, 'story.json'), JSON.stringify(story, null, 2) + '\n')
    fs.writeFileSync(path.join(stage, 'sources.json'), JSON.stringify(sources, null, 2) + '\n')
  })
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [story, recordings, output] = process.argv.slice(2)
  try {
    if (!story || !recordings || !output)
      throw Error('Usage: prepare-media.mjs STORY RECORDINGS OUTPUT')
    await prepareMedia(
      story,
      recordings,
      output,
      fileURLToPath(new URL('../../public/screenshots', import.meta.url)),
    )
    console.log(`Prepared story and media: ${path.resolve(output)}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
