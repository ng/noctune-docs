// App audio: the sound the product itself plays during a recorded web shot.
//
// Playwright's screencast has no audio track, so a shot that presses play
// records the page's <audio> events instead (`MEDIA_EVENT_SCRIPT`). The runner
// turns them into clip-time segments of the exact file the page was served
// (`mediaEventSegments`), and the renderer mixes those seconds of that file
// under the scene at the moments the footage shows them playing
// (`sceneAppAudio`). The sound therefore comes from the same bytes the browser
// played, at the same positions; nothing is re-recorded or re-voiced.
//
// Times:
//   raw  — seconds since the shot's page opened (Playwright's video starts there)
//   clip — raw minus the shot's in-point (`sourceIn`): time in the cut MP4
//   scene — clip minus the scene's `start`: time in the rendered scene
//   media — position in the audio file (`currentTime`)

/** Installed with `page.addInitScript`; media events do not bubble, so listen in capture. */
export const MEDIA_EVENT_SCRIPT = `(() => {
  const log = (window.__noctuneMediaEvents = [])
  for (const type of ['playing', 'pause', 'seeking', 'seeked', 'waiting', 'ended']) {
    document.addEventListener(
      type,
      (event) => {
        const media = event.target
        if (!(media instanceof HTMLMediaElement)) return
        log.push({
          type,
          epochMs: performance.timeOrigin + performance.now(),
          media: media.currentTime,
          paused: media.paused,
          src: media.currentSrc,
        })
      },
      true,
    )
  }
})()`

const STOPS = new Set(['pause', 'seeking', 'waiting', 'ended'])

/**
 * Clip-time segments in which the page was audibly playing `src`.
 *
 * `events` come from `MEDIA_EVENT_SCRIPT`; `openedEpochMs` is when the page
 * (and so the raw video) started; `sourceIn` is the clip's in-point in the raw
 * video and `clipDuration` its length. A segment runs from a `playing` event to
 * the next pause, seek, stall or end (or the end of the clip), starting at the
 * media position `playing` reported. A seek made while playing (a chart row's
 * play button) ends one segment and starts the next at `seeked`, since the
 * browser need not fire `playing` again. Segments before the in-point are dropped;
 * one that straddles it is trimmed, and its media start moves with it.
 */
export function mediaEventSegments(events, { openedEpochMs, sourceIn, clipDuration, src }) {
  const clip = (epochMs) => (epochMs - openedEpochMs) / 1000 - sourceIn
  const segments = []
  let open = null
  const close = (endClip) => {
    if (!open) return
    const start = Math.max(open.clipStart, 0)
    const end = Math.min(endClip, clipDuration)
    if (end - start > 0.05)
      segments.push({
        clipStart: round(start),
        clipEnd: round(end),
        mediaStart: round(open.mediaStart + (start - open.clipStart)),
      })
    open = null
  }
  for (const event of events) {
    if (src && event.src && !event.src.includes(src)) continue
    const at = clip(event.epochMs)
    if (event.type === 'playing' || (event.type === 'seeked' && event.paused === false)) {
      close(at)
      open = { clipStart: at, mediaStart: event.media }
    } else if (STOPS.has(event.type)) close(at)
  }
  close(clipDuration)
  return segments
}

const round = (n) => Math.round(n * 1000) / 1000

/** Throws unless `appAudio` is a well-formed story/timeline field. */
export function validateAppAudio(scene) {
  const audio = scene.appAudio
  if (audio === undefined) return
  if (
    !audio ||
    typeof audio.source !== 'string' ||
    !/^[a-z0-9-]+\.(m4a|mp3|wav|aac)$/.test(audio.source) ||
    typeof audio.label !== 'string' ||
    !audio.label.trim() ||
    audio.label.length > 60 ||
    !Array.isArray(audio.segments) ||
    !audio.segments.length ||
    audio.segments.length > 8 ||
    audio.segments.some(
      (s) =>
        !Number.isFinite(s.clipStart) ||
        !Number.isFinite(s.clipEnd) ||
        !Number.isFinite(s.mediaStart) ||
        s.clipStart < 0 ||
        s.mediaStart < 0 ||
        s.clipEnd <= s.clipStart,
    ) ||
    (audio.gain !== undefined &&
      !(Number.isFinite(audio.gain) && audio.gain >= 0.1 && audio.gain <= 2))
  )
    throw Error(`Invalid app audio: ${scene.id}`)
  if (scene.brandCard !== undefined || scene.instructionCard !== undefined)
    throw Error(`App audio needs recorded footage: ${scene.id}`)
}

/**
 * The pieces of app audio a rendered scene plays, in scene time.
 *
 * A clip segment [clipStart, clipEnd) at media position mediaStart is heard at
 * scene time clipStart − start, cut to the scene [0, duration). Where the scene
 * starts after the segment did, the media start advances by the same amount.
 * Narration and app audio never overlap: a piece that would start before the
 * narration ends (plus `gap`) is refused, because the viewer should hear the
 * product's audio on its own. Lengthen the shot's lead-in before playback, or
 * lower the scene's `start`, so the narration finishes first.
 */
export function sceneAppAudio(scene, { gap = 0.2 } = {}) {
  validateAppAudio(scene)
  if (!scene.appAudio) return []
  const start = scene.start ?? 0
  const pieces = []
  for (const segment of scene.appAudio.segments) {
    const from = segment.clipStart - start
    const to = Math.min(segment.clipEnd - start, scene.duration)
    const at = Math.max(0, from)
    if (to - at <= 0.05) continue
    if (at < scene.speechSeconds + gap - 0.001)
      throw Error(
        `App audio in ${scene.id} starts at ${at.toFixed(2)} s, before the narration ends at ` +
          `${scene.speechSeconds.toFixed(2)} s. Lengthen the lead-in before playback or lower start.`,
      )
    pieces.push({
      at: round(at),
      from: round(segment.mediaStart + (at - from)),
      length: round(to - at),
    })
  }
  if (!pieces.length) throw Error(`App audio falls outside the scene: ${scene.id}`)
  return pieces
}
