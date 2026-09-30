// Web tutorial shots. Each shot opens `path`, waits for `ready`, takes the
// ready-state reference, then performs `act`. `reset` runs against the approved
// capture database before the shot; `setup` installs page fixtures before loading.
import { setTimeout as wait } from 'node:timers/promises'
import { expect } from '@playwright/test'
import { installUploadFixture } from './web-upload-fixture.mjs'

export const MOCHI = 'd0c50000-0000-4000-8000-000000000201'
const encounter = (id = MOCHI) => `/encounters/${id}`

export async function openDrawer(page) {
  await page.getByRole('button', { name: 'New Encounter', exact: true }).click()
  const patient = page.getByPlaceholder('Search or type a new name...')
  await expect(patient).toBeVisible()
  await patient.click()
  await page.getByRole('option', { name: /Mochi/ }).click()
  await expect(patient).toHaveValue('Mochi')
  await expect
    .poll(() => page.locator('input').evaluateAll((inputs) => inputs.map((input) => input.value)))
    .toContain('General SOAP Note')
}

async function noteReady(page) {
  await expect(page.getByRole('heading', { name: 'Subjective', exact: true })).toBeVisible({
    timeout: 60000,
  })
  await expect(page.getByText('Accepted', { exact: true })).toHaveCount(0)
  await expect
    .poll(() => page.locator('audio').evaluate((audio) => audio.readyState))
    .toBeGreaterThan(0)
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.duration)).toBe(284)
}

const uploadDisclosure = 'Demo upload · cloud services simulated'

