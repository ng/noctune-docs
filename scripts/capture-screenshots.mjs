import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(scriptsDir, '..')
const captureEnvPath = path.join(docsRoot, '.env.capture.local')
const captureFileEnv = fs.existsSync(captureEnvPath)
  ? dotenv.parse(fs.readFileSync(captureEnvPath))
  : {}
const captureEnv = { ...captureFileEnv, ...process.env }
const coreDir = path.resolve(docsRoot, captureEnv.CAPTURE_CORE_DIR || '../noctune-core')
const coreEnvPath = path.join(coreDir, '.env.local')
const coreFileEnv = fs.existsSync(coreEnvPath) ? dotenv.parse(fs.readFileSync(coreEnvPath)) : {}
const coreEnv = { ...coreFileEnv, ...process.env }
const databaseUrl = captureEnv.CAPTURE_DATABASE_URL
const baseURL = captureEnv.CAPTURE_BASE_URL || 'http://localhost:3100'
const captureUserEmail = captureEnv.DOCS_CAPTURE_USER_EMAIL || 'docs-capture@test.noctune.local'
const termsUserEmail = captureEnv.DOCS_TERMS_USER_EMAIL || 'docs-terms@test.noctune.local'
const captureUserPassword = `Docs-${randomBytes(24).toString('base64url')}!1a`
const captureNow = captureEnv.DOCS_CAPTURE_NOW || '2026-07-15T17:00:00.000Z'

if (!databaseUrl) {
  throw new Error('CAPTURE_DATABASE_URL is required in .env.capture.local or the environment')
}
if (captureEnv.CAPTURE_DATABASE_GUARD !== 'noctune-docs-capture-only') {
  throw new Error('CAPTURE_DATABASE_GUARD must acknowledge the disposable capture database')
}
if (sameDatabaseIdentity(databaseUrl, coreFileEnv.DATABASE_URL || process.env.DATABASE_URL)) {
  throw new Error('Refusing to capture against the database configured in Noctune Core .env.local')
}
if (!captureUserEmail.endsWith('@test.noctune.local')) {
  throw new Error('DOCS_CAPTURE_USER_EMAIL must use the reserved @test.noctune.local domain')
}
if (!termsUserEmail.endsWith('@test.noctune.local')) {
  throw new Error('DOCS_TERMS_USER_EMAIL must use the reserved @test.noctune.local domain')
}
if (!coreEnv.NEXT_PUBLIC_SUPABASE_URL || !coreEnv.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Noctune Core DEV Supabase configuration is required for authenticated capture')
}
if (!fs.existsSync(path.join(coreDir, 'drizzle.config.ts'))) {
  throw new Error(`No Noctune Core checkout found at ${coreDir}`)
}

const coreRevision = await captureOutput('git', ['rev-parse', 'HEAD'], coreDir)
const captureRoot = path.join(docsRoot, '.capture')
const runtimeCoreDir = path.join(captureRoot, 'noctune-core-runtime')
const authDir = path.join(captureRoot, 'auth')
const stagingDir = path.join(captureRoot, `staging-${process.pid}`)
const testResultsDir = path.join(captureRoot, 'test-results')
const lockPath = path.join(captureRoot, 'screenshots.lock')
const manifest = JSON.parse(fs.readFileSync(path.join(docsRoot, 'capture/manifest.json'), 'utf8'))

fs.mkdirSync(captureRoot, { recursive: true })
const lockFd = acquireLock(lockPath)

try {
  await ensureRuntimeWorktree(coreRevision, runtimeCoreDir, coreDir)
  syncCaptureSeeder(coreDir, runtimeCoreDir)

  if (!fs.existsSync(path.join(runtimeCoreDir, 'node_modules'))) {
    await run(
      'Installing isolated Core dependencies',
      'corepack',
      ['pnpm', 'install', '--frozen-lockfile'],
      runtimeCoreDir,
      process.env,
    )
  }

  const coreChildEnv = {
    ...process.env,
    ...coreEnv,
    ...captureEnv,
    APP_ENV: 'development',
    DATABASE_URL: databaseUrl,
    E2E_FAKES: '1',
    NEXT_PUBLIC_APP_ENV: 'development',
    NEXT_PUBLIC_APP_URL: baseURL,
    SUPABASE_REALTIME_ENABLED: 'false',
    DOCS_CAPTURE_USER_EMAIL: captureUserEmail,
    DOCS_TERMS_USER_EMAIL: termsUserEmail,
    DOCS_CAPTURE_USER_PASSWORD: captureUserPassword,
    DOCS_CAPTURE_NOW: captureNow,
  }
  const playwrightEnv = {
    ...process.env,
    ...captureEnv,
    CAPTURE_OUTPUT_ROOT: stagingDir,
    CAPTURE_RUNTIME_CORE_DIR: runtimeCoreDir,
    DOCS_CAPTURE_USER_EMAIL: captureUserEmail,
    DOCS_TERMS_USER_EMAIL: termsUserEmail,
    DOCS_CAPTURE_USER_PASSWORD: captureUserPassword,
    DOCS_CAPTURE_NOW: captureNow,
  }

  fs.rmSync(authDir, { force: true, recursive: true })
  fs.rmSync(stagingDir, { force: true, recursive: true })
  fs.rmSync(testResultsDir, { force: true, recursive: true })
  fs.mkdirSync(stagingDir, { recursive: true })

  await run(
    'Applying Core migrations',
    'corepack',
    ['pnpm', 'exec', 'drizzle-kit', 'migrate', '--config=drizzle.config.ts'],
    runtimeCoreDir,
    coreChildEnv,
  )
  await run(
    'Seeding Core system data',
    'corepack',
    ['pnpm', 'exec', 'tsx', 'src/db/seed.ts', '--standalone'],
    runtimeCoreDir,
    coreChildEnv,
  )
  await run(
    'Seeding documentation fixtures',
    'corepack',
    ['pnpm', 'exec', 'tsx', 'scripts/seed-docs-capture.ts'],
    runtimeCoreDir,
    coreChildEnv,
  )
  await run(
    'Capturing screenshots',
    'corepack',
    ['pnpm', 'exec', 'playwright', 'test', '--config=capture/playwright.config.mjs'],
    docsRoot,
    playwrightEnv,
  )
  await run(
    'Verifying screenshots',
    process.execPath,
    ['scripts/verify-screenshots.mjs', '--strict'],
    docsRoot,
    playwrightEnv,
  )
  promoteScreenshots(manifest, stagingDir)
  console.log(`\n[screenshots] Updated ${manifest.length} committed screenshot assets`)
} finally {
  fs.rmSync(authDir, { force: true, recursive: true })
  fs.rmSync(stagingDir, { force: true, recursive: true })
  fs.closeSync(lockFd)
  fs.rmSync(lockPath, { force: true })
}

