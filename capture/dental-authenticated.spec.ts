import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

import manifest from './manifest.json'
import { DENTAL, serveDentalRecordings, usePersonalWorkspace } from './support/dental-samples.mjs'
import { setFixedCaptureTime } from './support/fixed-time'
import { savePageScreenshot } from './support/save-screenshot'

// Dental charts (early preview). Core's docs capture seeder puts the dental
// samples in the capture user's personal workspace; every encounter's audio is
// a committed synthetic-speech recording of an invented dictation, served from
// the Core runtime checkout. Written for the UI after Core's dental charting
// follow-up (`feat/dental-charting-followup`): the "Dental Chart" tab, quadrant
// headings, play on a quote in the tooth popover, "Chart as dog / cat", and an
// unconfirmed chart attachable to a discharge as a draft.
//
// Refresh only these with: pnpm screenshots:update --grep "dental charts"

const coreDir = process.env.CAPTURE_RUNTIME_CORE_DIR
const SILENT_WAV = Buffer.from(
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=',
  'base64',
)

/** Returns a required manifest entry by capture ID. */
function capture(id: string) {
  const item = manifest.find((entry) => entry.id === id)
  if (!item) throw new Error(`Capture manifest is missing ${id}`)
  return item
}

/** Keeps the first-run onboarding prompt from covering the page. */
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

/** Opens a route in the personal workspace with the samples' real recordings. */
async function openDentalPage(page: Page, route: string): Promise<void> {
  if (!coreDir) throw new Error('CAPTURE_RUNTIME_CORE_DIR must be set by the capture runner')
  const baseURL = test.info().project.use.baseURL
  if (!baseURL) throw new Error('The capture project has no baseURL')
  await setFixedCaptureTime(page)
  await usePersonalWorkspace(page.context(), baseURL)
  await mockAnsweredOnboardingPrompt(page)
  // Any other encounter audio stays silent; the dental samples play their recordings
  await page.route(/\.m4a(?:\?.*)?$/i, (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: SILENT_WAV }),
  )
  await serveDentalRecordings(page, coreDir)
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'New Encounter' })).toBeVisible()
}

/** Opens a sample encounter and waits for its recording to load. */
async function openDentalEncounter(page: Page, route: string, patient: string): Promise<void> {
  await openDentalPage(page, route)
  await expect(page.getByText(patient, { exact: true }).first()).toBeVisible()
  await expect
    .poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.duration))
    .toBeGreaterThan(30)
}

/** Opens the Dental Chart tab and waits for the mouth to draw. */
async function openDentalChart(page: Page) {
  await page.getByRole('tab', { name: 'Dental Chart', exact: true }).click()
  const panel = page.getByTestId('dental-chart-panel')
  await expect(panel.getByTestId('dental-chart-svg')).toBeVisible()
  await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0)
  return panel
}

