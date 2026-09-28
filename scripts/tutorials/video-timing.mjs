import sharp from 'sharp'
import { execFileSync } from 'node:child_process'

// Match actual encoded frames to the ready-state screenshot. Browser screencast
// timestamps can lag DOM readiness, so Node elapsed time is not a reliable in-point.
export async function locateReadyFrame(video, reference) {
  const width = 160,
    height = 90,
    fps = 10
  const target = await sharp(reference)
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer()
  const frames = execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      video,
      '-vf',
      `fps=${fps},scale=${width}:${height}`,
      '-pix_fmt',
      'rgb24',
      '-f',
      'rawvideo',
      '-',
    ],
    { maxBuffer: 128 * 1024 * 1024 },
  )
  const frameBytes = width * height * 3
  const scores = []
  for (let at = 0; at + frameBytes <= frames.length; at += frameBytes) {
    let difference = 0
    for (let i = 0; i < frameBytes; i++) difference += Math.abs(target[i] - frames[at + i])
    scores.push(difference / frameBytes)
  }
  const best = Math.min(...scores)
  if (!Number.isFinite(best) || best > 8)
    throw Error('Recorded video does not match the ready-state reference')
  const index = scores.findIndex((score) => score <= best + 0.2)
  return { sourceIn: index / fps, frameDifference: scores[index] }
}
