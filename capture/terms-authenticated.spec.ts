import { expect, test } from '@playwright/test'

import manifest from './manifest.json'
import { setFixedCaptureTime } from './support/fixed-time'
import { savePageScreenshot } from './support/save-screenshot'

/** Returns a required manifest entry by capture ID. */
function requireCapture(id: string) {
  const capture = manifest.find((item) => item.id === id)
  if (!capture) throw new Error(`Capture manifest is missing ${id}`)
  return capture
}

const terms = requireCapture('getting-started-terms')
const archivedAudio = requireCapture('encounters-archived-audio')

test.describe.configure({ mode: 'serial' })

test('getting started — legal acceptance gate', async ({ page }) => {
  await setFixedCaptureTime(page)
  await page.goto(terms.route, { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Before you record', level: 1 })).toBeVisible()
  await expect(page.getByLabel('I consent to recording and AI drafting')).not.toBeChecked()
  await expect(page.getByLabel('I agree to the Terms of Service')).not.toBeChecked()
  await expect(page.getByLabel('I agree to the Privacy Policy')).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Agree & continue' })).toBeDisabled()

  await savePageScreenshot(page, terms)
})

test('data storage — archived audio with clinical record retained', async ({ page }) => {
  await setFixedCaptureTime(page)
  await page.goto(terms.route, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('I consent to recording and AI drafting').check()
  await page.getByLabel('I agree to the Terms of Service').check()
  await page.getByLabel('I agree to the Privacy Policy').check()

  await Promise.all([
    page.waitForURL(/\/dashboard(?:[/?#]|$)/),
    page.getByRole('button', { name: 'Agree & continue' }).click(),
  ])

  await page.goto(archivedAudio.route, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Pepper', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Audio archived', { exact: true })).toBeVisible()
  // The day count renders from real server time, not the frozen capture clock,
  // so it grows as the fixture anchor ages — assert the shape, not the number.
  await expect(page.getByText(/Recorded \d+ days ago/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restore Audio' })).toBeVisible()
  await expect(page.getByText('Routine vaccine visit. Pepper is doing well at home')).toBeVisible()

  await savePageScreenshot(page, archivedAudio)
})
