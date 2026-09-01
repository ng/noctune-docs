import { expect, test, type Page } from '@playwright/test'

import manifest from './manifest.json'
import { setFixedCaptureTime } from './support/fixed-time'
import { savePageScreenshot } from './support/save-screenshot'

const IDS = {
  captureUser: 'd0c50000-0000-4000-8000-000000000001',
  mochiEncounter: 'd0c50000-0000-4000-8000-000000000201',
  mochiSoapNote: 'd0c50000-0000-4000-8000-000000000301',
} as const

/** Returns a required manifest entry by capture ID. */
function requireCapture(id: string) {
  const capture = manifest.find((item) => item.id === id)
  if (!capture) throw new Error(`Capture manifest is missing ${id}`)
  return capture
}

const captures = Object.fromEntries(manifest.map((item) => [item.id, item]))

/** Returns a required capture from the pre-indexed manifest. */
function capture(id: string) {
  const item = captures[id]
  if (!item) throw new Error(`Capture manifest is missing ${id}`)
  return item
}

/** Replaces signed encounter audio with a deterministic silent WAV response. */
async function mockSignedAudio(page: Page): Promise<void> {
  await page.route(/\.m4a(?:\?.*)?$/i, async (route) => {
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWave() })
  })
}

/** Keeps the capture user's first-run checklist visible without blocking dashboard captures. */
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

/** Builds a valid one-second silent WAV buffer for mocked audio requests. */
function silentWave(): Buffer {
  const sampleRate = 8_000
  const sampleCount = sampleRate
  const dataBytes = sampleCount * 2
  const wave = Buffer.alloc(44 + dataBytes)
  wave.write('RIFF', 0)
  wave.writeUInt32LE(36 + dataBytes, 4)
  wave.write('WAVE', 8)
  wave.write('fmt ', 12)
  wave.writeUInt32LE(16, 16)
  wave.writeUInt16LE(1, 20)
  wave.writeUInt16LE(1, 22)
  wave.writeUInt32LE(sampleRate, 24)
  wave.writeUInt32LE(sampleRate * 2, 28)
  wave.writeUInt16LE(2, 32)
  wave.writeUInt16LE(16, 34)
  wave.write('data', 36)
  wave.writeUInt32LE(dataBytes, 40)
  return wave
}

/** Opens an authenticated product route after installing deterministic browser state. */
async function openProductPage(page: Page, route: string): Promise<void> {
  await setFixedCaptureTime(page)
  await mockSignedAudio(page)
  await mockAnsweredOnboardingPrompt(page)
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'New Encounter' })).toBeVisible()
}

