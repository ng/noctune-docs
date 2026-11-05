// Record the noctune Chrome extension against a throwaway local copy of Core,
// seeded with the shared fictional demo story, and compose the real side panel
// docked beside a stand-in practice record. Reuses the extension's own e2e
// harness from the Core checkout (its database guard, app environment, demo
// seed, test page, and e2e build) on ports of its own, so it never touches the
// suite's database, proxy container, or a running test run.
// Usage: capture-extension.mjs CORE_WITH_EXTENSION OUTPUT [SHOTS]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { createRequire } from 'node:module'
import { randomBytes, createHash } from 'node:crypto'
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { setTimeout as wait } from 'node:timers/promises'
import dotenv from 'dotenv'
import sharp from 'sharp'
import { chromium, expect } from '@playwright/test'
import { withStagedOutput } from './staged-output.mjs'
import {
  PANEL,
  SHORTCUT,
  STAGE,
  composeFilter,
  dressRecord,
  installOverlays,
  shots as registry,
  showKeys,
} from './extension-shots.mjs'

const PORTS = { app: 3118, site: 8797, secureSite: 8798, wsproxy: 5491 }
const CONTAINER = 'noctune-docs-ext-wsproxy'
const SLIDE = 0.32

const [coreArg, outputArg, selected = Object.keys(registry).join(',')] = process.argv.slice(2)
if (!coreArg || !outputArg)
  throw Error(`Usage: capture-extension.mjs CORE OUTPUT [${Object.keys(registry)}]`)
const core = path.resolve(coreArg),
  output = path.resolve(outputArg),
  extensionDir = path.join(core, 'extension')
const ids = selected.split(',')
if (ids.some((id) => !Object.hasOwn(registry, id))) throw Error('Unknown capture shot')
if (!fs.existsSync(path.join(extensionDir, 'e2e', 'backend', 'seed.ts')))
  throw Error('Core checkout has no extension e2e harness (extension/e2e)')
const sourceEnv = dotenv.parse(fs.readFileSync(path.join(core, '.env.local')))
// Same development auth boundary as the web runner: throwaway users only.
if (new URL(sourceEnv.NEXT_PUBLIC_SUPABASE_URL).hostname !== 'vvmqgqvkkcgmulbiytsf.supabase.co')
  throw Error('Expected the existing development authentication project')
if (!sourceEnv.DATABASE_URL_TEST) throw Error('Core .env.local needs DATABASE_URL_TEST')
const database = new URL(sourceEnv.DATABASE_URL_TEST)
database.pathname = `${database.pathname.replace(/\/$/, '')}_ext_docs`
Object.assign(process.env, {
  E2E_DATABASE_URL: database.toString(),
  E2E_APP_PORT: String(PORTS.app),
  E2E_SITE_PORT: String(PORTS.site),
  E2E_SECURE_SITE_PORT: String(PORTS.secureSite),
  E2E_WSPROXY_PORT: String(PORTS.wsproxy),
})
const requireCore = createRequire(path.join(core, 'package.json'))
requireCore('tsx/cjs')
const load = (file) => requireCore(path.join(extensionDir, file))
const harness = load('e2e/env.ts')
const { seedAccounts } = load('e2e/backend/seed.ts')
harness.assertSafeDatabase(database.toString())
const appOrigin = harness.APP_ORIGIN,
  siteUrl = harness.SITE_URL

const portOpen = (port) =>
  new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1')
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
for (const port of Object.values(PORTS))
  if (await portOpen(port)) throw Error(`Port ${port} is in use; stop whatever holds it first`)

const docsRoot = fileURLToPath(new URL('../..', import.meta.url))
const captureRoot = path.join(docsRoot, '.capture')
fs.mkdirSync(captureRoot, { recursive: true })
const lockPath = path.join(captureRoot, 'extension-capture.lock')
const lock = fs.openSync(lockPath, 'wx', 0o600)
fs.writeFileSync(lock, String(process.pid))
const logPath = path.join(captureRoot, 'extension-core.log')
const log = fs.openSync(logPath, 'w', 0o600)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'noctune-ext-docs-'))
const accounts = []
let server, sitePages, context, admin, startedProxy, debugPage