async function ensureRuntimeWorktree(revision, runtimeDir, sourceDir) {
  await run('Pruning stale Core worktrees', 'git', ['worktree', 'prune'], sourceDir, process.env)

  const worktreeList = await captureOutput('git', ['worktree', 'list', '--porcelain'], sourceDir)
  const registered = worktreeList
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .some((line) => path.resolve(line.slice('worktree '.length)) === path.resolve(runtimeDir))
  const hasRuntime = registered && fs.existsSync(path.join(runtimeDir, 'package.json'))
  const runtimeRevision = hasRuntime
    ? await captureOutput('git', ['rev-parse', 'HEAD'], runtimeDir)
    : null

  if (runtimeRevision === revision) return

  if (registered) {
    await run(
      'Refreshing isolated Core worktree',
      'git',
      ['worktree', 'remove', '--force', runtimeDir],
      sourceDir,
      process.env,
    )
  } else {
    fs.rmSync(runtimeDir, { force: true, recursive: true })
  }

  await run(
    'Creating isolated Core worktree',
    'git',
    ['worktree', 'add', '--detach', runtimeDir, revision],
    sourceDir,
    process.env,
  )
}

function syncCaptureSeeder(sourceDir, runtimeDir) {
  const source = path.join(sourceDir, 'scripts/seed-docs-capture.ts')
  const destination = path.join(runtimeDir, 'scripts/seed-docs-capture.ts')
  if (!fs.existsSync(source)) {
    throw new Error(`Missing documentation fixture seeder at ${source}`)
  }
  if (fs.existsSync(destination) && fs.readFileSync(source).equals(fs.readFileSync(destination))) {
    return
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(source, destination)
}

function promoteScreenshots(captures, stagingRoot) {
  for (const capture of captures) {
    const source = safeChildPath(stagingRoot, capture.output)
    const destination = safeChildPath(docsRoot, capture.output)
    const temporary = `${destination}.tmp-${process.pid}`
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(source, temporary)
    fs.renameSync(temporary, destination)
  }
}

function safeChildPath(root, relativePath) {
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, relativePath)
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes its configured root: ${relativePath}`)
  }
  return resolved
}

function acquireLock(lockPath) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(lockPath, 'wx')
      fs.writeFileSync(fd, `${process.pid}\n`)
      return fd
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
      const pid = Number.parseInt(fs.readFileSync(lockPath, 'utf8').trim(), 10)
      if (pid && processIsRunning(pid)) {
        throw new Error(`Another screenshot update is already running (PID ${pid})`)
      }
      fs.rmSync(lockPath, { force: true })
    }
  }
  throw new Error('Could not acquire the screenshot update lock')
}

function processIsRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code !== 'ESRCH'
  }
}

function sameDatabaseIdentity(left, right) {
  if (!left || !right) return false
  return databaseIdentity(left) === databaseIdentity(right)
}

function databaseIdentity(value) {
  const url = new URL(value)
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('Capture database URLs must use postgres:// or postgresql://')
  }
  const hostname = url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '')
  const port = url.port || '5432'
  const database = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, '')
  return `${hostname}:${port}/${database}`
}

async function run(label, command, args, cwd, env) {
  console.log(`\n[screenshots] ${label}`)
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
    })

    const forwardSigint = () => child.kill('SIGINT')
    const forwardSigterm = () => child.kill('SIGTERM')
    const cleanupSignalHandlers = () => {
      process.off('SIGINT', forwardSigint)
      process.off('SIGTERM', forwardSigterm)
    }

    process.once('SIGINT', forwardSigint)
    process.once('SIGTERM', forwardSigterm)

    child.on('error', (error) => {
      cleanupSignalHandlers()
      reject(error)
    })
    child.on('exit', (code, signal) => {
      cleanupSignalHandlers()
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${label} failed (${signal ? `signal ${signal}` : `exit ${code}`})`))
    })
  })
}

async function captureOutput(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve(output.trim())
        return
      }
      reject(new Error(`${command} failed (${signal ? `signal ${signal}` : `exit ${code}`})`))
    })
  })
}