/** Opens the seeded dashboard and waits for its fixture-backed content. */
async function openPopulatedDashboard(page: Page, route: string): Promise<void> {
  await openProductPage(page, route)
  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/)
  await expect(page.getByText('Encounters', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Mochi', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Jamie Chen', { exact: true })).toBeVisible()
  await expect(page.getByText('Mochi is eating normally again', { exact: true })).toBeVisible()
  await expect(page.getByText('Your work', { exact: true })).toBeVisible()
  await expect(page.getByText('July 2026', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Start an encounter')).toBeVisible()
}

/** Opens the New Encounter drawer from its manifest-defined dashboard route. */
async function openEncounterDrawer(page: Page, route: string): Promise<void> {
  await openPopulatedDashboard(page, route)
  await page.getByLabel('Start an encounter').click()
  await expect(page.getByText('New encounter', { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('Search or type a new name...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record from web' })).toBeVisible()
}

/** Selects the seeded Mochi patient in the New Encounter drawer. */
async function selectMochi(page: Page): Promise<void> {
  const patientSelector = page.getByPlaceholder('Search or type a new name...')
  await patientSelector.click()
  await page.getByRole('option', { name: /Mochi/ }).click()
  await expect(patientSelector).toHaveValue('Mochi')
}

/** Opens Mochi's manifest-defined encounter and waits for generated content. */
async function openMochiEncounter(page: Page, route: string): Promise<void> {
  await openProductPage(page, route)
  await expect(page.getByText('Mochi', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeEnabled()
  await expect(page.getByRole('tab', { name: 'Transcript' })).toBeVisible()
  await expect(page.getByText(/Mochi is here for her appetite recheck/)).toBeVisible()
}

/** Mocks Mochi's encounter into a deterministic ready-for-review state. */
async function mockMochiReadyForReview(page: Page): Promise<void> {
  await page.route(`**/api/v1/transcriptions/${IDS.mochiEncounter}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    const response = await route.fetch()
    const payload = (await response.json()) as {
      ok?: boolean
      data?: Record<string, unknown>
    }

    if (!payload.ok || !payload.data) {
      throw new Error('Could not prepare the Mochi encounter for the ready-review capture')
    }

    await route.fulfill({
      response,
      contentType: 'application/json',
      body: JSON.stringify({
        ...payload,
        data: {
          ...payload.data,
          finishedAt: null,
          finishedBy: null,
          finishMethod: null,
        },
      }),
    })
  })

  await page.route(
    `**/api/v1/transcriptions/${IDS.mochiEncounter}/soap-notes/${IDS.mochiSoapNote}`,
    async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }

      const response = await route.fetch()
      const payload = (await response.json()) as {
        ok?: boolean
        data?: Record<string, unknown>
      }

      if (!payload.ok || !payload.data) {
        throw new Error('Could not prepare deterministic discharge notes for the Mochi encounter')
      }

      await route.fulfill({
        response,
        contentType: 'application/json',
        body: JSON.stringify({
          ...payload,
          data: {
            ...payload.data,
            dischargeMarkdown:
              'Mochi’s examination was reassuring today. Continue her current diet, monitor appetite and energy, and contact Northstar Veterinary Clinic if vomiting returns or her appetite decreases.',
          },
        }),
      })
    },
  )

  await page.route(`**/api/v1/encounters/${IDS.mochiEncounter}/finish`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          finishedAt: '2026-07-15T17:00:00.000Z',
          finishedBy: IDS.captureUser,
          finishMethod: 'explicit',
          wasFirstFinish: false,
          totalFinished: 8,
          milestoneCrossed: null,
        },
      }),
    })
  })
}

/** Orders tied practice-member fixtures before the product page consumes them. */
async function mockDeterministicPracticeMembers(page: Page): Promise<void> {
  const roleOrder = new Map([
    ['owner', 0],
    ['veterinarian', 1],
    ['technician', 2],
    ['receptionist', 3],
  ])

  await page.route('**/api/v1/practices/*/members', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    const response = await route.fetch()
    const payload = (await response.json()) as {
      ok?: boolean
      data?: Array<{ role?: string; userName?: string }>
    }

    if (!payload.ok || !payload.data) {
      throw new Error('Could not prepare deterministic practice members')
    }

    payload.data.sort((left, right) => {
      const leftRank = roleOrder.get(left.role ?? '') ?? Number.MAX_SAFE_INTEGER
      const rightRank = roleOrder.get(right.role ?? '') ?? Number.MAX_SAFE_INTEGER
      return (
        leftRank - rightRank || (left.userName ?? '').localeCompare(right.userName ?? '', 'en-US')
      )
    })

    await route.fulfill({
      response,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

/** Pins the sidebar's unread-message badge without changing inbox fixture rows. */
async function mockUnreadMessagesCount(page: Page, totalCount: number): Promise<void> {
  await page.route('**/api/v1/messages/inbox?*', async (route) => {
    const requestUrl = new URL(route.request().url())
    const isCountRequest =
      route.request().method() === 'GET' &&
      requestUrl.searchParams.get('limit') === '0' &&
      requestUrl.searchParams.get('unread') === 'true'

    if (!isCountRequest) {
      await route.continue()
      return
    }

    const response = await route.fetch()
    const payload = (await response.json()) as {
      ok?: boolean
      data?: {
        pagination?: Record<string, unknown>
      }
    }

    if (!payload.ok || !payload.data?.pagination) {
      throw new Error('Could not prepare deterministic unread-message count')
    }

    await route.fulfill({
      response,
      contentType: 'application/json',
      body: JSON.stringify({
        ...payload,
        data: {
          ...payload.data,
          pagination: {
            ...payload.data.pagination,
            totalCount,
          },
        },
      }),
    })
  })
}

test('dashboard — populated overview', async ({ page }) => {
  const item = requireCapture('dashboard-overview')
  await openPopulatedDashboard(page, item.route)
  await savePageScreenshot(page, item)
})

test('encounters — status filters and deterministic list', async ({ page }) => {
  const item = capture('encounters-list')
  await openProductPage(page, item.route)
  await expect(page.getByRole('heading', { name: 'Encounters' })).toBeVisible()
  await expect(page.getByText('6 encounters', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Needs review/ })).toBeVisible()
  await expect(page.getByText('Jasper', { exact: true })).toBeVisible()
  await expect(page.getByText('luna-wellness.m4a', { exact: true })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('encounters — New Encounter drawer', async ({ page }) => {
  const item = capture('encounters-new-encounter')
  await openEncounterDrawer(page, item.route)
  await expect(page.getByText('Unlimited', { exact: true })).toBeVisible()
  await expect(page.getByText('Pro', { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('Select a template')).toHaveCount(2)
  await savePageScreenshot(page, item)
})

test('encounters — active browser recording', async ({ page }) => {
  const item = capture('encounters-browser-recording')
  await openEncounterDrawer(page, item.route)
  await selectMochi(page)
  await page.getByRole('button', { name: 'Record from web' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect(page.getByLabel('Discard recording')).toBeVisible()
  await savePageScreenshot(page, item)
  await page.getByLabel('Discard recording').click()
})

test('encounters — selected file queue', async ({ page }) => {
  const item = capture('encounters-upload-queue')
  await openEncounterDrawer(page, item.route)
  await selectMochi(page)
  await page.locator('input[type="file"][accept]').setInputFiles({
    name: 'exam-room-follow-up.m4a',
    mimeType: 'audio/mp4',
    buffer: Buffer.alloc(32_768, 1),
  })
  await expect(page.getByText('exam-room-follow-up.m4a', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Process 1 file' })).toBeEnabled()
  await savePageScreenshot(page, item)
})

test('encounters — processing after upload', async ({ page }) => {
  const item = capture('encounters-processing')
  await openProductPage(page, item.route)
  await expect(page.getByRole('heading', { name: 'Transcribing Your Recording' })).toBeVisible()
  await expect(page.getByText('Transcribing', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Upload Another' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View Encounters' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('encounters — SOAP and transcript overview', async ({ page }) => {
  const item = capture('encounters-overview')
  await openMochiEncounter(page, item.route)
  await expect(page.getByText('Subjective', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Pet owner', { exact: true }).first()).toBeVisible()
  await savePageScreenshot(page, item)
})

test('encounters — markdown SOAP editor', async ({ page }) => {
  const item = capture('encounters-soap-edit')
  await openMochiEncounter(page, item.route)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.locator('#soap-note-markdown-editor')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('encounters — distraction-free full screen', async ({ page }) => {
  const item = capture('encounters-fullscreen')
  await openMochiEncounter(page, item.route)
  await page.getByRole('button', { name: 'Full screen' }).click()
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('tab', { name: 'SOAP', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Transcript', exact: true })).toBeHidden()
  await savePageScreenshot(page, item)
})

test('encounters — regenerate template picker', async ({ page }) => {
  const item = capture('encounters-regenerate')
  await openMochiEncounter(page, item.route)
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Regenerate Note' })).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: 'Northstar Wellness SOAP', exact: true }),
  ).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Regenerate' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('encounters — prior-visit context', async ({ page }) => {
  const item = capture('encounters-history')
  await openMochiEncounter(page, item.route)
  await page.getByRole('tab', { name: /Past Encounters/ }).click()
  await expect(page.getByPlaceholder('e.g. bloodwork, medications, weight')).toBeVisible()
  await expect(page.getByText(/Annual wellness examination with stable weight/)).toBeVisible()
  await expect(page.getByText(/Healthy new-patient examination/)).toBeVisible()
  await savePageScreenshot(page, item)
})

test('sentinel — encounter safety alert and retained markers', async ({ page }) => {
  const item = capture('encounters-sentinel-alert')
  await openProductPage(page, item.route)
  await expect(page.getByText('Jasper', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/Noctune Sentinel/)).toBeVisible()
  await expect(page.getByText(/declining a recommended recheck/).first()).toBeVisible()
  await expect(page.getByText(/This encounter is preserved for you/)).toBeVisible()
  await savePageScreenshot(page, item)
})

test('encounters — complete and prepare discharge', async ({ page }) => {
  const completedItem = capture('encounters-completed')
  const dischargeItem = capture('encounters-send-discharge')

  await mockMochiReadyForReview(page)
  await openMochiEncounter(page, completedItem.route)

  const completeButton = page.getByRole('button', { name: 'Complete', exact: true })
  await expect(completeButton).toBeEnabled()
  await completeButton.click()
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible()
  await savePageScreenshot(page, completedItem)

  await page.getByRole('button', { name: 'Send Email' }).click()
  await page.getByRole('menuitem', { name: /Send discharge notes/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('heading', { name: 'Send Discharge Summary', exact: true }),
  ).toBeVisible()
  const recipient = dialog.getByLabel('To')
  await recipient.fill('jamie.chen@example.test')
  await recipient.press('Enter')
  await expect(dialog.getByText('jamie.chen@example.test', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Send', exact: true })).toBeEnabled()
  await savePageScreenshot(page, dischargeItem)
})

test('patients — searchable patient list', async ({ page }) => {
  const item = capture('patients-list')
  await openProductPage(page, item.route)
  await expect(page.getByRole('heading', { name: 'Patient Records' })).toBeVisible()
  await expect(page.getByText('Showing 5 of 5 patients', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View patient Jasper' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('patients — Add Patient dialog', async ({ page }) => {
  const item = capture('patients-add')
  await openProductPage(page, item.route)
  await page.getByRole('button', { name: 'Add Patient' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Add Patient' })).toBeVisible()
  await dialog.getByLabel('Patient Name').fill('Poppy')
  await expect(dialog.getByRole('button', { name: 'Add Patient' })).toBeEnabled()
  await savePageScreenshot(page, item)
})

test('patients — profile with vitals trends', async ({ page }) => {
  const item = capture('patients-profile')
  await openProductPage(page, item.route)
  await expect(page.getByText('Vitals Trends', { exact: true })).toBeVisible()
  await expect(page.getByText('Encounter History', { exact: true })).toBeAttached()
  await expect(page.getByText('4.6', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Email owner' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('templates — markdown editor and preview', async ({ page }) => {
  const item = capture('templates-editor')
  await openProductPage(page, item.route)
  await expect(page.getByText('Northstar Wellness SOAP', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Preview' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('templates — custom-template dialog', async ({ page }) => {
  const item = capture('templates-new')
  await openProductPage(page, item.route)
  await expect(page.getByText('Northstar Wellness SOAP', { exact: true }).first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'New Template' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Create a custom template' })).toBeVisible()
  await dialog.getByLabel('Template name').fill('Senior Wellness SOAP')
  await expect(dialog.getByText(/Start from an existing template/)).toBeVisible()
  await savePageScreenshot(page, item)
})

test('templates — custom discharge-template dialog', async ({ page }) => {
  const item = capture('templates-new-discharge')
  await openProductPage(page, item.route)
  const dischargeTab = page.getByRole('tab', { name: 'Discharge Templates' })
  await expect(dischargeTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByPlaceholder('Search templates...')).toHaveValue('General Discharge')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'New Template' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Create a custom template' })).toBeVisible()
  await dialog.getByLabel('Template name').fill('Client Home-Care Instructions')
  await expect(dialog.getByRole('combobox', { name: 'Base template' })).toHaveValue(
    'General Discharge',
  )
  await savePageScreenshot(page, item)
})

/** Synthetic combined template — clinical sections plus client-facing home care. */
const IMPORT_PASTE = [
  'Subjective:',
  'Presenting concern and history as the owner reports it, including appetite, energy, and any changes at home.',
  '',
  'Objective:',
  'Physical exam findings, weight, temperature, heart rate, and respiratory rate as measured during the visit.',
  '',
  'Assessment:',
  'Working assessment for each problem discussed during the visit.',
  '',
  'Plan:',
  'Diagnostics, treatments, and medications discussed, with follow-up timing.',
  '',
  'Home Care Instructions:',
  'Give all medications exactly as labeled. Keep activity light for the next few days and offer small meals.',
  'Please call the clinic if your pet stops eating, seems painful, or is not improving.',
].join('\n')

const IMPORT_PRIMARY_CONTENT = IMPORT_PASTE.split('\n\nHome Care Instructions:')[0]
const IMPORT_DISCHARGE_CONTENT =
  'Home Care Instructions:\nGive all medications exactly as labeled. Keep activity light for the next few days and offer small meals.\nPlease call the clinic if your pet stops eating, seems painful, or is not improving.'
const IMPORT_DISCHARGE_DRAFT_ID = 'd0c50000-0000-4000-8000-000000000402'
const IMPORT_CREATED_TEMPLATE_ID = 'd0c50000-0000-4000-8000-000000000714'

/** Answers the split analysis with a deterministic discharge proposal. */
async function mockTemplateImportAnalyze(page: Page): Promise<void> {
  await page.route('**/api/v1/soap-templates/import/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          analysisReceipt: 'docs-capture-receipt',
          sourceHash: 'docs-capture-source-hash',
          classification: 'combined',
          confidence: 0.92,
          artifacts: [
            {
              draftId: 'd0c50000-0000-4000-8000-000000000401',
              kind: 'soap',
              name: 'From My Previous Scribe — SOAP',
              content: IMPORT_PRIMARY_CONTENT,
              sourceBlockIds: ['b1', 'b2', 'b3', 'b4'],
              confidence: 0.92,
              rationale: null,
              warnings: [],
            },
            {
              draftId: IMPORT_DISCHARGE_DRAFT_ID,
              kind: 'discharge',
              name: 'From My Previous Scribe — Home Care',
              content: IMPORT_DISCHARGE_CONTENT,
              sourceBlockIds: ['b5'],
              confidence: 0.9,
              rationale:
                "This content is written to the pet's owner, not for your clinical note — it can become a discharge template of its own.",
              warnings: [],
            },
          ],
          literatureCandidates: [],
          unassignedBlocks: [],
          model: { provider: 'docs', model: 'capture', promptVersion: 'docs-capture' },
        },
      }),
    })
  })
}

/** Creates the accepted split-out discharge draft without mutating the capture database. */
async function mockTemplateImportCreate(page: Page): Promise<void> {
  await page.route('**/api/v1/soap-templates/import/create', async (route) => {
    const request = route.request().postDataJSON() as {
      sourceContent: string
      artifacts: Array<{ id: string; purpose: string; name: string; content: string }>
    }
    expect(request.sourceContent).toBe(IMPORT_PASTE)
    expect(request.artifacts).toEqual([
      {
        id: IMPORT_DISCHARGE_DRAFT_ID,
        purpose: 'discharge',
        name: 'From My Previous Scribe — Home Care',
        content: IMPORT_DISCHARGE_CONTENT,
      },
    ])

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          templates: [
            {
              id: IMPORT_CREATED_TEMPLATE_ID,
              purpose: 'discharge',
              name: 'From My Previous Scribe — Home Care',
              detailUrl: `/templates/discharge/${IMPORT_CREATED_TEMPLATE_ID}`,
            },
          ],
        },
      }),
    })
  })
}

/** Opens the create dialog with the import origin selected and the sample pasted. */
async function openImportDialog(page: Page, route: string): Promise<void> {
  await openProductPage(page, route)
  await expect(page.getByText('Northstar Wellness SOAP', { exact: true }).first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'New Template' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Create a custom template' })).toBeVisible()
  await dialog.getByLabel('Template name').fill('From My Previous Scribe')
  await dialog.getByRole('combobox', { name: 'Base template' }).click()
  await page.getByRole('option', { name: 'Import existing template' }).click()
  await dialog.getByLabel('Paste your template').fill(IMPORT_PASTE)
}

/** Organizes the synthetic paste and waits for its split proposal in Review. */
async function openAnalyzedImport(page: Page, route: string): Promise<void> {
  await mockTemplateImportAnalyze(page)
  await openImportDialog(page, route)
  await page.getByRole('dialog').getByRole('button', { name: 'Organize this' }).click()

  await expect(page.getByRole('tab', { name: /Review/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Also found in this paste · 1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create discharge template' })).toBeVisible()
}

test('templates — import existing template paste', async ({ page }) => {
  const item = capture('templates-import-paste')
  await openImportDialog(page, item.route)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Organize this' })).toBeEnabled()
  await expect(dialog.getByRole('link', { name: 'See how it works' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('templates — import proposals in the Review panel', async ({ page }) => {
  const item = capture('templates-import-proposals')
  await openAnalyzedImport(page, item.route)
  await expect(page.getByRole('link', { name: 'How this works' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('templates — accepted import proposal receipt', async ({ page }) => {
  const item = capture('templates-import-created')
  await mockTemplateImportCreate(page)
  await openAnalyzedImport(page, item.route)

  await page.getByRole('button', { name: 'Create discharge template' }).click()
  await expect(page.locator('#template-content-editor')).toHaveValue(IMPORT_PRIMARY_CONTENT)
  await expect(page.getByRole('button', { name: 'Create discharge template' })).toBeHidden()
  await expect(page.getByRole('link', { name: 'open it' })).toHaveAttribute(
    'href',
    `/templates/discharge/${IMPORT_CREATED_TEMPLATE_ID}`,
  )
  await expect(page.getByRole('button', { name: 'undo', exact: true })).toBeEnabled()
  await savePageScreenshot(page, item)
})

const TEMPLATE_REVIEW_SUGGESTIONS = [
  {
    severity: 'warning',
    category: 'instruction',
    location: 'Objective',
    message: 'Make the evidence boundary explicit.',
    fix: 'Tell the model not to infer findings that were not stated.',
    original: 'Record only findings and measurements explicitly stated in the encounter.',
    replacement:
      'Record only findings and measurements explicitly stated in the encounter; do not infer unstated findings.',
    occurrence: 1,
  },
  {
    severity: 'info',
    category: 'best_practice',
    location: 'Plan',
    message: 'Call out follow-up timing.',
    fix: 'Keep follow-up timing tied to what was discussed.',
    original: 'Capture diagnostics, treatment, preventive recommendations, and follow-up timing.',
    replacement:
      'Capture diagnostics, treatment, preventive recommendations, and the follow-up timing discussed during the visit.',
    occurrence: 1,
  },
] as const

/** Returns occurrence-safe review suggestions and a correction of the exact submitted content. */
async function mockTemplateReview(page: Page): Promise<void> {
  await page.route('**/api/v1/soap-templates/review', async (route) => {
    const request = route.request().postDataJSON() as { content: string }
    for (const suggestion of TEMPLATE_REVIEW_SUGGESTIONS) {
      expect(request.content).toContain(suggestion.original)
    }
    const correctedContent = TEMPLATE_REVIEW_SUGGESTIONS.reduce(
      (content, suggestion) => content.replace(suggestion.original, suggestion.replacement),
      request.content,
    )

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          score: 8,
          summary:
            'The template has a clear SOAP structure. Two small instruction changes would make the generated note more evidence-focused.',
          correctedContent,
          suggestions: TEMPLATE_REVIEW_SUGGESTIONS,
        },
      }),
    })
  })
}

/** Opens the seeded SOAP template and runs its deterministic quality review. */
async function openTemplateReview(page: Page, route: string): Promise<void> {
  await mockTemplateReview(page)
  await openProductPage(page, route)
  await expect(page.getByText('Northstar Wellness SOAP', { exact: true }).first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  const reviewTab = page.getByRole('tab', { name: 'Review', exact: true })
  await reviewTab.click()
  await expect(reviewTab).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: 'Review Template' }).click()
  await expect(page.getByText('2 suggestions')).toBeVisible()
  await expect(page.getByText(/clear SOAP structure/)).toBeVisible()
  await expect(page.getByText('Objective', { exact: true })).toBeVisible()
}

test('templates — deterministic quality review', async ({ page }) => {
  const item = capture('templates-review')
  await openTemplateReview(page, item.route)

  await expect(page.getByRole('button', { name: 'Fix All' })).toBeEnabled()
  const locateButtons = page.getByRole('button', { name: 'Locate' })
  const applyButtons = page.getByRole('button', { name: 'Apply' })
  await expect(locateButtons).toHaveCount(2)
  await expect(applyButtons).toHaveCount(2)
  for (let index = 0; index < 2; index += 1) {
    await expect(locateButtons.nth(index)).toBeEnabled()
    await expect(applyButtons.nth(index)).toBeEnabled()
  }
  await savePageScreenshot(page, item)
})

test('templates — apply one review fix and locate the remaining suggestion', async ({ page }) => {
  const item = capture('templates-review-single-fix')
  await openTemplateReview(page, item.route)

  await page.getByRole('button', { name: 'Apply' }).first().click()
  await expect(page.getByText('Fixed', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fix All' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Apply' })).toHaveCount(1)

  await page.getByRole('button', { name: 'Locate' }).click()
  const editor = page.locator('#template-content-editor')
  await expect(editor).toBeFocused()
  await expect
    .poll(() =>
      editor.evaluate((element) => {
        const textarea = element as HTMLTextAreaElement
        return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
      }),
    )
    .toBe(TEMPLATE_REVIEW_SUGGESTIONS[1].original)
  await savePageScreenshot(page, item)
})

test('templates — publish confirmation', async ({ page }) => {
  const item = capture('templates-publish')
  await openProductPage(page, item.route)
  await expect(page.getByText('Northstar Wellness SOAP', { exact: true }).first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Publish' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Publish to community gallery?' })).toBeVisible()
  await dialog
    .getByLabel('Publisher notes')
    .fill('Designed for routine canine and feline wellness visits with evidence-only findings.')
  await expect(dialog.getByRole('button', { name: 'Publish' })).toBeEnabled()
  await savePageScreenshot(page, item)
})

test('community — browse published templates', async ({ page }) => {
  const item = capture('community-browse')
  await openProductPage(page, item.route)
  await expect(page.getByRole('heading', { name: 'Community Templates' })).toBeVisible()
  await expect(page.getByText('Showing 3 templates')).toBeVisible()
  await expect(page.getByText('Low-Stress Wellness Exam', { exact: true })).toBeVisible()
  await expect(page.getByText('Clear Home-Care Instructions', { exact: true })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('community — template detail and duplicate action', async ({ page }) => {
  const item = capture('community-detail')
  await openProductPage(page, item.route)
  await expect(page.getByText('Low-Stress Wellness Exam', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible()
  await expect(page.getByLabel('Likes: 3')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Preview' })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('community — threaded notes from other vets', async ({ page }) => {
  const item = capture('community-notes')
  await openProductPage(page, item.route)
  const heading = page.getByText('Notes from other vets', { exact: true })
  await expect(heading).toBeAttached()
  await heading.evaluate((element) => element.scrollIntoView({ block: 'start' }))
  const notes = page.locator('#community-template-notes')
  await expect(notes.getByText(/evidence-only objective instructions/)).toBeVisible()
  await expect(notes.getByText(/mobility and cognition subsection/)).toBeVisible()
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, document.documentElement.scrollHeight)
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
  await savePageScreenshot(page, item)
})

test('community — report dialog', async ({ page }) => {
  const item = capture('community-report')
  await openProductPage(page, item.route)
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Report' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Report this template' })).toBeVisible()
  await expect(dialog.getByText('Prompt injection', { exact: true })).toBeVisible()
  await dialog.getByLabel('Report notes').fill('This example is for documentation only.')
  await savePageScreenshot(page, item)
})

test('email templates — categorized library and preview', async ({ page }) => {
  const item = capture('email-templates-library')
  await openProductPage(page, item.route)
  await expect(page.getByRole('heading', { name: 'Email Templates' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Search templates...' })).toHaveValue(
    'Post-op check-in',
  )
  await expect(page.getByRole('tab', { name: 'Preview' })).toBeVisible()
  await expect(page.getByText(/Sample:/)).toBeVisible()
  await expect(page.getByText(/How is Buddy doing today\?/)).toBeVisible()
  await savePageScreenshot(page, item)
})

test('messages — Nest inbox with encounter context', async ({ page }) => {
  const item = capture('messages-inbox')
  await mockUnreadMessagesCount(page, 2)
  await openProductPage(page, item.route)
  await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible()
  await expect(page.getByTestId('conversation-subject')).toHaveText(
    'Mochi is eating normally again',
  )
  await expect(
    page
      .getByTestId('message-expanded-d0c50000-0000-4000-8000-000000000501')
      .getByText(/Mochi finished breakfast/),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /See Mochi's encounter/ })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('messages — composer with reply-routing choices', async ({ page }) => {
  const item = capture('messages-composer')
  await openProductPage(page, item.route)
  await page.getByRole('button', { name: 'New Message' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'New message' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Change' }).click()
  await expect(page.getByText('Noctune Nest', { exact: true })).toBeVisible()
  await expect(page.getByText('Noctune (no reply)', { exact: true })).toBeVisible()
  await expect(page.getByText('Your personal email', { exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await savePageScreenshot(page, item)
})

test('messages — Sentinel flagged filter', async ({ page }) => {
  const item = capture('messages-flagged')
  await mockUnreadMessagesCount(page, 1)
  await openProductPage(page, item.route)
  await page.getByRole('button', { name: 'Flagged' }).click()
  await expect(page.getByText('Jasper', { exact: true })).toBeVisible()
  await expect(page.getByText('Flagged', { exact: true }).last()).toBeVisible()
  await expect(page.getByTestId('conversation-subject')).toHaveText('Jasper’s activity restriction')
  await expect(
    page
      .getByTestId('message-expanded-d0c50000-0000-4000-8000-000000000502')
      .getByText(/Please confirm how long Jasper/),
  ).toBeVisible()
  await savePageScreenshot(page, item)
})

test('practice — plan, team, and pending invitation', async ({ page }) => {
  const item = capture('practice-overview')
  await mockDeterministicPracticeMembers(page)
  await openProductPage(page, item.route)
  await expect(page.getByText('Northstar Veterinary Clinic', { exact: true })).toBeVisible()
  await expect(page.getByText('Active members', { exact: true })).toBeVisible()
  await expect(page.getByText('Dr. Riley Patel', { exact: true })).toBeVisible()
  await expect(page.getByText('taylor.nguyen@example.test', { exact: true })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('practice — invite member dialog and clinical roles', async ({ page }) => {
  const item = capture('practice-invite')
  await mockDeterministicPracticeMembers(page)
  await openProductPage(page, item.route)
  await expect(page.getByText('taylor.nguyen@example.test', { exact: true })).toBeVisible()
  await expect(page.getByText('Business Associate Agreement', { exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Invite member' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Invite a member' })).toBeVisible()
  await dialog.getByLabel('Email address').fill('new.technician@example.test')
  await dialog.getByLabel('Role').click()
  await page.getByRole('option', { name: 'Technician' }).click()
  await expect(dialog.getByRole('button', { name: 'Send invitation' })).toBeEnabled()
  await savePageScreenshot(page, item)
})

test('settings — account identity and encounter preferences', async ({ page }) => {
  const item = capture('settings-account')
  await openProductPage(page, item.route)
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByText('Display name', { exact: true })).toBeVisible()
  await expect(page.getByText('Inbound email', { exact: true })).toBeVisible()
  await expect(page.getByText('Auto-finish on copy or send', { exact: true })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('settings — Pro plan, add-ons, and usage', async ({ page }) => {
  const item = capture('settings-billing')
  await openProductPage(page, item.route)
  await expect(page.getByText('Current plan', { exact: true })).toBeVisible()
  await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Noctune Nest', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Long-term storage', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('SOAP note · Mochi', { exact: true })).toBeVisible()
  await savePageScreenshot(page, item)
})

test('settings — notification defaults matrix', async ({ page }) => {
  const item = capture('settings-notifications')
  await openProductPage(page, item.route)
  await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Nest', { exact: true })).toBeVisible()
  await expect(page.getByText('Storage', { exact: true })).toBeVisible()
  await expect(page.getByText('What to notify you about', { exact: true })).toBeVisible()
  await expect(page.getByText('SOAP note ready', { exact: true })).toBeVisible()
  await expect(page.getByText('Sentinel triggered', { exact: true })).toBeVisible()
  await expect(page.getByText('New client reply', { exact: true })).toBeVisible()
  await expect(page.getByText(/Quiet hours: 8 PM/)).toBeAttached()
  await savePageScreenshot(page, item)
})
