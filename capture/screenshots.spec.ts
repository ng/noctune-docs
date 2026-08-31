import { expect, test } from '@playwright/test'

import manifest from './manifest.json'
import { setFixedCaptureTime } from './support/fixed-time'
import { savePageScreenshot } from './support/save-screenshot'

const signIn = manifest.find((capture) => capture.id === 'getting-started-sign-in')

if (!signIn) {
  throw new Error('Capture manifest is missing getting-started-sign-in')
}

test('getting started — sign-in options', async ({ page }) => {
  await setFixedCaptureTime(page)
  await page.goto(signIn.route, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Apple' })).toBeVisible()
  await expect(page.getByLabel('Work email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()

  await savePageScreenshot(page, signIn)
})
