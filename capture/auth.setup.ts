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
  const email = process.env.DOCS_CAPTURE_USER_EMAIL
  const password = process.env.DOCS_CAPTURE_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'DOCS_CAPTURE_USER_EMAIL and DOCS_CAPTURE_USER_PASSWORD must be set by the capture runner',
    )
  }

  await setFixedCaptureTime(page)
  await page.goto(signIn.route, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Sign in to Noctune' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign in with email instead' }).click()
  const emailInput = page.getByLabel('Email')
  await expect(emailInput).toBeVisible()
  await emailInput.fill(email)
  await page.getByLabel('Password').fill(password)

  await Promise.all([
    page.waitForURL(/\/dashboard(?:[/?#]|$)/),
    page.getByRole('button', { name: /^sign in$/i }).click(),
  ])
  await expect(page.getByRole('button', { name: 'Start an encounter' })).toBeVisible()

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

  await fs.mkdir(path.dirname(authStatePath), { recursive: true })
  await page.context().storageState({ path: authStatePath })
})
