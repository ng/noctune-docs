import type { Page } from '@playwright/test'

const DEFAULT_CAPTURE_NOW = '2026-07-15T17:00:00.000Z'
const ISO_TIMESTAMP_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

/** Freezes Playwright's clock at a timezone-qualified deterministic instant. */
export async function setFixedCaptureTime(page: Page): Promise<void> {
  const value = process.env.DOCS_CAPTURE_NOW || DEFAULT_CAPTURE_NOW
  const date = new Date(value)

  if (!ISO_TIMESTAMP_WITH_TIMEZONE.test(value) || Number.isNaN(date.getTime())) {
    throw new Error(
      `DOCS_CAPTURE_NOW must be an ISO-8601 timestamp with Z or a UTC offset; received ${value}`,
    )
  }

  await page.clock.setFixedTime(date)
}
