import type { Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

import imagePolicy from '../image-policy.json'

const STABLE_CAPTURE_CSS = `
  *, *::before, *::after {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    caret-color: transparent !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
  }
  html {
    scrollbar-width: none !important;
  }
  ::-webkit-scrollbar {
    display: none !important;
  }
  nextjs-portal {
    display: none !important;
  }
`

interface CaptureOutput {
  id: string
  output: string
  maxWidth?: number
}

const SCREENSHOT_OPTIONS = {
  animations: 'disabled',
  caret: 'hide',
  fullPage: false,
  omitBackground: false,
  scale: 'css',
  type: 'png',
} as const

/** Captures, policy-transforms, and writes one deterministic product screenshot. */
export async function savePageScreenshot(page: Page, capture: CaptureOutput): Promise<void> {
  await stabilizePageVisuals(page)
  await page.evaluate(async () => {
    await document.fonts.ready
  })

  const png = await takeStableScreenshot(page)

  const outputRoot = process.env.CAPTURE_OUTPUT_ROOT
    ? path.resolve(process.env.CAPTURE_OUTPUT_ROOT)
    : process.cwd()
  const outputPath = path.resolve(outputRoot, capture.output)

  if (!outputPath.startsWith(`${outputRoot}${path.sep}`)) {
    throw new Error(`Capture output must stay within its output root: ${capture.output}`)
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  if (imagePolicy.encoding.format !== 'webp') {
    throw new Error(`Unsupported screenshot format: ${imagePolicy.encoding.format}`)
  }
  if (imagePolicy.output.channels !== 3 && imagePolicy.output.channels !== 4) {
    throw new Error(`Unsupported screenshot channel count: ${imagePolicy.output.channels}`)
  }
  if (!imagePolicy.output.allowAlpha && imagePolicy.output.channels === 4) {
    throw new Error('Screenshot policy cannot require four channels while disallowing alpha')
  }

  let pipeline = sharp(png).resize({
    width: capture.maxWidth ?? imagePolicy.viewport.width,
    withoutEnlargement: true,
  })

  pipeline =
    imagePolicy.output.channels === 3
      ? pipeline.flatten({ background: imagePolicy.output.background })
      : pipeline.ensureAlpha()
  pipeline = pipeline.toColourspace(imagePolicy.output.colorSpace)

  if (imagePolicy.output.allowEmbeddedMetadata) {
    pipeline = pipeline.keepMetadata()
  }

  const result = await pipeline
    .webp({
      effort: imagePolicy.encoding.effort,
      quality: imagePolicy.encoding.quality,
      smartSubsample: imagePolicy.encoding.smartSubsample,
    })
    .toFile(outputPath)

  console.log(`[screenshots] ${capture.id}: ${result.width}x${result.height}, ${result.size} bytes`)
}

/** Disables visual motion and completes animations before stability polling. */
async function stabilizePageVisuals(page: Page): Promise<void> {
  await page.addStyleTag({ content: STABLE_CAPTURE_CSS })
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    for (const animation of document.getAnimations()) {
      try {
        animation.finish()
      } catch {
        animation.cancel()
      }
    }
  })
}

/** Polls until two consecutive Playwright PNG captures are byte-identical. */
async function takeStableScreenshot(page: Page): Promise<Buffer> {
  const delays = [0, 100, 250, 500, 1_000, 2_000, 3_000]
  let previous: Buffer | undefined

  for (const delay of delays) {
    if (delay) {
      await page.waitForTimeout(delay)
    }
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        }),
    )

    const current = await page.screenshot(SCREENSHOT_OPTIONS)
    if (previous?.equals(current)) {
      return current
    }
    previous = current
  }

  throw new Error('Page did not produce two consecutive identical screenshots')
}
