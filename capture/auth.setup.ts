import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

import manifest from './manifest.json'
import { setFixedCaptureTime } from './support/fixed-time'

const authStatePath = path.resolve(process.cwd(), '.capture/auth/user.json')
const capturePracticeId = 'd0c50000-0000-4000-8000-000000000601'
const signIn = manifest.find((capture) => capture.id === 'getting-started-sign-in')

if (!signIn) {
  throw new Error('Capture manifest is missing getting-started-sign-in')
}

test('authenticate the documentation capture user', async ({ page }) => {
  // A cold Core worktree compiles the protected dashboard after sign-in.
  test.setTimeout(180_000)
  page.setDefaultNavigationTimeout(120_000)
  const email = process.env.DOCS_CAPTURE_USER_EMAIL
  const password = process.env.DOCS_CAPTURE_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'DOCS_CAPTURE_USER_EMAIL and DOCS_CAPTURE_USER_PASSWORD must be set by the capture runner',
    )
  }

  await setFixedCaptureTime(page)
  await page.goto(signIn.route, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()

  const emailInput = page.getByLabel('Work email')
  await expect(emailInput).toBeVisible()
  await emailInput.fill(email)
  await page.getByLabel('Password').fill(password)

  await Promise.all([
    page.waitForURL(/\/dashboard(?:[/?#]|$)/, { waitUntil: 'domcontentloaded' }),
    page.getByRole('button', { name: 'Continue', exact: true }).click(),
  ])
  await expect(page.getByRole('button', { name: 'Start an encounter' })).toBeVisible({
    timeout: 120_000,
  })

  // PracticeProvider resolves the seeded default workspace asynchronously
  // after sign-in. Persist auth only once that selection is in the browser
  // state, otherwise practice-scoped hooks can issue their first request in
  // personal mode and keep the resulting empty state.
  await expect
    .poll(async () => {
      const cookies = await page.context().cookies()
      return cookies.find((cookie) => cookie.name === 'noctune-practice-id')?.value
    })
    .toBe(capturePracticeId)

  // Capture an established inbox session, with its one-time address intro
  // already dismissed. Otherwise the modal hides the actual inbox controls.
  await page.evaluate(() => {
    window.localStorage.setItem('noctune.inbound-address-intro.v1', '1')
  })

  await fs.mkdir(path.dirname(authStatePath), { recursive: true })
  await page.context().storageState({ path: authStatePath })
})