function ffprobeDuration(file) {
  return Number(
    execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
      { encoding: 'utf8' },
    ).trim(),
  )
}

// The first frame (seconds) where the magenta sync square fills the corner.
function findSyncMark(video) {
  const frames = execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      video,
      '-vf',
      'fps=30,crop=24:24:8:8',
      '-pix_fmt',
      'rgb24',
      '-f',
      'rawvideo',
      '-',
    ],
    { maxBuffer: 256 * 1024 * 1024 },
  )
  const size = 24 * 24 * 3
  for (let at = 0, frame = 0; at + size <= frames.length; at += size, frame++) {
    let r = 0,
      g = 0,
      b = 0
    for (let i = at; i < at + size; i += 3) {
      r += frames[i]
      g += frames[i + 1]
      b += frames[i + 2]
    }
    const n = size / 3
    if (r / n > 200 && g / n < 90 && b / n > 200) return frame / 30
  }
  throw Error('Sync mark not found in recording')
}

class Film {
  constructor({ site, panel, worker }) {
    Object.assign(this, { site, panel, worker })
    this.events = []
    this.late = []
    this.openAt = 0
    this.pointer = new Map()
    this.lastPage = null
  }
  begin() {
    this.start = Date.now()
  }
  now() {
    return (Date.now() - this.start) / 1000
  }
  async at(seconds) {
    const ms = seconds * 1000 - (Date.now() - this.start)
    if (ms > 0) await wait(ms)
    else if (ms < -150) this.late.push({ planned: seconds, actual: Number(this.now().toFixed(3)) })
  }
  mark(type, extra = {}) {
    this.events.push({ type, t: Number(this.now().toFixed(3)), ...extra })
  }
  listRow(patient, group = 'Today') {
    return this.panel
      .getByRole('group', { name: group })
      .getByRole('option')
      .filter({ has: this.panel.locator('.row-name', { hasText: new RegExp(`^${patient}$`) }) })
      .first()
  }
  waitFor(locator, text) {
    return expect(locator).toHaveText(text, { timeout: 10000 })
  }
  // Stage coordinates of a page point (the panel sits under its header, right of the record).
  stage(page, point) {
    if (page === this.site) return point
    return { x: point.x + STAGE.width - PANEL.width, y: point.y + PANEL.header }
  }
  local(page, point) {
    if (page === this.site) return point
    return { x: point.x - (STAGE.width - PANEL.width), y: point.y - PANEL.header }
  }
  async hideCursor(page) {
    for (const each of page ? [page] : [this.site, this.panel])
      await each.evaluate(() => {
        const cursor = document.getElementById('film-cursor')
        if (cursor) cursor.style.display = 'none'
      })
  }
  async move(page, from, to, seconds) {
    const started = Date.now()
    for (;;) {
      const p = Math.min(1, (Date.now() - started) / (seconds * 1000))
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2
      await page.mouse.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e)
      if (p === 1) break
      await wait(12)
    }
    this.pointer.set(page, to)
  }
  // Glides the drawn pointer onto `target`; crossing between the record and the
  // panel, it leaves one page at the shared edge and enters the other there.
  async glide(page, target, { seconds = 0.45 } = {}) {
    const box = await target.boundingBox()
    if (!box) throw Error('Nothing to point at')
    const to = { x: box.x + Math.min(box.width / 2, 90), y: box.y + Math.min(box.height / 2, 40) }
    const previous = this.lastPage
    let from = this.pointer.get(page)
    if (previous && previous !== page) {
      const last = this.stage(previous, this.pointer.get(previous))
      const edge = STAGE.width - PANEL.width
      await this.move(
        previous,
        this.local(previous, last),
        this.local(previous, { x: edge, y: last.y }),
        0.15,
      )
      await this.hideCursor(previous)
      from = this.local(page, { x: edge, y: last.y })
    }
    from ??= { x: to.x - 160, y: to.y + 120 }
    await this.move(page, from, to, seconds)
    // Over an iframe the top page gets no mousemove: place the pointer outright.
    await page.evaluate(({ x, y }) => {
      const cursor = document.getElementById('film-cursor')
      cursor.style.display = 'block'
      cursor.style.transform = `translate(${x - 2}px, ${y - 2}px)`
    }, to)
    this.lastPage = page
    return { x: to.x - box.x, y: to.y - box.y, box }
  }
  async click(page, target) {
    const { x, y, box } = await this.glide(page, target)
    await wait(100)
    await target.click({ position: { x, y } })
    this.mark('click', { page: page === this.site ? 'record' : 'panel', box: this.box(page, box) })
  }
  box(page, box) {
    const at = this.stage(page, box)
    return [at.x, at.y, box.width, box.height].map((n) => Math.round(n))
  }
  async press(anchor, section) {
    const box = await anchor.boundingBox()
    await this.site.evaluate(showKeys, { box, keys: SHORTCUT })
    await wait(180)
    const result = await this.worker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url: `${url}*` })
      return globalThis.__noctuneTest.insertNext(await chrome.tabs.get(tab.id))
    }, siteUrl)
    if (!result?.ok) throw Error(`Insert failed for ${section}: ${JSON.stringify(result)}`)
    this.mark('insert', { section, box: this.box(this.site, box) })
  }
  // Docks the panel: the composition slides it in from here; the record reflows
  // to the narrower width once it has arrived, as Chrome's page does.
  async openPanel() {
    this.openAt = this.now()
    this.mark('panel-open')
    await wait(SLIDE * 1000)
    await this.site.setViewportSize({ width: STAGE.width - PANEL.width, height: STAGE.height })
  }
}

