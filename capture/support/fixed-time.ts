import type { Page } from '@playwright/test'

const DEFAULT_CAPTURE_NOW = '2026-07-15T17:00:00.000Z'

export async function setFixedCaptureTime(page: Page): Promise<void> {
  const value = process.env.DOCS_CAPTURE_NOW || DEFAULT_CAPTURE_NOW
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`DOCS_CAPTURE_NOW must be an ISO date; received ${value}`)
  }

  await page.clock.setFixedTime(date)
}