async function recordFor(page, seconds) {
  await page.getByRole('button', { name: 'Record from web', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  await wait(seconds * 1000)
}

export const shots = {
  start: {
    path: '/dashboard',
    ready: async (page) =>
      expect(page.getByText('Mochi', { exact: true }).first()).toBeVisible({ timeout: 60000 }),
    act: (page) => openDrawer(page),
  },
  record: {
    path: '/dashboard',
    resetsNote: true,
    disclosure: 'Demo upload · cloud services simulated',
    setup: (page, ctx) => installUploadFixture(page, ctx.baseURL),
    ready: (page) => openDrawer(page),
    act: async (page) => {
      await page.getByRole('button', { name: 'Record from web', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
      await wait(2000)
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
      await wait(800)
      await page.getByRole('button', { name: 'Resume', exact: true }).click()
      await wait(800)
      await page.getByRole('button', { name: 'Stop', exact: true }).click()
      await expect(page.getByRole('button', { name: /Process 1 file/ })).toBeEnabled()
      await wait(1200)
      await page.getByRole('button', { name: /Process 1 file/ }).click()
      await expect(page.getByText('Upload Complete', { exact: true })).toBeVisible({
        timeout: 30000,
      })
    },
  },
  process: {
    path: encounter('d0c50000-0000-4000-8000-000000000203'),
    resetsNote: true,
    ready: (page) =>
      expect(page.getByRole('button', { name: 'View Encounters', exact: true })).toBeVisible({
        timeout: 60000,
      }),
    act: async (page) => {
      await wait(3000)
      await page.getByRole('button', { name: 'View Encounters', exact: true }).click()
      await expect(page.getByText('Mochi', { exact: true }).first()).toBeVisible({
        timeout: 30000,
      })
    },
  },
  review: {
    path: encounter(),
    resetsNote: true,
    disclosure: 'Example draft',
    ready: noteReady,
    act: async (page, ctx) => {
      await wait(3500)
      const citation = page.locator('[title$="click to jump"]').first()
      await citation.hover()
      await wait(1200)
      await citation.click()
      await expect
        .poll(() => page.locator('audio').evaluate((audio) => audio.currentTime))
        .toBeGreaterThanOrEqual(ctx.citationTime)
      await expect(page.locator('.ts-active')).toContainText('Weight 4.6 kg')
      await wait(1500)
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
    },
  },
  edit: {
    path: encounter(),
    resetsNote: true,
    disclosure: 'Example draft',
    ready: noteReady,
    act: async (page) => {
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      const editor = page.locator('#soap-note-markdown-editor')
      await expect(editor).toBeVisible()
      const original = await editor.inputValue()
      if (!original.includes('current diet')) throw Error('Expected original fixture wording')
      await wait(1000)
      await editor.fill(original.replace('current diet', 'usual diet'))
      await wait(2000)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(editor).toBeHidden()
      await expect(page.getByText(/Continue the usual diet/)).toBeVisible()
      await page.getByText(/Continue the usual diet/).scrollIntoViewIfNeeded()
      await wait(1500)
      await page.getByRole('button', { name: 'Complete', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible()
    },
  },
  send: {
    path: encounter(),
    disclosure: 'Example draft',
    ready: noteReady,
    act: async (page) => {
      await page.getByRole('tab', { name: 'Discharge Notes', exact: true }).click()
      await wait(3000)
      await page.getByRole('button', { name: 'Send Email', exact: true }).click()
      await page.getByRole('menuitem', { name: /Send discharge notes/ }).click()
      const dialog = page.getByRole('dialog')
      await expect(
        dialog.getByRole('heading', { name: 'Send Discharge Summary', exact: true }),
      ).toBeVisible()
      const recipient = dialog.getByLabel('To', { exact: true })
      await recipient.fill('jamie.chen@example.test')
      await recipient.press('Enter')
      await expect(dialog.getByText('jamie.chen@example.test', { exact: true })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Send', exact: true })).toBeEnabled()
      await wait(1500)
      await dialog.getByRole('button', { name: 'Change', exact: true }).click()
      await page.getByTestId('from-route-option-noreply').getByRole('radio').check()
      await expect(dialog.getByTestId('from-route-resting-address')).toHaveText(
        'noreply@mail.noctune.ai',
      )
    },
  },
  // Paced for the Record and recover narration: introduction, open the drawer,
  // record/pause/resume/stop, then process.
  'record-paced': {
    path: '/dashboard',
    disclosure: uploadDisclosure,
    setup: (page, ctx) => installUploadFixture(page, ctx.baseURL),
    ready: async (page) =>
      expect(page.getByText('Mochi', { exact: true }).first()).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(4000)
      await openDrawer(page)
      await wait(1500)
      await page.getByRole('button', { name: 'Record from web', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
      await wait(1300)
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
      await wait(1000)
      await page.getByRole('button', { name: 'Resume', exact: true }).click()
      await wait(900)
      await page.getByRole('button', { name: 'Stop', exact: true }).click()
      await expect(page.getByRole('button', { name: /Process 1 file/ })).toBeEnabled()
      await wait(2000)
      await page.getByRole('button', { name: /Process 1 file/ }).click()
      await expect(page.getByText('Upload Complete', { exact: true })).toBeVisible({
        timeout: 30000,
      })
    },
  },
  'upload-file': {
    path: '/dashboard',
    disclosure: uploadDisclosure,
    setup: (page, ctx) => installUploadFixture(page, ctx.baseURL),
    ready: (page) => openDrawer(page),
    act: async (page, ctx) => {
      await wait(2000)
      await page.getByText('browse files', { exact: true }).hover()
      await wait(800)
      await page.locator('input[type="file"]').setInputFiles({
        name: 'mochi-recheck.wav',
        mimeType: 'audio/wav',
        buffer: ctx.uploadAudio,
      })
      await expect(page.getByText(/ready to process/)).toBeVisible()
      await wait(5500)
      await page.getByRole('button', { name: /Process 1 file/ }).click()
      await expect(page.getByText('Upload Complete', { exact: true })).toBeVisible({
        timeout: 30000,
      })
    },
  },
  'upload-retry': {
    path: '/dashboard',
    disclosure: 'Demo upload · failure and cloud services simulated',
    setup: (page, ctx) => installUploadFixture(page, ctx.baseURL, { failFirstUpload: true }),
    ready: (page) => openDrawer(page),
    act: async (page) => {
      await recordFor(page, 3)
      await page.getByRole('button', { name: 'Stop', exact: true }).click()
      await expect(page.getByRole('button', { name: /Process 1 file/ })).toBeEnabled()
      await wait(1000)
      await page.getByRole('button', { name: /Process 1 file/ }).click()
      // The queued take stays in the drawer with retry guidance (Core PR #836).
      await expect(page.getByText(/The upload didn't finish/).last()).toBeVisible({
        timeout: 30000,
      })
      await wait(3500)
      // Depending on timing the progress modal also offers Retry; use whichever
      // retry control is on screen.
      const retry = page.getByRole('dialog').getByRole('button', { name: 'Retry', exact: true })
      if (await retry.isVisible()) await retry.click()
      else await page.getByRole('button', { name: /Process 1 file/ }).click()
      await expect(page.getByText('Upload Complete', { exact: true })).toBeVisible({
        timeout: 30000,
      })
    },
  },
  recover: {
    path: '/dashboard',
    duration: 40,
    disclosure: 'Tab reload and upload failure simulated',
    setup: (page, ctx) => installUploadFixture(page, ctx.baseURL, { failFirstUpload: true }),
    ready: (page) => openDrawer(page),
    act: async (page) => {
      await recordFor(page, 4)
      // An interrupted tab: reload without stopping. IndexedDB keeps the take.
      page.once('dialog', (dialog) => void dialog.accept())
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
      const dialog = page.getByRole('dialog', { name: /Recover recordings/ })
      await expect(dialog).toBeVisible({ timeout: 30000 })
      await expect(dialog.getByText('Mochi')).toBeVisible()
      await wait(5500)
      await dialog.getByRole('button', { name: /Recover & upload/ }).click()
      await expect(dialog.getByRole('button', { name: /Retry upload/ })).toBeVisible({
        timeout: 30000,
      })
      await wait(2500)
      await dialog.getByRole('button', { name: /Retry upload/ }).click()
      await expect(dialog.getByText('Uploaded')).toBeVisible({ timeout: 30000 })
      await wait(2000)
      await dialog.getByRole('button', { name: /Done/ }).click()
    },
  },
  'follow-up': {
    path: '/messages',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Messages', exact: true })).toBeVisible()
      await expect(page.getByTestId('conversation-subject')).toHaveText(
        'Mochi is eating normally again',
        { timeout: 60000 },
      )
      const tip = page.getByRole('button', { name: 'Got it', exact: true })
      if (await tip.isVisible()) await tip.click()
    },
    act: async (page) => {
      await expect(page.getByTestId('conversation-subject')).toHaveText(
        'Mochi is eating normally again',
      )
      const reply = page.getByRole('button', { name: 'Reply', exact: true })
      if (await reply.count()) await reply.first().click()
    },
  },
}
