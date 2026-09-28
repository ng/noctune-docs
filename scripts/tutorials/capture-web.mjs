// Record real product interactions against the existing approved fictional fixtures.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { randomBytes, createHash } from 'node:crypto'
import { spawn, execFileSync } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'
import dotenv from 'dotenv'
import { chromium, expect } from '@playwright/test'
import {
  assertCaptureDatabase,
  parseCaptureDatabaseAllowlist,
  requireLoopbackBaseUrl,
} from '../../capture/support/capture-safety.mjs'
import { withStagedOutput } from './staged-output.mjs'
import { installUploadFixture } from './web-upload-fixture.mjs'
import { locateReadyFrame } from './video-timing.mjs'

const [
  configRootArg,
  coreArg,
  outputArg,
  selected = 'start,record,process,review,edit,send,follow-up',
] = process.argv.slice(2)
if (!configRootArg || !coreArg || !outputArg)
  throw Error(
    'Usage: capture-web.mjs PRIMARY_DOCS CORE_RUNTIME OUTPUT [start,record,process,review,edit,send,follow-up]',
  )
const configRoot = path.resolve(configRootArg),
  core = path.resolve(coreArg),
  output = path.resolve(outputArg)
const shots = selected.split(',')
if (
  shots.some(
    (id) => !['start', 'record', 'process', 'review', 'edit', 'send', 'follow-up'].includes(id),
  )
)
  throw Error('Unknown capture shot')
const capture = dotenv.parse(fs.readFileSync(path.join(configRoot, '.env.capture.local')))
const sourceCore = path.resolve(configRoot, capture.CAPTURE_CORE_DIR || '../noctune-core')
const sourceEnv = dotenv.parse(fs.readFileSync(path.join(sourceCore, '.env.local')))
assertCaptureDatabase({
  databaseUrl: capture.CAPTURE_DATABASE_URL,
  guard: capture.CAPTURE_DATABASE_GUARD,
  allowedDatabaseFingerprints: parseCaptureDatabaseAllowlist(
    JSON.parse(fs.readFileSync(new URL('../../capture/database-allowlist.json', import.meta.url))),
  ),
  forbiddenDatabaseUrls: [sourceEnv.DATABASE_URL, process.env.DATABASE_URL],
})
const baseURL = 'http://127.0.0.1:3108'
requireLoopbackBaseUrl(baseURL)
// Reuse the native harness's verified development auth boundary.
if (new URL(sourceEnv.NEXT_PUBLIC_SUPABASE_URL).hostname !== 'vvmqgqvkkcgmulbiytsf.supabase.co')
  throw Error('Expected the existing development authentication project')
