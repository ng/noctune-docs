import fs from 'node:fs'
import path from 'node:path'
import { timestamp } from './narrate.mjs'

// Both delivery modes use the same validated cues as their single source of truth.
export function writeSubtitles(directory, cues) {
  fs.writeFileSync(
    path.join(directory, 'walkthrough.srt'),
    cues
      .map((cue, i) => `${i + 1}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`)
      .join('\n'),
  )
  fs.writeFileSync(
    path.join(directory, 'walkthrough.vtt'),
    'WEBVTT\n\n' +
      cues
        .map(
          (cue) =>
            `${timestamp(cue.start).replace(',', '.')} --> ${timestamp(cue.end).replace(',', '.')}\n${cue.text}\n`,
        )
        .join('\n'),
  )
}
