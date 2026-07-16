import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

import manifest from './manifest.json'
import { setFixedCaptureTime } from './support/fixed-time'

const authStatePath = path.resolve(process.cwd(), '.capture/auth/terms-user.json')
const signIn = manifest.find((capture) => capture.id === 'getting-started-sign-in')

if (!signIn) {
  throw new Error('Capture manifest is missing getting-started-sign-in')
}

test('authenticate the documentation legal-gate user', async ({ page }) => {
  const email = process.env.DOCS_TERMS_USER_EMAIL
  const password = process.env.DOCS_CAPTURE_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'DOCS_TERMS_USER_EMAIL and DOCS_CAPTURE_USER_PASSWORD must be set by the capture runner',
    )
  }

  await setFixedCaptureTime(page)
  await page.goto(signIn.route, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Sign in with email instead' }).click()
  const emailInput = page.getByLabel('Email')
  await expect(emailInput).toBeVisible()
  await emailInput.fill(email)
  await page.getByLabel('Password').fill(password)

  await Promise.all([
    page.waitForURL(/\/accept-terms(?:[/?#]|$)/),
    page.getByRole('button', { name: /^sign in$/i }).click(),
  ])
  await expect(page.getByRole('heading', { name: 'Owl-most there.' })).toBeVisible()

  await fs.mkdir(path.dirname(authStatePath), { recursive: true })
  await page.context().storageState({ path: authStatePath })
})