const email = capture.DOCS_CAPTURE_USER_EMAIL || 'docs-capture@test.noctune.local'
if (!email.endsWith('@test.noctune.local')) throw Error('Reserved fixture identity required')
const password = `Tutorial-${randomBytes(24).toString('base64url')}!1a`
let now = capture.DOCS_CAPTURE_NOW || '2026-07-15T17:00:00.000Z'
const env = {
  ...process.env,
  ...sourceEnv,
  APP_ENV: 'development',
  NEXT_PUBLIC_APP_ENV: 'development',
  DATABASE_URL: capture.CAPTURE_DATABASE_URL,
  E2E_FAKES: '1',
  NEXT_PUBLIC_APP_URL: baseURL,
  SUPABASE_REALTIME_ENABLED: 'false',
  DOCS_CAPTURE_NOW: now,
}
const captureRoot = path.join(configRoot, '.capture')
fs.mkdirSync(captureRoot, { recursive: true })
const lockPath = path.join(captureRoot, 'screenshots.lock')
const lock = fs.openSync(lockPath, 'wx', 0o600)
fs.writeFileSync(lock, String(process.pid))
const logPath = path.join(captureRoot, 'tutorial-core.log')
const log = fs.openSync(logPath, 'w', 0o600)
let server, browser, debugPage, fixtureAudio, citationTime
try {
  console.log('Applying committed Core migrations to the approved capture database.')
  execFileSync(
    'corepack',
    ['pnpm', 'exec', 'drizzle-kit', 'migrate', '--config=drizzle.config.ts'],
    { cwd: core, env, stdio: ['ignore', log, log] },
  )
  const requireCore = createRequire(path.join(core, 'package.json'))
  const sql = requireCore('postgres')(capture.CAPTURE_DATABASE_URL, { max: 1 })
  try {
    const rows =
      await sql`select created_at from transcriptions where id = 'd0c50000-0000-4000-8000-000000000201'`
    if (rows.length !== 1) throw Error('Reserved Mochi encounter is missing')
    now = new Date(rows[0].created_at).toISOString()
    env.DOCS_CAPTURE_NOW = now
    const [note] =
      await sql`select content_blocks from soap_notes where id = 'd0c50000-0000-4000-8000-000000000301' and transcription_id = 'd0c50000-0000-4000-8000-000000000201'`
    const [segment] =
      await sql`select start_time from transcript_segments where transcription_id = 'd0c50000-0000-4000-8000-000000000201' and text like 'Perfect. Let me get her up on the scale%'`
    if (!note || !segment) throw Error('Expected reserved clinical fixtures are missing')
    citationTime = Number(segment.start_time)
    const blocks = note.content_blocks
    const objective = blocks.find((block) => block.heading === 'Objective')
    const phrase = 'Weight 4.6 kg (stable from the previous visit)'
    if (!objective?.content.includes(phrase)) throw Error('Fixture weight finding changed')
    objective.citations = [
      { startTime: citationTime, text: phrase, offset: objective.content.indexOf(phrase) },
    ]
    // Clinical content blocks are immutable. Create a reserved tutorial version
    // from the original fictional note rather than rewriting generated content.
    await sql.begin(async (tx) => {
      await tx`update soap_notes set is_active = false where transcription_id = 'd0c50000-0000-4000-8000-000000000201' and is_active = true`
      await tx`insert into soap_notes select (jsonb_populate_record(null::soap_notes, to_jsonb(n) || jsonb_build_object('id', 'd0c50000-0000-4000-8000-000000000309', 'version', 2, 'parent_note_id', n.id, 'is_active', true, 'content_blocks', ${tx.json(blocks)}::jsonb))).* from soap_notes n where n.id = 'd0c50000-0000-4000-8000-000000000301' on conflict (id) do update set is_active = true`
    })
    if (shots.some((id) => ['start', 'record', 'process', 'review', 'edit'].includes(id))) {
      await sql`update soap_notes n set rendered_markdown = original.rendered_markdown, edit_metadata = null, updated_at = original.updated_at from soap_notes original where n.id = 'd0c50000-0000-4000-8000-000000000309' and original.id = 'd0c50000-0000-4000-8000-000000000301'`
      await sql`update transcriptions set finished_at = null, finished_by = null, finish_method = null where id = 'd0c50000-0000-4000-8000-000000000201'`
    }
    requireCore('tsx/cjs')
    const { buildSyntheticDemoAudio } = requireCore(
      path.join(core, 'scripts/fixtures/noctune-demo/media.ts'),
    )
    fixtureAudio = buildSyntheticDemoAudio(284).bytes
  } finally {
    await sql.end()
  }
  const { createClient } = requireCore('@supabase/supabase-js')
  const auth = createClient(
    sourceEnv.NEXT_PUBLIC_SUPABASE_URL,
    sourceEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  let user
  for (let page = 1; page <= 20 && !user; page++) {
    const { data, error } = await auth.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw Error('Capture auth lookup failed')
    user = data.users.find((candidate) => candidate.email === email)
    if (data.users.length < 100) break
  }
  if (!user) throw Error('Reserved fixtures missing; run the guarded docs fixture setup first')
  const { error } = await auth.auth.admin.updateUserById(user.id, { password })
  if (error) throw Error('Capture auth refresh failed')
  console.log('Capture guards passed; reusing fictional fixtures and refreshing reserved login.')
  server = spawn(
    'corepack',
    ['pnpm', 'exec', 'next', 'dev', '--hostname', '127.0.0.1', '-p', '3108'],
    { cwd: core, env, detached: true, stdio: ['ignore', log, log] },
  )
  let serverExit
  server.on('exit', (code) => {
    serverExit = code ?? 1
  })
  for (let attempts = 0; ; attempts++) {
    if (serverExit !== undefined)
      throw Error('Capture server exited; inspect the local protected log')
    if (attempts > 90) throw Error('Capture server did not become ready')
    try {
      const response = await fetch(`${baseURL}/sign-in`, { signal: AbortSignal.timeout(5000) })
      if (response.ok) break
    } catch {
      /* wait for initial compilation */
    }
    await wait(1000)
  }
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  })
  const common = {
    baseURL,
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    permissions: ['microphone'],
  }
  const login = await browser.newContext(common)
  const page = await login.newPage()
  debugPage = page
  await page.goto('/sign-in')
  await page.getByLabel('Work email').fill(email)
  await page.getByLabel('Password').fill(password)
  await Promise.all([
    page.waitForURL(/\/dashboard/),
    page.getByRole('button', { name: 'Continue', exact: true }).click(),
  ])
  await expect
    .poll(
      async () =>
        (await login.cookies()).find((cookie) => cookie.name === 'noctune-practice-id')?.value,
      { timeout: 30000 },
    )
    .toBe('d0c50000-0000-4000-8000-000000000601')
  const storageState = await login.storageState()
  await login.close()
  console.log('Authenticated the fictional practice; recording selected shots.')
  await withStagedOutput(output, async (stage) => {
    const raw = path.join(stage, 'raw')
    fs.mkdirSync(raw, { recursive: true })
    const manifestPath = path.join(stage, 'capture-manifest.json')
    const previous = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath))
      : { shots: [] }
    const records = previous.shots
      .filter((shot) => !shots.includes(shot.id))
      .map((shot) => ({
        ...shot,
        coreCommit: shot.coreCommit || previous.coreCommit,
        capturedAt: shot.capturedAt || previous.capturedAt,
      }))
    for (const id of shots) {
      const context = await browser.newContext({
        ...common,
        storageState,
        recordVideo: { dir: raw, size: common.viewport },
      })
      const started = performance.now()
      const page = await context.newPage()
      debugPage = page
      const video = page.video()
      const uploadEvidence = id === 'record' ? await installUploadFixture(page, baseURL) : null
      await page.clock.setFixedTime(new Date(now))
      await page.route(
        /\/docs-capture\/d0c50000-0000-4000-8000-000000000201\.m4a(?:\?.*)?$/,
        async (route) => {
          const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range || '')
          const start = range ? Number(range[1]) : 0
          const end = range?.[2]
            ? Math.min(Number(range[2]), fixtureAudio.length - 1)
            : fixtureAudio.length - 1
          await route.fulfill({
            status: range ? 206 : 200,
            contentType: 'audio/wav',
            headers: {
              'accept-ranges': 'bytes',
              ...(range ? { 'content-range': `bytes ${start}-${end}/${fixtureAudio.length}` } : {}),
            },
            body: fixtureAudio.subarray(start, end + 1),
          })
        },
      )
      await page.route('**/api/v1/me/onboarding', async (route) => {
        if (route.request().method() !== 'GET') return route.continue()
        await route.fulfill({
          json: {
            ok: true,
            data: {
              promptAnsweredAt: now,
              checklistHiddenAt: now,
              dismissedAt: now,
              completedSteps: [],
            },
          },
        })
      })
      await page.goto(
        id === 'process'
          ? '/encounters/d0c50000-0000-4000-8000-000000000203'
          : ['review', 'edit', 'send'].includes(id)
            ? '/encounters/d0c50000-0000-4000-8000-000000000201'
            : id === 'follow-up'
              ? '/messages'
              : '/dashboard',
        {
          waitUntil: 'domcontentloaded',
        },
      )
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
      await expect(page.getByRole('button', { name: 'New Encounter', exact: true })).toBeVisible({
        timeout: 60000,
      })
      if (id === 'record') await openDrawer(page)
      if (id === 'follow-up') {
        await expect(page.getByRole('heading', { name: 'Messages', exact: true })).toBeVisible()
        await expect(page.getByTestId('conversation-subject')).toHaveText(
          'Mochi is eating normally again',
          { timeout: 60000 },
        )
        const tip = page.getByRole('button', { name: 'Got it', exact: true })
        if (await tip.isVisible()) await tip.click()
      }
      if (['review', 'edit', 'send'].includes(id)) {
        await expect(page.getByRole('heading', { name: 'Subjective', exact: true })).toBeVisible({
          timeout: 60000,
        })
        await expect(page.getByText('Accepted', { exact: true })).toHaveCount(0)
        await expect
          .poll(() => page.locator('audio').evaluate((audio) => audio.readyState))
          .toBeGreaterThan(0)
        await expect.poll(() => page.locator('audio').evaluate((audio) => audio.duration)).toBe(284)
      }
      if (id === 'process')
        await expect(
          page.getByRole('button', { name: 'View Encounters', exact: true }),
        ).toBeVisible({ timeout: 60000 })
      if (id === 'start')
        await expect(page.getByText('Mochi', { exact: true }).first()).toBeVisible({
          timeout: 60000,
        })
      await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0, { timeout: 60000 })
      const readyReference = path.join(stage, `${id}-ready.png`)
      await page.screenshot({ path: readyReference })
      const begin = (performance.now() - started) / 1000
      await wait(1000)
      if (id === 'start') await openDrawer(page)
      if (id === 'process') {
        await wait(3000)
        await page.getByRole('button', { name: 'View Encounters', exact: true }).click()
        await expect(page.getByText('Mochi', { exact: true }).first()).toBeVisible({
          timeout: 30000,
        })
      }
      if (id === 'review') {
        await wait(3500)
        const citation = page.locator('[title$="click to jump"]').first()
        await citation.hover()
        await wait(1200)
        await citation.click()
        await expect
          .poll(() => page.locator('audio').evaluate((audio) => audio.currentTime))
          .toBeGreaterThanOrEqual(citationTime)
        await expect(page.locator('.ts-active')).toContainText('Weight 4.6 kg')
        await wait(1500)
        await page.getByRole('button', { name: 'Pause', exact: true }).click()
      }
      if (id === 'record') {
        await page.getByRole('button', { name: 'Record from web', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
        await wait(2000)
        await page.getByRole('button', { name: 'Pause', exact: true }).click()
        await wait(800)
        await page.getByRole('button', { name: 'Resume', exact: true }).click()
        await wait(800)
        await page.getByRole('button', { name: 'Stop', exact: true }).click()
        await expect(page.getByRole('button', { name: /Process 1 file/ })).toBeEnabled()
        await wait(1200)
        await page.getByRole('button', { name: /Process 1 file/ }).click()
        await expect(page.getByText('Upload Complete', { exact: true })).toBeVisible({
          timeout: 30000,
        })
      }
      if (id === 'edit') {
        await page.getByRole('button', { name: 'Edit', exact: true }).click()
        const editor = page.locator('#soap-note-markdown-editor')
        await expect(editor).toBeVisible()
        const original = await editor.inputValue()
        if (!original.includes('current diet')) throw Error('Expected original fixture wording')
        await editor.fill(original.replace('current diet', 'usual diet'))
        await wait(1200)
        await page.getByRole('button', { name: 'Save', exact: true }).click()
        await expect(editor).toBeHidden()
        await expect(page.getByText(/Continue the usual diet/)).toBeVisible()
        await page.getByText(/Continue the usual diet/).scrollIntoViewIfNeeded()
        await wait(1500)
        await page.getByRole('button', { name: 'Complete', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible()
      }
      if (id === 'send') {
        await page.getByRole('tab', { name: 'Discharge Notes', exact: true }).click()
        await wait(3000)
        await page.getByRole('button', { name: 'Send Email', exact: true }).click()
        await page.getByRole('menuitem', { name: /Send discharge notes/ }).click()
        const dialog = page.getByRole('dialog')
        await expect(
          dialog.getByRole('heading', { name: 'Send Discharge Summary', exact: true }),
        ).toBeVisible()
        const recipient = dialog.getByLabel('To', { exact: true })
        await recipient.fill('jamie.chen@example.test')
        await recipient.press('Enter')
        await expect(dialog.getByText('jamie.chen@example.test', { exact: true })).toBeVisible()
        await expect(dialog.getByRole('button', { name: 'Send', exact: true })).toBeEnabled()
        await wait(1500)
        await dialog.getByRole('button', { name: 'Change', exact: true }).click()
        await page.getByTestId('from-route-option-noreply').getByRole('radio').check()
        await expect(dialog.getByTestId('from-route-resting-address')).toHaveText(
          'noreply@mail.noctune.ai',
        )
      }
      if (id === 'follow-up') {
        await expect(page.getByTestId('conversation-subject')).toHaveText(
          'Mochi is eating normally again',
        )
        const reply = page.getByRole('button', { name: 'Reply', exact: true })
        if (await reply.count()) await reply.first().click()
      }
      await page.mouse.move(24, 14)
      const duration = 32
      await wait(Math.max(1000, (begin + duration + 1) * 1000 - (performance.now() - started)))
      await page.screenshot({ path: path.join(stage, `${id}-poster.png`) })
      await context.close()
      const rawPath = await video.path()
      const rawDuration = Number(
        execFileSync(
          'ffprobe',
          [
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            rawPath,
          ],
          { encoding: 'utf8' },
        ).trim(),
      )
      const { sourceIn, frameDifference } = await locateReadyFrame(rawPath, readyReference)
      const destination = path.join(stage, `${id}.mp4`)
      execFileSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          '-ss',
          String(sourceIn),
          '-i',
          rawPath,
          '-t',
          String(duration),
          '-an',
          '-vf',
          'tpad=stop_mode=clone:stop_duration=32',
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
      execFileSync('ffmpeg', ['-v', 'error', '-xerror', '-i', destination, '-f', 'null', '-'], {
        stdio: 'pipe',
      })
      const metadata = JSON.parse(
        execFileSync('ffprobe', ['-v', 'error', '-show_format', '-of', 'json', destination], {
          encoding: 'utf8',
        }),
      )
      if (Math.abs(Number(metadata.format.duration) - duration) > 0.1)
        throw Error(`Incomplete recording: ${id}`)
      records.push({
        id,
        file: `${id}.mp4`,
        raw: path.relative(stage, rawPath),
        sourceIn,
        frameDifference,
        readyReference: path.basename(readyReference),
        rawDuration,
        ...(id === 'record' ? { disclosure: 'Demo upload · cloud services simulated' } : {}),
        ...(['review', 'edit', 'send'].includes(id) ? { disclosure: 'Example draft' } : {}),
        duration,
        ...(uploadEvidence ? { uploadFixture: uploadEvidence() } : {}),
        capturedAt: new Date().toISOString(),
        coreCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: core,
          encoding: 'utf8',
        }).trim(),
        sha256: createHash('sha256').update(fs.readFileSync(destination)).digest('hex'),
      })
      console.log(`Recorded ${id}: ${duration}s`)
    }
    fs.writeFileSync(
      path.join(stage, 'capture-manifest.json'),
      JSON.stringify(
        {
          version: 1,
          capturedAt: new Date().toISOString(),
          coreCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: core,
            encoding: 'utf8',
          }).trim(),
          viewport: common.viewport,
          fictionalData: true,
          microphone: 'Chromium synthetic audio',
          playback: 'Local deterministic 284-second synthetic WAV fixture; no clinical speech',
          processing:
            'Upload API responses and cloud storage simulated; example drafts precomputed',
          shots: records,
        },
        null,
        2,
      ) + '\n',
    )
  })
  console.log(`Web recordings ready: ${output}`)
} catch (error) {
  if (debugPage && !debugPage.isClosed() && !debugPage.url().includes('/sign-in')) {
    await debugPage
      .screenshot({ path: path.join(captureRoot, 'tutorial-failure.png') })
      .catch(() => {})
  }
  let message = String(error.message || 'Capture failed')
  for (const value of [password, ...Object.values(sourceEnv), ...Object.values(capture)]) {
    if (typeof value === 'string' && value.length > 6)
      message = message.replaceAll(value, '[redacted]')
  }
  console.error(message)
  process.exitCode = 1
} finally {
  await browser?.close().catch(() => {})
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      /* already exited */
    }
  }
  fs.closeSync(log)
  fs.closeSync(lock)
  fs.rmSync(lockPath, { force: true })
}

async function openDrawer(page) {
  await page.getByRole('button', { name: 'New Encounter', exact: true }).click()
  const patient = page.getByPlaceholder('Search or type a new name...')
  await expect(patient).toBeVisible()
  await patient.click()
  await page.getByRole('option', { name: /Mochi/ }).click()
  await expect(patient).toHaveValue('Mochi')
  await expect
    .poll(() => page.locator('input').evaluateAll((inputs) => inputs.map((input) => input.value)))
    .toContain('General SOAP Note')
}
