import { expect, test, type Page } from '@playwright/test'

import manifest from './manifest.json'
import { setFixedCaptureTime } from './support/fixed-time'
import { savePageScreenshot } from './support/save-screenshot'

function requireCapture(id: string) {
  const capture = manifest.find((item) => item.id === id)

  if (!capture) {
    throw new Error(`Capture manifest is missing ${id}`)
  }

  return capture
}

const dashboard = requireCapture('dashboard-overview')
const newEncounter = requireCapture('encounters-new-encounter')

async function openPopulatedDashboard(page: Page, route: string): Promise<void> {
  await setFixedCaptureTime(page)
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/)
  await expect(page.getByText('Encounters', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Mochi', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Jamie Chen', { exact: true })).toBeVisible()
  await expect(page.getByText('Mochi is eating normally again', { exact: true })).toBeVisible()
  await expect(page.getByText('Your work', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Not yet marked complete, 1' })).toBeVisible()
  await expect(page.getByText('July 2026', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start an encounter' })).toBeVisible()
}

test('dashboard — populated overview', async ({ page }) => {
  await openPopulatedDashboard(page, dashboard.route)
  await savePageScreenshot(page, dashboard)
})

test('encounters — New Encounter drawer', async ({ page }) => {
  await openPopulatedDashboard(page, newEncounter.route)

  await page.getByRole('button', { name: 'Start an encounter' }).click()
  await expect(page.getByText('New encounter', { exact: true })).toBeVisible()
  const patientSelector = page.getByPlaceholder('Search or type a new name...')
  await expect(patientSelector).toBeVisible()
  await expect(page.getByPlaceholder('Select a template')).toHaveCount(2)
  await expect(page.getByText('Unlimited', { exact: true })).toBeVisible()
  await expect(page.getByText('Pro', { exact: true })).toBeVisible()

  await patientSelector.click()
  await expect(page.getByRole('option', { name: /Mochi/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()

  await savePageScreenshot(page, newEncounter)
})
