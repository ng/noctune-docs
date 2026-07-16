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

export async function savePageScreenshot(page: Page, capture: CaptureOutput): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
  })

  const png = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: false,
    scale: 'css',
    style: STABLE_CAPTURE_CSS,
    type: 'png',
  })

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

  const result = await sharp(png)
    .resize({ width: capture.maxWidth ?? imagePolicy.viewport.width, withoutEnlargement: true })
    .removeAlpha()
    .toColourspace('srgb')
    .webp({
      effort: imagePolicy.encoding.effort,
      quality: imagePolicy.encoding.quality,
      smartSubsample: imagePolicy.encoding.smartSubsample,
    })
    .toFile(outputPath)

  console.log(`[screenshots] ${capture.id}: ${result.width}x${result.height}, ${result.size} bytes`)
}
