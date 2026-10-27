import { expect, test, type Page } from '@playwright/test'

import manifest from './manifest.json'
import { setFixedCaptureTime } from './support/fixed-time'
import { savePageScreenshot } from './support/save-screenshot'

/** Returns a required manifest entry by capture ID. */
function requireCapture(id: string) {
  const capture = manifest.find((item) => item.id === id)
  if (!capture) throw new Error(`Capture manifest is missing ${id}`)
  return capture
}

const practiceLocked = requireCapture('templates-practice-locked')

/** Keeps the member's first-run onboarding prompt from covering the page. */
async function mockAnsweredOnboardingPrompt(page: Page): Promise<void> {
  await page.route('**/api/v1/me/onboarding', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          promptAnsweredAt: '2026-07-15T17:00:00.000Z',
          checklistHiddenAt: null,
          dismissedAt: null,
          completedSteps: [],
        },
        ok: true,
      }),
    })
  })
}

test('templates — practice template locked for members', async ({ page }) => {
  await setFixedCaptureTime(page)
  await mockAnsweredOnboardingPrompt(page)
  await page.goto(practiceLocked.route, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'New Encounter' })).toBeVisible()

  await expect(page.getByText('Wellness & Vaccine Visit', { exact: true }).first()).toBeVisible()
  await expect(
    page.getByText(/^Only owners and admins of .+ can edit practice templates\./),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set as my default' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set as practice default' })).toHaveCount(0)

  await savePageScreenshot(page, practiceLocked)
})