/** Scrolls the note pane so an element sits at the top of the viewport. */
async function scrollToTop(page: Page, locator: ReturnType<Page['locator']>): Promise<void> {
  await locator.evaluate((element) => element.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(300)
}

test('dental charts — New Encounter drawer with the Dental chart chip', async ({ page }) => {
  const item = capture('dental-new-encounter-chip')
  await openDentalPage(page, item.route)
  await page.getByRole('button', { name: 'New Encounter', exact: true }).click()
  const patient = page.getByPlaceholder('Search or type a new name...')
  await expect(patient).toBeVisible()
  await patient.click()
  await page
    .getByRole('option', { name: /Murphy/ })
    .first()
    .click()
  await expect(patient).toHaveValue('Murphy')
  const soap = page.getByPlaceholder('Select a template').first()
  await soap.click()
  await page.getByRole('option', { name: 'Dental Procedure', exact: true }).click()
  await expect(soap).toHaveValue('Dental Procedure')
  await expect(page.getByText('Dental chart', { exact: true })).toBeVisible()
  await expect(page.getByText('Charted from the recording, for dogs and cats.')).toBeVisible()
  await savePageScreenshot(page, item)
})

test('dental charts — suggestion on a recording with a dental exam', async ({ page }) => {
  const item = capture('dental-suggestion')
  await openDentalEncounter(page, item.route, DENTAL.oscarSuggested.patient)
  await expect(
    page.getByText('This recording includes a dental exam. Add a dental chart?'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add dental chart' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('dental charts — Add dental chart from More actions on a cat', async ({ page }) => {
  const item = capture('dental-add-menu')
  await openDentalEncounter(page, item.route, DENTAL.smokeyNoChart.patient)
  await page.getByRole('button', { name: 'More actions' }).click()
  await expect(page.getByRole('menuitem', { name: /Add dental chart/ })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('dental charts — full canine exam with review flags', async ({ page }) => {
  const item = capture('dental-chart-dog')
  await openDentalEncounter(page, item.route, DENTAL.murphy.patient)
  const panel = await openDentalChart(page)
  await expect(panel.getByTestId('dental-chart-header')).toContainText('Draft: not yet confirmed')
  await expect(panel.getByText('Remaining teeth normal')).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Upper right quadrant' })).toBeVisible()
  await scrollToTop(page, panel.getByRole('heading', { name: 'Canine dental chart' }))
  await savePageScreenshot(page, item)
})

test('dental charts — review banner stepping to a speaker-side flag', async ({ page }) => {
  const item = capture('dental-review-banner')
  await openDentalEncounter(page, item.route, DENTAL.bruno.patient)
  const panel = await openDentalChart(page)
  const banner = panel.getByTestId('dental-review-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('1 tooth needs review')
  await expect(banner).toContainText(/speaker/i)
  await scrollToTop(page, panel.getByTestId('dental-chart-header'))
  await savePageScreenshot(page, item)
})

test('dental charts — tooth editor with a quote to play', async ({ page }) => {
  const item = capture('dental-tooth-editor')
  await openDentalEncounter(page, item.route, DENTAL.murphy.patient)
  const panel = await openDentalChart(page)
  const tooth = panel.locator('button[data-tooth="104"]').first()
  await tooth.scrollIntoViewIfNeeded()
  await tooth.click()
  const editor = page.getByRole('dialog', { name: /^104 · / })
  await expect(editor).toBeVisible()
  await expect(editor.getByText(/One of four/)).toBeVisible()
  await expect(editor.getByRole('button', { name: /^Play/ }).first()).toBeVisible()
  await expect(editor.getByRole('checkbox', { name: /Reviewed/ }).first()).toBeVisible()
  await savePageScreenshot(page, item)
})

test('dental charts — feline chart with tooth resorption', async ({ page }) => {
  const item = capture('dental-chart-cat')
  await openDentalEncounter(page, item.route, DENTAL.tigger.patient)
  const panel = await openDentalChart(page)
  await expect(panel.getByRole('heading', { name: 'Feline dental chart' })).toBeVisible()
  await expect(panel.getByText(/resorption/i).first()).toBeAttached()
  await scrollToTop(page, panel.getByRole('heading', { name: 'Feline dental chart' }))
  await savePageScreenshot(page, item)
})

test('dental charts — comparing a dog with its earlier visit', async ({ page }) => {
  const item = capture('dental-compare-dog')
  await openDentalEncounter(page, item.route, DENTAL.pepper.patient)
  const panel = await openDentalChart(page)
  await panel.getByLabel('Compare with').click()
  await page.getByRole('option', { name: /2025/ }).first().click()
  const summary = panel.getByTestId('dental-compare-summary')
  await expect(summary).toBeVisible()
  await scrollToTop(page, panel.getByRole('heading', { name: 'Canine dental chart' }))
  await savePageScreenshot(page, item)
})

test('dental charts — comparing a cat with its earlier visit', async ({ page }) => {
  const item = capture('dental-compare-cat')
  await openDentalEncounter(page, item.route, DENTAL.tigger.patient)
  const panel = await openDentalChart(page)
  await panel.getByLabel('Compare with').click()
  await page.getByRole('option', { name: /2025/ }).first().click()
  await expect(panel.getByTestId('dental-compare-summary')).toBeVisible()
  await scrollToTop(page, panel.getByRole('heading', { name: 'Feline dental chart' }))
  await savePageScreenshot(page, item)
})

test('dental charts — a confirmed chart', async ({ page }) => {
  const item = capture('dental-confirmed')
  await openDentalEncounter(page, item.route, DENTAL.otis.patient)
  const panel = await openDentalChart(page)
  const header = panel.getByTestId('dental-chart-header')
  await expect(header).toContainText('Confirmed')
  await expect(header).toContainText('Dr. Avery Morgan')
  await expect(header.getByRole('button', { name: 'Confirm chart' })).toHaveCount(0)
  await savePageScreenshot(page, item)
})

test('dental charts — Download menu marks a draft', async ({ page }) => {
  const item = capture('dental-download-menu')
  await openDentalEncounter(page, item.route, DENTAL.murphy.patient)
  const panel = await openDentalChart(page)
  await panel.getByTestId('dental-chart-header').getByRole('button', { name: 'Download' }).click()
  await expect(page.getByRole('menuitem', { name: /Download PDF/ })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: /Download image/ })).toBeVisible()
  await expect(page.getByText('Marked "Draft": not yet confirmed').first()).toBeVisible()
  await savePageScreenshot(page, item)
})

test('dental charts — the downloaded image of a draft chart', async ({ page }, testInfo) => {
  const item = capture('dental-export-png')
  await openDentalEncounter(page, item.route, DENTAL.murphy.patient)
  const panel = await openDentalChart(page)
  await panel.getByTestId('dental-chart-header').getByRole('button', { name: 'Download' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: /Download image/ }).click(),
  ])
  const file = testInfo.outputPath('dental-chart.png')
  await download.saveAs(file)
  const png = await fs.readFile(file)
  expect(png.subarray(1, 4).toString('latin1')).toBe('PNG')
  // The product's own export, shown unaltered on the page background so the
  // docs can show what a download looks like. No pixels are drawn over it.
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await page.setContent(
    `<!doctype html><html><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f7f5">` +
      `<img alt="" src="data:image/png;base64,${png.toString('base64')}" style="max-width:1520px;max-height:860px;box-shadow:0 1px 3px rgba(0,0,0,0.08);background:#fff">` +
      `</body></html>`,
  )
  await expect(page.locator('img')).toHaveJSProperty('complete', true)
  await savePageScreenshot(page, item)
  await fs.rm(path.dirname(file), { recursive: true, force: true })
})

test('dental charts — attaching an unconfirmed chart to a discharge', async ({ page }) => {
  const item = capture('dental-discharge-attach')
  await openDentalEncounter(page, item.route, DENTAL.murphy.patient)
  await page.getByRole('tab', { name: 'Discharge Notes', exact: true }).click()
  await page.getByRole('button', { name: 'Send Email' }).click()
  await page.getByRole('menuitem', { name: /Send discharge notes/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Send Discharge Notes' })).toBeVisible()
  const recipient = dialog.getByLabel('To')
  await recipient.fill('murphys.owner@example.test')
  await recipient.press('Enter')
  const attach = dialog.getByTestId('dental-chart-attach')
  await attach.getByRole('checkbox', { name: 'Attach dental chart (PDF)' }).check()
  await expect(attach).toContainText('will be sent marked as a draft')
  await expect(attach).toContainText('still need review')
  await attach.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await savePageScreenshot(page, item)
})

test('dental charts — choosing dog or cat when the patient is neither', async ({ page }) => {
  const item = capture('dental-species-choice')
  await openDentalEncounter(page, item.route, DENTAL.duchessSkipped.patient)
  await page.getByRole('tab', { name: 'Dental Chart', exact: true }).click()
  const panel = page.getByTestId('dental-chart-panel')
  await expect(panel.getByText(/Dental charts are available for dogs and cats only/)).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Chart as dog' })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Chart as cat' })).toBeVisible()
  await savePageScreenshot(page, item)
})
