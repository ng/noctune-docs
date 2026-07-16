import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const captureDir = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(captureDir, '..')
const captureEnvPath = path.join(docsRoot, '.env.capture.local')

const captureEnv = {
  ...(fs.existsSync(captureEnvPath) ? dotenv.parse(fs.readFileSync(captureEnvPath)) : {}),
  ...process.env,
}
const sourceCoreDir = path.resolve(docsRoot, captureEnv.CAPTURE_CORE_DIR || '../noctune-core')
const runtimeCoreDir = process.env.CAPTURE_RUNTIME_CORE_DIR
  ? path.resolve(process.env.CAPTURE_RUNTIME_CORE_DIR)
  : sourceCoreDir
const coreEnvPath = path.join(sourceCoreDir, '.env.local')

const coreEnv = {
  ...(fs.existsSync(coreEnvPath) ? dotenv.parse(fs.readFileSync(coreEnvPath)) : {}),
  ...process.env,
}
const databaseUrl = captureEnv.CAPTURE_DATABASE_URL
const baseURL = captureEnv.CAPTURE_BASE_URL || 'http://localhost:3100'

if (!databaseUrl) {
  throw new Error('CAPTURE_DATABASE_URL is required in .env.capture.local or the environment')
}
if (captureEnv.CAPTURE_DATABASE_GUARD !== 'noctune-docs-capture-only') {
  throw new Error('CAPTURE_DATABASE_GUARD must acknowledge the disposable capture database')
}
if (sameDatabaseIdentity(databaseUrl, coreEnv.DATABASE_URL)) {
  throw new Error('Refusing to capture against the database configured in Noctune Core .env.local')
}
if (!coreEnv.NEXT_PUBLIC_SUPABASE_URL || !coreEnv.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Noctune Core DEV Supabase configuration is required for authenticated capture')
}

const appUrl = new URL(baseURL)
const localHost = appUrl.hostname === 'localhost' || appUrl.hostname === '127.0.0.1'
const port = appUrl.port || (appUrl.protocol === 'https:' ? '443' : '80')
const childEnv = {
  ...process.env,
  ...coreEnv,
  ...captureEnv,
  APP_ENV: 'development',
  DATABASE_URL: databaseUrl,
  E2E_FAKES: '1',
  NEXT_PUBLIC_APP_ENV: 'development',
  NEXT_PUBLIC_APP_URL: baseURL,
  SUPABASE_REALTIME_ENABLED: 'false',
}
const authStatePath = path.join(docsRoot, '.capture/auth/user.json')
const termsAuthStatePath = path.join(docsRoot, '.capture/auth/terms-user.json')

export default defineConfig({
  testDir: '.',
  outputDir: path.join(docsRoot, '.capture/test-results'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'public',
      testMatch: /screenshots\.spec\.ts/,
    },
    {
      name: 'auth-setup',
      testMatch: /\/auth\.setup\.ts$/,
    },
    {
      name: 'authenticated',
      testMatch: /\/authenticated\.spec\.ts$/,
      dependencies: ['auth-setup'],
      use: {
        storageState: authStatePath,
        permissions: ['microphone'],
        launchOptions: {
          args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
        },
      },
    },
    {
      name: 'terms-auth-setup',
      testMatch: /\/terms-auth\.setup\.ts$/,
    },
    {
      name: 'terms-authenticated',
      testMatch: /\/terms-authenticated\.spec\.ts$/,
      dependencies: ['terms-auth-setup'],
      use: {
        storageState: termsAuthStatePath,
      },
    },
  ],
  webServer: localHost
    ? {
        command: `corepack pnpm exec next dev -p ${port}`,
        cwd: runtimeCoreDir,
        env: childEnv,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : undefined,
})

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
