import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { writeSubtitles } from './subtitles.mjs'
import { withStagedOutput } from './staged-output.mjs'

const run = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'pipe' })
const escape = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
export function validateCues(data, manifest) {
  assert.deepEqual(data.scenes, manifest.scenes, 'Captions do not match this video narration')
  if (
    !Array.isArray(data.cues) ||
    !data.cues.length ||
    Math.abs(data.duration - manifest.duration) > 0.25
  )
    throw Error('Caption duration does not match video')
  let end = 0
  for (const cue of data.cues) {
    if (
      !Number.isFinite(cue.start) ||
      !Number.isFinite(cue.end) ||
      cue.start < end ||
      cue.end <= cue.start ||
      cue.end > data.duration + 0.001 ||
      typeof cue.text !== 'string' ||
      !cue.text.trim() ||
      cue.text.split('\n').length > 2 ||
      cue.text.split('\n').some((line) => line.length > 42)
    )
      throw Error('Invalid or overlapping caption cue')
    end = cue.end
  }
}
export async function captionVideo(videoDir, captionDir, output) {
  const manifest = JSON.parse(fs.readFileSync(path.join(videoDir, 'manifest.json')))
  const captions = JSON.parse(fs.readFileSync(path.join(captionDir, 'captions.json')))
  validateCues(captions, manifest)
  await withStagedOutput(path.resolve(output), async (stage) => {
    const work = path.join(stage, 'work')
    fs.mkdirSync(work, { recursive: true })
    const blank = path.join(work, 'blank.png')
    await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toFile(blank)
    const entries = [],
      frameCount = Math.ceil(manifest.duration * 30)
    let frame = 0
    const append = (file, frames) => {
      if (frames > 0)
        entries.push(
          `file '${file.replaceAll("'", "'\\''")}'\noption framerate 30\nduration ${frames / 30}`,
        )
    }
    for (const [i, cue] of captions.cues.entries()) {
      const start = Math.round(cue.start * 30),
        end = Math.round(cue.end * 30)
      append(blank, start - frame)
      const lines = cue.text.split('\n')
      const png = path.join(work, `${i}.png`)
      const text = lines
        .map(
          (line, j) =>
            `<text x="960" y="${lines.length === 1 ? 971 : 949 + j * 44}" text-anchor="middle" font-family="Arial" font-size="38" font-weight="500" fill="#FFFFFF">${escape(line)}</text>`,
        )
        .join('')
      await sharp(
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect x="260" y="905" width="1400" height="104" rx="16" fill="#132D2B" fill-opacity="0.96"/>${text}</svg>`,
        ),
      )
        .png()
        .toFile(png)
      append(png, end - start)
      frame = end
    }
    append(blank, frameCount - frame)
    const list = path.join(work, 'captions.txt')
    fs.writeFileSync(
      list,
      'ffconcat version 1.0\n' +
        entries.join('\n') +
        `\nfile '${blank.replaceAll("'", "'\\''")}'\noption framerate 30\n`,
    )
    const overlay = path.join(work, 'captions.mov')
    run([
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      list,
      '-vf',
      'fps=30',
      '-t',
      String(manifest.duration),
      '-c:v',
      'qtrle',
      '-pix_fmt',
      'argb',
      overlay,
    ])
    const input = path.join(videoDir, 'walkthrough-landscape.mp4')
    const burned = path.join(stage, 'walkthrough-captioned.mp4')
    run([
      '-i',
      input,
      '-i',
      overlay,
      '-filter_complex',
      '[0:v][1:v]overlay=0:0:eof_action=pass:format=auto,format=yuv420p[v]',
      '-map',
      '[v]',
      '-map',
      '0:a:0',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '20',
      '-c:a',
      'copy',
      '-t',
      String(manifest.duration),
      '-movflags',
      '+faststart',
      burned,
    ])
    run(['-xerror', '-i', burned, '-f', 'null', '-'])
    const metadata = JSON.parse(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', burned],
        { encoding: 'utf8' },
      ),
    )
    const video = metadata.streams.find((s) => s.codec_type === 'video'),
      audio = metadata.streams.find((s) => s.codec_type === 'audio')
    if (
      video?.width !== 1920 ||
      video?.height !== 1080 ||
      video?.codec_name !== 'h264' ||
      audio?.codec_name !== 'aac' ||
      Math.abs(Number(metadata.format.duration) - manifest.duration) > 0.15
    )
      throw Error('Captioned video failed delivery checks')
    fs.copyFileSync(input, path.join(stage, 'walkthrough-clean.mp4'))
    writeSubtitles(stage, captions.cues)
    fs.writeFileSync(path.join(stage, 'captions.json'), JSON.stringify(captions, null, 2) + '\n')
    fs.writeFileSync(
      path.join(stage, 'manifest.json'),
      JSON.stringify(
        {
          ...manifest,
          captions: 'Timed phrases; authored script with transcription word times',
          recognitionCorrections: captions.corrections,
          listeningReviewPassed: false,
          fullDecodePassed: true,
        },
        null,
        2,
      ) + '\n',
    )
    const qa = path.join(stage, 'qa')
    fs.rmSync(qa, { recursive: true, force: true })
    fs.mkdirSync(qa, { recursive: true })
    const tiles = []
    for (const [i, cue] of captions.cues.entries()) {
      const png = path.join(qa, `caption-${String(i + 1).padStart(2, '0')}.png`)
      run(['-ss', String((cue.start + cue.end) / 2), '-i', burned, '-frames:v', '1', png])
      tiles.push({
        input: await sharp(png).resize(640, 360).toBuffer(),
        left: (i % 3) * 640,
        top: Math.floor(i / 3) * 360,
      })
    }
    await sharp({
      create: {
        width: 1920,
        height: Math.ceil(tiles.length / 3) * 360,
        channels: 3,
        background: '#F3F8F2',
      },
    })
      .composite(tiles)
      .png()
      .toFile(path.join(qa, 'captions-contact-sheet.png'))
    // Inline VTT in the review page so switchable captions also work from file://.
    const vtt = JSON.stringify(
      fs.readFileSync(path.join(stage, 'walkthrough.vtt'), 'utf8'),
    ).replaceAll('<', '\\u003c')
    fs.writeFileSync(
      path.join(stage, 'review.html'),
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(manifest.title)} · review</title><style>body{font:18px system-ui;background:#f3f8f2;color:#132d2b;max-width:1280px;margin:32px auto;padding:24px}video{width:100%}p{line-height:1.6}</style><h1>${escape(manifest.title)}</h1><p>Fictional demo data · Tutorial draft for review.</p><h2>LinkedIn: captions always visible</h2><video controls preload="metadata" src="walkthrough-captioned.mp4"></video><h2>Docs: switchable English captions</h2><video id="clean" controls preload="metadata" src="walkthrough-clean.mp4"></video><script>const v=document.getElementById('clean'),t=document.createElement('track');t.kind='captions';t.label='English';t.srclang='en';t.default=true;t.src=URL.createObjectURL(new Blob([${vtt}],{type:'text/vtt'}));v.append(t);for(const video of document.querySelectorAll('video'))video.addEventListener('play',()=>{for(const other of document.querySelectorAll('video'))if(other!==video)other.pause()})</script></html>`,
    )
    fs.rmSync(work, { recursive: true, force: true })
  })
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [videoDir, captionDir, output] = process.argv.slice(2)
    if (!videoDir || !captionDir || !output)
      throw Error('Usage: caption-video.mjs VIDEO_DIR CAPTION_DIR OUTPUT')
    await captionVideo(path.resolve(videoDir), path.resolve(captionDir), output)
    console.log(`Captioned exports ready: ${path.resolve(output)}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