async function panelHeader(file) {
  const s = STAGE.scale
  const icon = fs
    .readFileSync(path.join(extensionDir, 'dist-e2e', 'icons', 'badge-48.png'))
    .toString('base64')
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL.width * s}" height="${PANEL.header * s}"><rect width="100%" height="100%" fill="#FFFFFF"/><rect y="${PANEL.header * s - 2}" width="100%" height="2" fill="#E3E6E8"/><image href="data:image/png;base64,${icon}" x="28" y="20" width="40" height="40"/><text x="84" y="51" font-family="Helvetica, Arial" font-size="27" font-weight="600" fill="#202124">noctune</text><path d="M${PANEL.width * s - 52} 30l20 20m0-20-20 20" stroke="#5F6368" stroke-width="3" stroke-linecap="round"/></svg>`,
    ),
  )
    .png()
    .toFile(file)
}

async function warmUp(vet) {
  const { createClient } = requireCore('@supabase/supabase-js')
  const supabase = createClient(
    sourceEnv.NEXT_PUBLIC_SUPABASE_URL,
    sourceEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data, error } = await supabase.auth.signInWithPassword(vet)
  if (error || !data.session) throw Error('Warm-up sign-in failed')
  const headers = {
    Authorization: `Bearer ${data.session.access_token}`,
    Accept: 'application/json',
  }
  const get = async (route) => {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`${appOrigin}${route}`, { headers }).catch(() => null)
      if (response?.ok) return response.json()
      if (attempt >= 45)
        throw Error(
          `Warm-up ${route} answered ${response?.status ?? 'nothing'}: ${(await response?.text().catch(() => ''))?.slice(0, 200)}`,
        )
      await wait(2000)
    }
  }
  await get('/api/v1/practices/me')
  const list = await get('/api/v1/transcriptions?page=1&pageSize=20')
  for (const item of list.data.items.filter((row) => row.status === 'completed').slice(0, 1)) {
    const notes = await get(`/api/v1/transcriptions/${item.id}/soap-notes`)
    await get(`/api/v1/transcriptions/${item.id}`)
    if (notes.data.items[0])
      await get(`/api/v1/transcriptions/${item.id}/soap-notes/${notes.data.items[0].id}`)
  }
  await get('/api/v1/search?q=ma')
  await supabase.auth.signOut().catch(() => {})
}

