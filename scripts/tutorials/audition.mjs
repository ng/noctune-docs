import fs from 'node:fs'
import path from 'node:path'
import { narrate } from './narrate.mjs'

const [profilesFile, outputDir, envFile] = process.argv.slice(2)
try {
  if (!profilesFile || !outputDir || !envFile)
    throw Error('Usage: node scripts/tutorials/audition.mjs PROFILES OUTPUT ENV_FILE')
  process.loadEnvFile(path.resolve(envFile))
  const profiles = JSON.parse(fs.readFileSync(profilesFile))
  const story = JSON.parse(
    fs.readFileSync(new URL('../../tutorials/voice-audition.json', import.meta.url)),
  )
  if (
    !Array.isArray(profiles) ||
    !profiles.length ||
    new Set(profiles.map((p) => p.id)).size !== profiles.length
  )
    throw Error('Expected uniquely named audition profiles')
  for (const profile of profiles) {
    if (!/^[a-z0-9-]+$/.test(profile.id)) throw Error('Audition IDs must be lowercase slugs')
    await narrate(
      story,
      profile.speech,
      process.env,
      path.resolve(outputDir, profile.id),
      path.resolve(outputDir, '.speech-cache'),
    )
    console.log(`${profile.id}: ready`)
  }
  const escape = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
  fs.writeFileSync(
    path.resolve(outputDir, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>noctune voice auditions</title><style>body{font:18px system-ui;background:#f3f8f2;color:#132d2b;max-width:760px;margin:60px auto;padding:24px}section{background:white;border-radius:16px;padding:24px;margin:24px 0}audio{width:100%}p{line-height:1.6}</style><h1>Choose a voice for noctune</h1><p>The same script, recorded with three voices. Compare naturalness, pacing, and pronunciation.</p>${profiles.map((p) => `<section><h2>${escape(p.id)}</h2><p>${escape(p.speech.provider)} · ${escape(p.speech.model)}</p><audio controls preload="metadata" src="${p.id}/audition.wav"></audio></section>`).join('')}<p>${escape(story.scenes[0].narration)}</p></html>`,
  )
  console.log(`Comparison page: ${path.resolve(outputDir, 'index.html')}`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
