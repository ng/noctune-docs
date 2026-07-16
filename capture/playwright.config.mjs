import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertCaptureDatabase, requireLoopbackBaseUrl } from './support/capture-safety.mjs'

const captureDir = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(captureDir, '..')
const captureEnvPath = path.join(docsRoot, '.env.capture.local')
const imagePolicy = JSON.parse(fs.readFileSync(path.join(captureDir, 'image-policy.json'), 'utf8'))

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

assertCaptureDatabase({
  databaseUrl,
  guard: captureEnv.CAPTURE_DATABASE_GUARD,
  forbiddenDatabaseUrl: coreEnv.DATABASE_URL,
})
if (!coreEnv.NEXT_PUBLIC_SUPABASE_URL || !coreEnv.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Noctune Core DEV Supabase configuration is required for authenticated capture')
}

const appUrl = requireLoopbackBaseUrl(baseURL)
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
const deterministicChromiumArgs = ['--disable-gpu', '--font-render-hinting=none']

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
    viewport: imagePolicy.viewport,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
    launchOptions: {
      args: deterministicChromiumArgs,
    },
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
          args: [
            ...deterministicChromiumArgs,
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
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
  webServer: {
    command: `corepack pnpm exec next dev -p ${port}`,
    cwd: runtimeCoreDir,
    env: childEnv,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