async function openPanel(worker, extensionId, vet) {
  const url = `chrome-extension://${extensionId}/sidepanel.html`
  const opened = context.waitForEvent('page', (page) => page.url() === url)
  opened.catch(() => {})
  await worker.evaluate(
    async ({ target }) =>
      chrome.windows.create({
        url: target,
        type: 'popup',
        focused: false,
        width: 400,
        height: 760,
        left: 1320,
        top: 0,
      }),
    { target: url },
  )
  const page = await opened
  const startedAt = Date.now()
  await page.setViewportSize({ width: PANEL.width, height: STAGE.height - PANEL.header })
  await page.waitForLoadState('domcontentloaded')
  const send = (message) => page.evaluate((m) => chrome.runtime.sendMessage(m), message)
  const signedIn = await send({
    type: 'signInWithPassword',
    email: vet.email,
    password: vet.password,
  })
  if (signedIn?.error) throw Error('Panel sign-in failed')
  const practices = await send({ type: 'listPractices' })
  await send({ type: 'selectPractice', practiceId: practices[0].id })
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Search patients' })).toBeVisible({
    timeout: 30000,
  })
  return { page, startedAt }
}

try {
  console.log('Building the extension for the local app.')
  execFileSync('corepack', ['pnpm', 'build:e2e'], {
    cwd: extensionDir,
    env: process.env,
    stdio: ['ignore', log, log],
  })
  execFileSync(
    'docker',
    [
      'run',
      '-d',
      '--rm',
      '--name',
      CONTAINER,
      '-p',
      `${PORTS.wsproxy}:80`,
      '-e',
      `APPEND_PORT=${harness.wsproxyTarget(database.toString())}`,
      '-e',
      'ALLOW_ADDR_REGEX=.*',
      '--add-host',
      'host.docker.internal:host-gateway',
      'ghcr.io/neondatabase/wsproxy:latest',
    ],
    { stdio: ['ignore', log, log] },
  )
  startedProxy = true
  for (let i = 0; i < 50 && !(await portOpen(PORTS.wsproxy)); i++) await wait(200)

  console.log('Recreating the throwaway database and seeding the fictional demo story.')
  const pg = requireCore('pg')
  const adminUrl = new URL(database)
  adminUrl.pathname = '/postgres'
  const name = database.pathname.slice(1)
  const client = new pg.Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await client.query(`CREATE DATABASE "${name}"`)
  } finally {
    await client.end()
  }
  const pool = new pg.Pool({ connectionString: database.toString(), max: 2 })
  try {
    const { drizzle } = requireCore('drizzle-orm/node-postgres')
    const { migrate } = requireCore('drizzle-orm/node-postgres/migrator')
    await migrate(drizzle(pool), { migrationsFolder: path.join(core, 'drizzle') })
    const { createClient } = requireCore('@supabase/supabase-js')
    admin = createClient(sourceEnv.NEXT_PUBLIC_SUPABASE_URL, sourceEnv.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    for (const label of ['vet', 'solo']) {
      const account = {
        email: `ext-docs-${label}-${randomBytes(5).toString('hex')}@test.noctune.local`,
        password: `Pw-${randomBytes(12).toString('hex')}!`,
      }
      const { data, error } = await admin.auth.admin.createUser({ ...account, email_confirm: true })
      if (error || !data.user) throw Error('Throwaway user creation failed')
      accounts.push({ ...account, id: data.user.id })
    }
    await seedAccounts({
      pool,
      databaseUrl: database.toString(),
      supabaseUrl: sourceEnv.NEXT_PUBLIC_SUPABASE_URL,
      vet: accounts[0],
      solo: accounts[1],
    })
  } finally {
    await pool.end()
  }

  sitePages = spawn('node', ['e2e/serve-test-page.mjs'], {
    cwd: extensionDir,
    env: process.env,
    detached: true,
    stdio: ['ignore', log, log],
  })
  // A dev cache left by a server stopped mid-compile can answer 404 for every
  // route on the next start; begin from a clean development cache.
  fs.rmSync(path.join(core, '.next', 'dev'), { recursive: true, force: true })
  server = spawn('corepack', ['pnpm', 'exec', 'next', 'dev', '-p', String(PORTS.app)], {
    cwd: core,
    env: {
      ...process.env,
      ...harness.appServerEnv(harness.rootEnv()),
      NODE_OPTIONS: '--max-http-header-size=32768',
    },
    detached: true,
    stdio: ['ignore', log, log],
  })
  let serverExit
  server.on('exit', (code) => (serverExit = code ?? 1))
  for (let attempts = 0; ; attempts++) {
    if (serverExit !== undefined) throw Error('Local app exited; inspect the local protected log')
    if (attempts > 180) throw Error('Local app did not start')
    const response = await fetch(`${appOrigin}/api/v1/practices/me`, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => null)
    if (response && response.status < 500) break
    await wait(1000)
  }
  console.log('Local app up; warming the routes the extension calls.')
  await warmUp(accounts[0])

  const s = STAGE.scale
  await withStagedOutput(output, async (stage) => {
    // Takes record outside the stage so a failed run leaves them for inspection.
    const takes = path.join(captureRoot, 'extension-takes')
    fs.rmSync(takes, { recursive: true, force: true })
    fs.mkdirSync(takes, { recursive: true })
    const raw = path.join(stage, 'raw')
    fs.rmSync(raw, { recursive: true, force: true })
    fs.mkdirSync(raw, { recursive: true })
    const manifestPath = path.join(stage, 'manifest.json')
    const previous = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath))
      : { clips: [] }
    const clips = previous.clips.filter((clip) => !ids.includes(path.basename(clip.file, '.mp4')))
    const header = path.join(stage, 'panel-header.png')
    await panelHeader(header)
    const dist = path.join(extensionDir, 'dist-e2e')
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      // Headful, like the extension's own e2e suite: only a real window on a
      // Retina display records at twice the page size.
      headless: process.env.EXT_HEADLESS === '1',
      viewport: { width: STAGE.width, height: STAGE.height },
      deviceScaleFactor: s,
      colorScheme: 'light',
      locale: 'en-US',
      recordVideo: { dir: takes, size: { width: STAGE.width * s, height: STAGE.height * s } },
      args: [
        `--disable-extensions-except=${dist}`,
        `--load-extension=${dist}`,
        `--window-size=${STAGE.width},${STAGE.height + 140}`,
        '--window-position=0,0',
      ],
    })
    const worker =
      context.serviceWorkers().find((each) => each.url().startsWith('chrome-extension://')) ??
      (await context.waitForEvent('serviceworker', { timeout: 15000 }))
    const extensionId = new URL(worker.url()).host
    const browserVersion = await worker.evaluate(() =>
      navigator.userAgent.replace(/.*(Chrome\/[\d.]+).*/, '$1'),
    )
    // Returning-vet prefs: the coach card and the confirm prompt already answered.
    await worker.evaluate(() =>
      chrome.storage.local.set({ coachDismissed: true, confirmPromptSeen: true }),
    )
    for (const id of ids) {
      const shot = registry[id]
      const site = await context.newPage()
      const siteStartedAt = Date.now()
      debugPage = site
      for (const page of context.pages())
        if (page !== site && page.url() === 'about:blank') await page.close()
      await site.goto(siteUrl)
      await site.evaluate(dressRecord)
      await site.evaluate(installOverlays)
      const focus = () =>
        worker.evaluate(async (url) => {
          const [tab] = await chrome.tabs.query({ url: `${url}*` })
          await chrome.windows.update(tab.windowId, { focused: true })
          await chrome.tabs.update(tab.id, { active: true })
        }, siteUrl)
      await focus()
      const { page: panel, startedAt: panelStartedAt } = await openPanel(
        worker,
        extensionId,
        accounts[0],
      )
      await panel.evaluate(installOverlays)
      await site.bringToFront()
      await focus()
      if (shot.panel === 'open')
        await site.setViewportSize({ width: STAGE.width - PANEL.width, height: STAGE.height })
      await expect(site.locator('#patient-name')).toHaveText('Mochi')
      await wait(1500)
      // Both recordings show a sync square for a moment; its first frame pins each
      // video to the film clock, independent of when the browser began encoding.
      const syncAt = Date.now()
      await Promise.all(
        [site, panel].map((page) =>
          page.evaluate(() => {
            const mark = document.getElementById('film-sync')
            mark.style.display = 'block'
            setTimeout(() => (mark.style.display = 'none'), 300)
          }),
        ),
      )
      await wait(1200)
      const film = new Film({ site, panel, worker })
      film.begin()
      await shot.act(film)
      await film.at(shot.duration + 0.5)
      if (film.late.length) console.warn(`${id}: late actions ${JSON.stringify(film.late)}`)
      await site.screenshot({ path: path.join(stage, `${id}-poster.png`) })
      const siteVideo = site.video(),
        panelVideo = panel.video()
      await panel.close()
      await site.close()
      const sitePath = path.join(raw, `${id}-record.webm`),
        panelPath = path.join(raw, `${id}-panel.webm`)
      fs.copyFileSync(await siteVideo.path(), sitePath)
      fs.copyFileSync(await panelVideo.path(), panelPath)
      const offset = (video) => findSyncMark(video) + (film.start - syncAt) / 1000
      const siteIn = offset(sitePath),
        panelIn = offset(panelPath)
      const destination = path.join(stage, `${id}.mp4`)
      execFileSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          '-i',
          sitePath,
          '-i',
          panelPath,
          '-loop',
          '1',
          '-framerate',
          '30',
          '-i',
          header,
          '-filter_complex',
          composeFilter({
            siteIn,
            panelIn,
            duration: shot.duration,
            openAt: shot.panel === 'open' ? 0 : film.openAt,
            slide: SLIDE,
          }),
          '-map',
          '[v]',
          '-an',
          '-t',
          String(shot.duration),
          '-r',
          '30',
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '16',
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
      if (Math.abs(ffprobeDuration(destination) - shot.duration) > 0.1)
        throw Error(`Incomplete recording: ${id}`)
      clips.push({
        file: `${id}.mp4`,
        usable: true,
        duration: shot.duration,
        raw: [path.relative(stage, sitePath), path.relative(stage, panelPath)],
        sourceIn: { record: Number(siteIn.toFixed(3)), panel: Number(panelIn.toFixed(3)) },
        panelOpenAt: shot.panel === 'open' ? 0 : Number(film.openAt.toFixed(3)),
        events: film.events,
        lateActions: film.late,
        capturedAt: new Date().toISOString(),
        sha256: createHash('sha256').update(fs.readFileSync(destination)).digest('hex'),
      })
      console.log(`Recorded ${id}: ${shot.duration}s`)
    }
    const commit = (cwd) =>
      execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          version: 1,
          capturedAt: new Date().toISOString(),
          coreCommit: commit(core),
          appCommit: commit(core),
          device: `${browserVersion} · ${STAGE.width}×${STAGE.height} at ${s}x · extension e2e build`,
          fictionalData: true,
          practiceRecord:
            'The extension test page dressed as a patient record; not a real practice system',
          panel:
            'Real sidepanel.html in a popup window, composed docked at the right with a drawn Chrome header',
          shortcut: 'Insert-next command run through the e2e build hook; keycaps drawn on screen',
          clips,
        },
        null,
        2,
      ) + '\n',
    )
  })
  console.log(`Extension recordings ready: ${output}`)
} catch (error) {
  if (debugPage && !debugPage.isClosed())
    await debugPage
      .screenshot({ path: path.join(captureRoot, 'extension-failure.png') })
      .catch(() => {})
  let message = String(error.message || 'Capture failed')
  for (const value of [...Object.values(sourceEnv), ...accounts.map((a) => a.password)]) {
    if (typeof value === 'string' && value.length > 6)
      message = message.replaceAll(value, '[redacted]')
  }
  console.error(message)
  process.exitCode = 1
} finally {
  await context?.close().catch(() => {})
  for (const child of [server, sitePages]) {
    if (!child?.pid) continue
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      /* already exited */
    }
  }
  if (startedProxy) {
    try {
      execFileSync('docker', ['rm', '-f', CONTAINER], { stdio: 'ignore' })
    } catch {
      /* already gone */
    }
  }
  for (const account of accounts) await admin?.auth.admin.deleteUser(account.id).catch(() => {})
  fs.rmSync(profile, { recursive: true, force: true })
  fs.closeSync(log)
  fs.closeSync(lock)
  fs.rmSync(lockPath, { force: true })
}
