// Web tutorial shots. Each shot opens `path`, waits for `ready`, takes the
// ready-state reference, then performs `act`. `reset` runs against the approved
// capture database before the shot; `setup` installs page fixtures before loading.
import { setTimeout as wait } from 'node:timers/promises'
import { expect } from '@playwright/test'
import { installUploadFixture } from './web-upload-fixture.mjs'

export const MOCHI = 'd0c50000-0000-4000-8000-000000000201'
// Mochi's seeded note, and the reserved tutorial version the runner copies from
// it. The tutorial ID must stay outside the seeder's notes: Core's seeder uses
// …309 for Theo's second version.
export const MOCHI_NOTE = 'd0c50000-0000-4000-8000-000000000301'
export const TUTORIAL_NOTE = 'd0c50000-0000-4000-8000-000000000390'
const MOCHI_REPLY = 'd0c50000-0000-4000-8000-000000000501'
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

// Restore the reserved tutorial note and reopen the encounter before a shot
// that edits or completes it, so every take starts from the same draft. Saving
// a section locks it and bumps the revision, so restore those with the text.
export async function resetNote(db) {
  const rows =
    await db`update soap_notes n set rendered_markdown = original.rendered_markdown, discharge_markdown = original.discharge_markdown, edit_metadata = null, section_state = original.section_state, pending_suggestions = original.pending_suggestions, revision = original.revision, is_accepted = original.is_accepted, accepted_at = original.accepted_at, updated_at = original.updated_at from soap_notes original where n.id = ${TUTORIAL_NOTE} and n.transcription_id = ${MOCHI} and original.id = ${MOCHI_NOTE} returning n.id`
  await db`update transcriptions set finished_at = null, finished_by = null, finish_method = null where id = ${MOCHI}`
  return rows.length === 1
}

// Remove templates the reserved capture user created in earlier takes (copies,
// imports, duplicates). Reserved fixture templates keep their d0c5 IDs.
async function resetTemplates(db) {
  await db`delete from soap_templates where id::text not like 'd0c50000-%' and type = 'user' and user_id = (select user_id from soap_templates where id = 'd0c50000-0000-4000-8000-000000000701')`
}

const emailTemplate = (n) => `d0c50000-0000-4000-8000-00000000080${n}`
const postOpBody =
  'Hello,\n\nHow is {{patient.name}} doing today? Please reply with an update on comfort, appetite, and the incision. Contact us promptly for redness, discharge, or worsening pain.'
// The guidance the email-edit shot types and saves; email-insert starts from it.
const postOpAddition = 'Offer soft meals for three days. Questions? Call us at '
const postOpEdited = `${postOpBody}\n\n${postOpAddition}{{practice.phone}}.`

// Restore the seeded email templates with Core PR #837's registered merge
// fields (the seed's greetings use an unregistered `{{client.first_name}}`),
// optionally starting the post-op template from the saved edit.
async function resetEmailTemplates(db, postOp = postOpBody) {
  for (const [id, subject, body] of [
    [
      emailTemplate(1),
      'Welcome to Northstar — care information for {{patient.name}}',
      'Hello,\n\nWelcome to Northstar Veterinary Clinic. We’re glad to care for {{patient.name}}. Reply here whenever you have a follow-up question.\n\n— Dr. Avery Morgan',
    ],
    [
      emailTemplate(2),
      '{{patient.name}} is due for a recheck',
      'Hello,\n\nThis is a reminder to schedule {{patient.name}}’s recommended recheck. Call us or reply to this message if you need help finding a time.',
    ],
    [emailTemplate(3), 'How is {{patient.name}} recovering?', postOp],
    [
      emailTemplate(4),
      'Requested records for {{patient.name}}',
      'Hello,\n\nThe requested records for {{patient.name}} are ready. Let us know if another hospital needs them sent directly.',
    ],
  ])
    await db`update email_templates set subject = ${subject}, body = ${body} where id = ${id}`
}

// Fictional practice material a clinic might already have: SOAP headings,
// client discharge wording, and reusable home-care education in one paste.
const importSample = `Dental recheck visit

Subjective: Owner's report of eating, chewing, drooling, and any pawing at the mouth since the cleaning.
Objective: Weight, gum color, extraction sites, remaining tartar, and pain on oral exam.
Assessment: Healing of extraction sites and overall oral comfort.
Plan: Pain relief, diet, and when to schedule the next dental check.

Going home today
Thank you for bringing {{patient.name}} in. Offer soft food for the next three days and keep chew toys away until the gums have healed.
Call us if you see bleeding, swelling, refusal to eat, or pawing at the mouth.

Brushing at home
Brush a little each day with a pet toothpaste. Start with the front teeth, keep sessions short, and reward calm behavior.`

// The development import analyzer runs on Bedrock, which needs an AWS login
// the capture machine may not have. This fixture returns the split the product
// proposes for \`importSample\` (SOAP draft + discharge proposal with its
// client-education block). It never creates templates; the shot is labelled.
async function installImportFixture(page) {
  const [soap, discharge] = importSample.split('\n\nGoing home today\n')
  const dischargeContent = `Going home today\n${discharge}`
  const education = dischargeContent.slice(dischargeContent.indexOf('Brushing at home'))
  await page.route('**/api/v1/soap-templates/import/analyze', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const body = route.request().postDataJSON()
    if (body.content !== importSample) throw Error('Unexpected tutorial import content')
    await wait(2500)
    await route.fulfill({
      json: {
        ok: true,
        data: {
          analysisReceipt: 'tutorial-fixture',
          sourceHash: 'tutorial-fixture',
          classification: 'combined',
          confidence: 0.92,
          artifacts: [
            {
              draftId: 'd0c50000-0000-4000-8000-000000000951',
              kind: 'soap',
              name: 'Dental recheck',
              content: soap,
              sourceBlockIds: ['b1'],
              confidence: 0.94,
              rationale: null,
              warnings: [],
            },
            {
              draftId: 'd0c50000-0000-4000-8000-000000000952',
              kind: 'discharge',
              name: 'Dental recheck — going home',
              content: dischargeContent,
              sourceBlockIds: ['b2', 'b3'],
              confidence: 0.9,
              rationale: 'Client-facing home care instructions belong in a discharge template.',
              warnings: [],
            },
          ],
          literatureCandidates: [
            {
              id: 'b3',
              title: 'Brushing at home',
              content: education,
              sourceBlockIds: ['b3'],
              disposition: 'kept_in_discharge',
              warnings: [],
            },
          ],
          unassignedBlocks: [],
          model: { provider: 'fixture', model: 'tutorial', promptVersion: 'fixture' },
        },
      },
    })
  })
}

// Relay (Nest) belongs to the practice wallet in production. The shared seed
// grants it only to the personal wallet, so grant the reserved practice
// fixture the same way the native harness does (stage-draft.mjs, ID …414).
async function grantPracticeRelay(db) {
  await db`insert into entitlements (id, billing_account_id, feature, source, granted_at) select 'd0c50000-0000-4000-8000-000000000414', id, 'relay', 'admin', now() from billing_accounts where practice_id = 'd0c50000-0000-4000-8000-000000000601' on conflict (id) do nothing`
}

// Open the from-route picker and pause on each route so viewers can read it.
async function tourRoutes(page, scope, finalRoute) {
  await scope.getByTestId('from-route-change').click()
  await expect(page.getByTestId('from-route-options')).toBeVisible()
  for (const route of ['nest', 'noreply', 'vet']) {
    await page.getByTestId(`from-route-option-${route}`).hover()
    await wait(2200)
  }
  await page.getByTestId(`from-route-option-${finalRoute}`).getByRole('radio').check()
  await wait(2500)
}

// Full search uses a vector index the disposable capture database lacks. Serve
// the same fixture-backed results as the docs screenshot capture
// (capture/authenticated.spec.ts), for Mochi's two earlier visits.
async function installSearchFixture(page) {
  await page.route('**/api/v1/search?*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    await route.fulfill({
      json: {
        ok: true,
        data: {
          patients: [],
          encounters: [
            {
              id: 'd0c50000-0000-4000-8000-000000000204',
              patientId: 'd0c50000-0000-4000-8000-000000000101',
              patientName: 'Mochi',
              createdAt: '2026-05-14T17:00:00.000Z',
              encounterDate: '2026-05-14T17:00:00.000Z',
              status: 'completed',
              snippet:
                'Annual wellness visit. Jamie reports Mochi is active with a stable appetite on the same dry diet.',
              summary: 'Annual wellness examination with stable weight and mild dental tartar.',
              score: 0.91,
            },
            {
              id: 'd0c50000-0000-4000-8000-000000000205',
              patientId: 'd0c50000-0000-4000-8000-000000000101',
              patientName: 'Mochi',
              createdAt: '2026-03-11T17:00:00.000Z',
              encounterDate: '2026-03-11T17:00:00.000Z',
              status: 'completed',
              snippet:
                'Healthy young adult cat, overdue for vaccine boosters, with an incomplete preventive-care history.',
              summary: 'Healthy new-patient examination with preventive care established.',
              score: 0.86,
            },
          ],
        },
      },
    })
  })
}

// The inbox-address tip appears shortly after Messages loads; dismiss it
// before the ready reference so it never shows in a take.
async function dismissInboxTip(page) {
  await expect(page.getByTestId('conversation-subject')).toBeVisible({ timeout: 60000 })
  const tip = page.getByRole('button', { name: 'Got it', exact: true })
  await tip.waitFor({ timeout: 8000 }).catch(() => {})
  if (await tip.isVisible()) await tip.click()
  await expect(tip).toBeHidden()
}

// Restore the reserved Mochi and Jasper threads to their seeded state: unread,
// unassigned, and in the live inbox. Messages shots read, assign, and archive them.
async function resetInbox(db) {
  await db`update encounter_messages set read_at = null where id in ('d0c50000-0000-4000-8000-000000000501', 'd0c50000-0000-4000-8000-000000000502')`
  await db`update encounter_messages set archived_at = null, assigned_to_user_id = null, assigned_at = null where id in ('d0c50000-0000-4000-8000-000000000501', 'd0c50000-0000-4000-8000-000000000502')`
}

// Hover before clicking so viewers see where the pointer is going.
async function point(locator, ms = 400) {
  await locator.hover()
  await wait(ms)
  await locator.click()
}

// Type a replacement over \`find\` in the markdown editor, as a person would.
async function replaceInEditor(page, find, replacement) {
  const editor = page.locator('#soap-note-markdown-editor')
  await expect(editor).toBeVisible()
  const at = (await editor.inputValue()).indexOf(find)
  if (at < 0) throw Error(`Expected fixture wording: ${find}`)
  await editor.evaluate(
    (element, [start, end]) => {
      element.focus()
      element.setSelectionRange(start, end)
    },
    [at, at + find.length],
  )
  await wait(900)
  await page.keyboard.type(replacement, { delay: 90 })
}

// The reserved user has no stored template defaults and has never answered the
// welcome prompt. The setup wizard saves both, so restore them before each take;
// other episodes' drawers keep resolving the system defaults.
async function resetFirstRun(db) {
  await db`update users set default_soap_template_id = null, default_discharge_template_id = null, onboarding_prompt_answered_at = null where id = (select user_id from soap_templates where id = 'd0c50000-0000-4000-8000-000000000701')`
}

// The runner serves dismissed onboarding state, so reopen the real first-visit
// prompt with Core's `?onboarding=1` support override, then walk the /setup
// wizard to `step` (0 note template, 1 discharge template, 2 hand-off).
async function openSetup(page, step) {
  await page.goto('/dashboard?onboarding=1', { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await expect(page.getByRole('dialog', { name: 'Set up noctune?' })).toBeVisible({
    timeout: 60000,
  })
  if (step === undefined) return
  await page.getByRole('button', { name: 'Set up now', exact: true }).click()
  const headings = [
    'How should your notes come out?',
    'What should the client get afterwards?',
    'Record your next visit.',
  ]
  await expect(page.getByRole('heading', { name: headings[0] })).toBeVisible({ timeout: 60000 })
  for (let at = 1; at <= step; at++) {
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: headings[at] })).toBeVisible()
  }
}

// Hover each wizard card in turn so viewers can read the choices.
async function tourCards(page, names) {
  for (const name of names) {
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).hover()
    await wait(1400)
  }
}

const MOCHI_PATIENT = 'd0c50000-0000-4000-8000-000000000101'
const THEO = 'd0c50000-0000-4000-8000-000000000106'

// Theo is the reserved patient with no visits. The archive shot removes him
// through the UI, then puts the row back exactly as it was.
async function restoreTheo(db, modifiedAt) {
  if (modifiedAt)
    await db`update patients set archived = false, archived_at = null, modified_at = ${modifiedAt} where id = ${THEO}`
  else await db`update patients set archived = false, archived_at = null where id = ${THEO}`
}

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
  'transcript-seek': {
    path: encounter(),
    reset: resetNote,
    disclosure: 'Example draft · synthetic playback fixture',
    ready: noteReady,
    act: async (page) => {
      await wait(4500)
      const search = page.getByPlaceholder('Search transcript')
      await search.click()
      await search.pressSequentially('scale', { delay: 140 })
      await wait(2500)
      const passage = page.getByText(/Let me get her up on the scale/).first()
      await passage.scrollIntoViewIfNeeded()
      await passage.click()
      await expect
        .poll(() => page.locator('audio').evaluate((audio) => audio.currentTime))
        .toBeGreaterThan(60)
      await wait(5000)
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
    },
  },
  'citation-correct': {
    path: encounter(),
    reset: resetNote,
    duration: 40,
    disclosure: 'Example draft · synthetic playback fixture',
    ready: noteReady,
    act: async (page, ctx) => {
      await wait(3000)
      const citation = page.locator('[title$="click to jump"]').first()
      await citation.hover()
      await wait(1200)
      await citation.click()
      await expect
        .poll(() => page.locator('audio').evaluate((audio) => audio.currentTime))
        .toBeGreaterThanOrEqual(ctx.citationTime)
      await expect(page.locator('.ts-active')).toContainText('Weight 4.6 kg')
      await expect(page.getByText(/up just a touch from Tuesday/)).toBeInViewport()
      await wait(5000)
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
      await wait(1500)
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await replaceInEditor(page, 'stable', 'up slightly')
      await wait(1500)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.locator('#soap-note-markdown-editor')).toBeHidden()
      await expect(
        page.getByText(/Weight 4\.6 kg \(up slightly from the previous visit\)/),
      ).toBeVisible()
    },
  },
  'format-complete': {
    path: encounter(),
    reset: resetNote,
    duration: 36,
    disclosure: 'Example draft',
    ready: noteReady,
    act: async (page) => {
      await wait(2500)
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      const editor = page.locator('#soap-note-markdown-editor')
      await expect(editor).toBeVisible()
      const phrase = 'Early mild dental tartar.'
      const at = (await editor.inputValue()).indexOf(phrase)
      if (at < 0) throw Error('Expected fixture assessment wording')
      await editor.evaluate(
        (element, [start, end]) => {
          element.focus()
          element.setSelectionRange(start, end)
        },
        [at, at + phrase.length],
      )
      await wait(1800)
      await page.getByRole('button', { name: /^Bold/ }).click()
      await expect(editor).toHaveValue(/\*\*Early mild dental tartar\.\*\*/)
      await wait(3000)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(editor).toBeHidden()
      await wait(3500)
      await page.getByRole('button', { name: 'Complete', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible()
    },
  },
  fullscreen: {
    path: encounter(),
    reset: resetNote,
    disclosure: 'Example draft',
    ready: noteReady,
    act: async (page) => {
      await wait(1800)
      await page.getByRole('button', { name: 'Full screen', exact: true }).click()
      await expect(
        page.getByRole('button', { name: 'Exit full screen', exact: true }),
      ).toBeVisible()
      await wait(1500)
      await page.mouse.move(700, 500)
      await page.mouse.wheel(0, 420)
      await wait(2200)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeVisible()
    },
  },
  'templates-library': {
    path: '/templates/soap',
    reset: resetTemplates,
    ready: (page) =>
      expect(page.getByRole('tab', { name: 'SOAP Templates' })).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(3000)
      await page.getByPlaceholder('Search templates...').click()
      await expect(page.getByText('System Templates', { exact: true })).toBeVisible()
      await wait(4000)
      await page.keyboard.press('Escape')
      await wait(1500)
      await page.getByRole('tab', { name: 'Discharge Templates' }).click()
      await wait(2500)
      await page.getByPlaceholder('Search templates...').click()
      await wait(3500)
      await page.keyboard.press('Escape')
    },
  },
  'community-duplicate': {
    path: '/community/templates',
    reset: resetTemplates,
    duration: 36,
    ready: (page) =>
      expect(page.getByText('Low-Stress Wellness Exam', { exact: true })).toBeVisible({
        timeout: 60000,
      }),
    act: async (page) => {
      await wait(3000)
      await page.getByRole('button', { name: 'Discharge', exact: true }).click()
      await wait(2500)
      await page.getByRole('button', { name: 'Open template Clear Home-Care Instructions' }).click()
      await expect(page.getByRole('button', { name: 'Duplicate', exact: true })).toBeVisible({
        timeout: 30000,
      })
      await wait(4000)
      await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
      await page.waitForURL(/\/templates\/discharge\//, { timeout: 30000 })
      await expect(page.getByRole('button', { name: 'Save Template' })).toBeVisible({
        timeout: 30000,
      })
    },
  },
  'template-create': {
    path: '/templates/soap',
    reset: resetTemplates,
    duration: 36,
    ready: (page) =>
      expect(page.getByRole('button', { name: 'New Template' })).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(2500)
      await page.getByRole('button', { name: 'New Template' }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText('Create a custom template')).toBeVisible()
      await wait(2500)
      await dialog.getByRole('button', { name: /Copy a template/ }).click()
      await wait(1200)
      const name = dialog.getByLabel('Template name')
      await name.click()
      await name.pressSequentially('Northstar dental recheck', { delay: 70 })
      await wait(1500)
      await dialog.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(dialog).toBeHidden({ timeout: 30000 })
      await expect(page.getByRole('button', { name: 'Save Template' })).toBeVisible()
    },
  },
  'template-import': {
    path: '/templates/soap',
    reset: resetTemplates,
    duration: 45,
    disclosure: 'Import analysis simulated',
    setup: (page) => installImportFixture(page),
    ready: (page) =>
      expect(page.getByRole('button', { name: 'New Template' })).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(2000)
      await page.getByRole('button', { name: 'New Template' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('button', { name: /Import/ }).click()
      await wait(1000)
      await dialog.getByLabel('Template name').fill('Dental recheck')
      const paste = dialog.getByLabel('Paste your template')
      await paste.click()
      await paste.fill(importSample)
      await wait(3500)
      await dialog.getByRole('button', { name: 'Organize this' }).click()
      await expect(page.getByText(/Imported from pasted text/)).toBeVisible({ timeout: 90000 })
      await wait(6000)
      await page.getByRole('button', { name: 'Save Template' }).click()
      await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 30000 })
    },
  },
  'email-templates': {
    path: '/email-library',
    reset: (db) => resetEmailTemplates(db),
    ready: (page) =>
      expect(page.getByRole('button', { name: 'New Template' })).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(4000)
      await page.locator('input[value="Post-op check-in"]').click()
      await wait(2500)
      await page.getByRole('option', { name: /Recheck reminder/ }).click()
      await wait(4000)
      await page.getByRole('button', { name: 'Placeholder' }).click()
      await wait(3500)
      await page.keyboard.press('Escape')
    },
  },
  // Email templates (episode 10): browse, edit and save, insert on an
  // encounter, and late fill from the To recipient. Nothing is sent.
  'email-library': {
    path: `/email-library?template=${emailTemplate(2)}`,
    reset: (db) => resetEmailTemplates(db),
    ready: (page) =>
      expect(page.locator('input[value="Recheck reminder"]')).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(2000)
      const search = page.locator('input[value="Recheck reminder"]')
      await search.hover()
      await wait(400)
      await search.click()
      await expect(page.getByRole('option', { name: /Post-op check-in/ })).toBeVisible()
      await wait(4500)
      await page.keyboard.press('ControlOrMeta+a')
      await page.keyboard.type('post', { delay: 120 })
      await wait(1500)
      const option = page.getByRole('option', { name: /Post-op check-in/ })
      await option.hover()
      await wait(400)
      await option.click()
      await expect(page.getByRole('textbox', { name: 'Body' })).toContainText('How is')
      await page.mouse.move(1200, 640, { steps: 8 })
      await wait(3000)
    },
  },
  'email-edit': {
    path: `/email-library?template=${emailTemplate(3)}`,
    reset: (db) => resetEmailTemplates(db),
    ready: (page) =>
      expect(page.getByRole('textbox', { name: 'Body' })).toContainText('worsening pain', {
        timeout: 60000,
      }),
    act: async (page) => {
      await wait(500)
      const body = page.getByRole('textbox', { name: 'Body' })
      await body.getByText(/worsening pain/).hover()
      await wait(400)
      await body.evaluate((element) => {
        element.focus()
        const range = document.createRange()
        range.selectNodeContents(element)
        range.collapse(false)
        getSelection().removeAllRanges()
        getSelection().addRange(range)
      })
      // Shift+Enter keeps the new lines in the editor root; Enter wraps them
      // in a block that the inserted chip lands outside of.
      await page.keyboard.press('Shift+Enter')
      await page.keyboard.press('Shift+Enter')
      await page.keyboard.type(postOpAddition, { delay: 90 })
      await page.keyboard.type('{phone', { delay: 140 })
      await wait(1500)
      await page.keyboard.press('Enter')
      await page.keyboard.type('.', { delay: 90 })
      await expect(page.getByText(/Call us at \(555\) 010-2233\./)).toBeVisible()
      await wait(3500)
      const save = page.getByRole('button', { name: 'Save Template' })
      await save.hover()
      await wait(400)
      await save.click()
      await expect(page.getByText('Unsaved changes', { exact: true })).toBeHidden({
        timeout: 30000,
      })
      await expect(save).toBeDisabled()
      await wait(2500)
    },
  },
  'email-insert': {
    path: encounter(),
    disclosure: 'Example draft · nothing sent',
    reset: async (db) => {
      await grantPracticeRelay(db)
      await resetEmailTemplates(db, postOpEdited)
    },
    ready: noteReady,
    act: async (page) => {
      await wait(600)
      const sendEmail = page.getByRole('button', { name: 'Send Email', exact: true })
      await sendEmail.hover()
      await wait(400)
      await sendEmail.click()
      await wait(700)
      const sendMessage = page.getByRole('menuitem', { name: /Send message/ })
      await sendMessage.hover()
      await wait(300)
      await sendMessage.click()
      await expect(page.getByLabel('Subject')).toBeVisible({ timeout: 30000 })
      await wait(800)
      const composer = page.getByTestId('composer-full')
      const templates = composer.getByRole('button', { name: 'Templates' })
      await templates.hover()
      await wait(400)
      await templates.click()
      await expect(page.getByText('Insert a template')).toBeVisible()
      await expect(page.getByTestId('template-picker-loading')).toHaveCount(0)
      await wait(1200)
      const postOp = page.getByRole('button', { name: /^Post-op check-in/ })
      await postOp.hover()
      await wait(400)
      await postOp.click()
      await expect(page.getByLabel('Subject')).toHaveValue('How is Mochi recovering?')
      const message = composer.getByRole('textbox', { name: 'Message' })
      await expect(message).toContainText('Call us at (555) 010-0200.')
      await wait(1200)
      await message.hover()
      await page.mouse.wheel(0, 240)
      await expect.poll(() => message.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
      await wait(3500)
    },
  },
  'email-recipient': {
    path: '/dashboard',
    disclosure: 'Nothing sent',
    reset: async (db) => {
      await grantPracticeRelay(db)
      await resetEmailTemplates(db)
    },
    ready: (page) =>
      expect(page.getByText('Your work', { exact: true })).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(500)
      const newMessage = page.getByRole('button', { name: 'New Message', exact: true })
      await newMessage.hover()
      await wait(400)
      await newMessage.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText('New message', { exact: true })).toBeVisible()
      await wait(900)
      const templates = dialog.getByRole('button', { name: 'Templates' })
      await templates.hover()
      await wait(400)
      await templates.click()
      await expect(page.getByText('Insert a template')).toBeVisible()
      await expect(page.getByTestId('template-picker-loading')).toHaveCount(0)
      await wait(1200)
      const recheck = page.getByRole('button', { name: /^Recheck reminder/ })
      await recheck.hover()
      await wait(400)
      await recheck.click()
      await expect(
        dialog.getByText(/This placeholder fills from the recipient in To/),
      ).toBeVisible()
      await wait(2500)
      const to = dialog.getByLabel('To', { exact: true })
      await to.click()
      await to.pressSequentially('jamie.chen@example.test', { delay: 55 })
      await to.press('Enter')
      await expect(dialog.getByLabel('Subject')).toHaveValue('Mochi is due for a recheck', {
        timeout: 15000,
      })
      await expect(dialog.getByText(/fills from the recipient in To/)).toBeHidden()
      await wait(4000)
    },
  },
  'discharge-routes': {
    path: encounter(),
    duration: 44,
    disclosure: 'Example draft · nothing sent',
    reset: async (db) => {
      await grantPracticeRelay(db)
      await resetNote(db)
    },
    ready: noteReady,
    act: async (page) => {
      await wait(2000)
      await page.getByRole('tab', { name: 'Discharge Notes', exact: true }).click()
      await wait(3000)
      await page.mouse.move(700, 520)
      await page.mouse.wheel(0, 360)
      await wait(3000)
      await page.getByRole('button', { name: 'Send Email', exact: true }).click()
      await wait(1000)
      await page.getByRole('menuitem', { name: /Send discharge notes/ }).click()
      const dialog = page.getByRole('dialog')
      await expect(
        dialog.getByRole('heading', { name: 'Send Discharge Summary', exact: true }),
      ).toBeVisible()
      await wait(1500)
      const recipient = dialog.getByLabel('To', { exact: true })
      await recipient.pressSequentially('jamie.chen@example.test', { delay: 45 })
      await recipient.press('Enter')
      await wait(2000)
      await tourRoutes(page, dialog, 'nest')
    },
  },
  'encounter-message': {
    path: encounter(),
    duration: 40,
    disclosure: 'Example draft · nothing sent',
    reset: grantPracticeRelay,
    ready: noteReady,
    act: async (page) => {
      await wait(2000)
      await page.getByRole('button', { name: 'Send Email', exact: true }).click()
      await wait(800)
      await page.getByRole('menuitem', { name: /Send message/ }).click()
      await expect(page.getByLabel('Subject')).toBeVisible({ timeout: 30000 })
      await wait(1500)
      const to = page.getByLabel('To', { exact: true })
      await to.pressSequentially('jamie.chen@example.test', { delay: 45 })
      await to.press('Enter')
      await wait(1500)
      await page.getByTestId('composer-full').getByRole('button', { name: 'Templates' }).click()
      await expect(page.getByText('Insert a template')).toBeVisible()
      await wait(2000)
      await page.getByText('Recheck reminder').first().click()
      await wait(3500)
      await tourRoutes(page, page, 'nest')
    },
  },
  inbox: {
    path: '/messages',
    duration: 36,
    disclosure: 'Nothing sent',
    reset: grantPracticeRelay,
    ready: async (page) => {
      await expect(page.getByTestId('conversation-subject')).toHaveText(
        'Mochi is eating normally again',
        { timeout: 60000 },
      )
      const tip = page.getByRole('button', { name: 'Got it', exact: true })
      if (await tip.isVisible()) await tip.click()
    },
    act: async (page) => {
      await wait(3500)
      await page.getByTestId('conversation-encounter-chip').hover()
      await wait(3000)
      await page.getByRole('button', { name: 'Reply', exact: true }).first().click()
      await expect(page.getByText(/Replying to/)).toBeVisible({ timeout: 30000 })
      await wait(3000)
      await page.getByRole('dialog').locator('[contenteditable="true"]').first().click()
      await page.keyboard.type(
        'Great to hear! Keep her on her usual food and let us know if anything changes.',
        { delay: 35 },
      )
      await wait(2500)
    },
  },
  'patients-history': {
    path: '/patients',
    duration: 36,
    ready: (page) =>
      expect(page.getByPlaceholder('Search patients...')).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(3000)
      await page.getByRole('button', { name: 'Recent', exact: true }).click()
      await wait(2000)
      await page.getByPlaceholder('Search patients...').pressSequentially('Mochi', { delay: 120 })
      await wait(2000)
      await page.getByRole('button', { name: 'View patient Mochi' }).first().click()
      await expect(page.getByText('Encounter History')).toBeVisible({ timeout: 30000 })
      await wait(2500)
      await page.getByText('Encounter History').scrollIntoViewIfNeeded()
      await wait(4000)
    },
  },
  'past-encounters': {
    path: encounter(),
    ready: noteReady,
    act: async (page) => {
      await wait(2500)
      await page.getByRole('tab', { name: /Past Encounters/ }).click()
      await wait(3500)
      const search = page.getByPlaceholder('e.g. bloodwork, medications, weight')
      await search.click()
      await search.pressSequentially('weight', { delay: 140 })
      await wait(5000)
    },
  },
  'dashboard-today': {
    path: '/dashboard',
    ready: (page) =>
      expect(page.getByText('Your work', { exact: true })).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(4000)
      await page.getByText('Unsigned', { exact: true }).click()
      await wait(3500)
      await page.getByText('All', { exact: true }).first().click()
      await wait(2000)
      await page.getByRole('button', { name: 'Previous day' }).click()
      await wait(3000)
      await page.getByRole('button', { name: 'Next day' }).click()
    },
  },
  'global-search': {
    path: '/dashboard',
    disclosure: 'Search results simulated',
    setup: (page) => installSearchFixture(page),
    ready: (page) =>
      expect(page.getByText('Your work', { exact: true })).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(2500)
      await page.keyboard.press('Meta+k')
      await wait(1500)
      await page.keyboard.type('weight', { delay: 150 })
      await expect(page.getByText(/Mochi · May 14, 2026/)).toBeVisible({ timeout: 30000 })
      await wait(4500)
      await page.getByText(/Mochi · May 14, 2026/).click()
      await expect(page.getByRole('heading', { name: 'Subjective', exact: true })).toBeVisible({
        timeout: 60000,
      })
      await wait(3000)
    },
  },
  'team-practice': {
    path: '/practice',
    duration: 36,
    ready: (page) =>
      expect(page.getByText('Active members', { exact: true })).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(4000)
      await page.getByText('Pending invitations').scrollIntoViewIfNeeded()
      await wait(2500)
      await page.getByRole('button', { name: 'Invite member' }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText('Invite a member')).toBeVisible()
      await dialog.getByLabel('Email address').pressSequentially('sam.rivera@example.test', {
        delay: 50,
      })
      await wait(3500)
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await wait(1500)
    },
  },
  'team-assign': {
    path: '/messages',
    reset: (db) =>
      db`update encounter_messages set assigned_to_user_id = null, assigned_at = null where id = 'd0c50000-0000-4000-8000-000000000501'`,
    ready: dismissInboxTip,
    act: async (page) => {
      await wait(3000)
      await page.getByRole('button', { name: 'Unassigned', exact: true }).click()
      await wait(2500)
      await page.getByTestId('inbox-row-assign-button').first().click()
      await wait(1500)
      await page.getByRole('menuitem', { name: /Riley Patel/ }).click()
      await expect(page.getByTestId('inbox-row-assignee-chip').first()).toBeVisible()
      await wait(3000)
    },
  },
  'messages-triage': {
    path: '/messages',
    reset: resetInbox,
    ready: async (page) => {
      await dismissInboxTip(page)
      await expect(page.getByTestId('conversation-subject')).toHaveText(
        'Mochi is eating normally again',
      )
    },
    act: async (page) => {
      await wait(5500)
      await point(page.getByRole('button', { name: 'Unread', exact: true }))
      await expect(page.getByTestId(`inbox-row-${MOCHI_REPLY}`)).toHaveCount(0)
      await wait(2500)
      await page.getByRole('button', { name: 'All', exact: true }).click()
      await wait(600)
      await point(page.getByRole('button', { name: 'Flagged', exact: true }))
      await expect(page.getByTestId('conversation-subject')).toContainText('activity restriction')
      await wait(2800)
      await point(page.getByRole('button', { name: 'All', exact: true }))
      await expect(page.getByTestId(`inbox-row-${MOCHI_REPLY}`)).toBeVisible()
      await wait(3000)
    },
  },
  'messages-open-encounter': {
    path: '/messages',
    reset: resetInbox,
    disclosure: 'Example draft',
    ready: async (page) => {
      await dismissInboxTip(page)
      await expect(page.getByTestId('conversation-subject')).toHaveText(
        'Mochi is eating normally again',
      )
    },
    act: async (page) => {
      await wait(2000)
      // The row's centre is its Assign button; select the thread by its name.
      await point(page.getByTestId(`inbox-row-${MOCHI_REPLY}`).getByText('Mochi', { exact: true }))
      await wait(2500)
      await page.getByTestId('conversation-encounter-chip').hover()
      await wait(1500)
      await point(page.getByTestId('panel-open-encounter'), 500)
      await page.waitForURL(/\/encounters\/d0c50000-0000-4000-8000-000000000201\?tab=messages/, {
        timeout: 30000,
      })
      await expect(page.getByRole('heading', { name: 'Subjective', exact: true })).toBeVisible({
        timeout: 60000,
      })
      await expect(page.getByText('Mochi is eating normally again').first()).toBeVisible()
      await expect.poll(() => page.locator('audio').evaluate((audio) => audio.duration)).toBe(284)
      await wait(3500)
    },
  },
  // Compose only: prepare the reply, insert a template, select no-reply. No Send.
  'messages-encounter-reply': {
    path: `${encounter()}?tab=messages`,
    reset: async (db) => {
      await grantPracticeRelay(db)
      await resetInbox(db)
    },
    disclosure: 'Example draft · nothing sent',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Subjective', exact: true })).toBeVisible({
        timeout: 60000,
      })
      await expect(page.getByRole('button', { name: 'Reply', exact: true }).last()).toBeVisible({
        timeout: 60000,
      })
      await expect.poll(() => page.locator('audio').evaluate((audio) => audio.duration)).toBe(284)
    },
    act: async (page) => {
      await wait(1500)
      await point(page.getByRole('button', { name: 'Reply', exact: true }).last())
      const composer = page.getByTestId('composer-full')
      await expect(composer).toContainText('jamie.chen@example.test', { timeout: 30000 })
      await wait(3500)
      await point(composer.getByRole('button', { name: 'Templates' }))
      await expect(page.getByText('Insert a template')).toBeVisible()
      await wait(1800)
      await point(page.getByText('Recheck reminder').first())
      await expect(composer).toContainText(/schedule Mochi.s recommended recheck/)
      await wait(4000)
      await point(composer.getByTestId('from-route-change'))
      await expect(page.getByTestId('from-route-options')).toBeVisible()
      await wait(1200)
      await page.getByTestId('from-route-option-noreply').hover()
      await wait(400)
      await page.getByTestId('from-route-option-noreply').getByRole('radio').check()
      await expect(composer.getByTestId('from-route-identity-address')).toHaveText(
        'noreply@mail.noctune.ai',
      )
      await wait(3000)
    },
  },
  'messages-assign-archive': {
    path: '/messages',
    reset: resetInbox,
    ready: async (page) => {
      await dismissInboxTip(page)
      await expect(page.getByTestId('conversation-subject')).toHaveText(
        'Mochi is eating normally again',
      )
    },
    act: async (page) => {
      const row = page.getByTestId(`inbox-row-${MOCHI_REPLY}`)
      await wait(2000)
      await point(row.getByTestId('inbox-row-assign-button'))
      await expect(page.getByRole('menu')).toHaveCount(1)
      await wait(1200)
      await point(page.getByRole('menuitem', { name: /Riley Patel/ }))
      await expect(row.getByTestId('inbox-row-assignee-chip')).toBeVisible()
      await wait(2500)
      await point(page.getByTestId('conversation-overflow'))
      await wait(900)
      await point(page.getByTestId('panel-archive'))
      await expect(row).toHaveCount(0)
      await wait(2000)
      await point(page.getByRole('button', { name: 'Archived', exact: true }))
      await expect(row).toBeVisible()
      await wait(3500)
    },
  },
  'patients-find': {
    path: '/patients',
    ready: (page) =>
      expect(page.getByRole('button', { name: 'View patient Theo' })).toBeVisible({
        timeout: 60000,
      }),
    act: async (page) => {
      await wait(4500)
      const search = page.getByPlaceholder('Search patients...')
      await search.hover()
      await wait(400)
      await search.click()
      await wait(1100)
      await search.pressSequentially('Jamie', { delay: 90 })
      const mochi = page.getByRole('button', { name: 'View patient Mochi' })
      await expect(page.getByRole('button', { name: /^View patient / })).toHaveCount(1)
      await wait(2500)
      await mochi.hover()
      await wait(400)
      await mochi.click()
      await expect(page.getByText('Encounter History', { exact: true })).toBeVisible({
        timeout: 30000,
      })
      await wait(3000)
    },
  },
  'patient-profile': {
    path: `/patients/${MOCHI_PATIENT}`,
    reset: resetNote,
    ready: (page) =>
      expect(page.getByText('Encounter History', { exact: true })).toBeVisible({
        timeout: 60000,
      }),
    act: async (page) => {
      await wait(3500)
      // Today's visit is the Ready one; earlier visits are Completed.
      const today = page.getByRole('button', { name: /^View encounter from / }).filter({
        hasText: 'Ready',
      })
      await expect(today).toHaveCount(1)
      await page.mouse.move(700, 600)
      for (let step = 0; step < 16; step++) {
        const bottom = await today.evaluate((row) => row.getBoundingClientRect().bottom)
        if (bottom < 860) break
        await page.mouse.wheel(0, 90)
        await wait(70)
      }
      await expect(today).toBeInViewport()
      await expect(page.getByText('Completed', { exact: true }).first()).toBeInViewport()
      await wait(6500)
      await today.hover()
      await wait(500)
      await today.click()
      await expect(page.getByRole('heading', { name: 'Subjective', exact: true })).toBeVisible({
        timeout: 60000,
      })
      await wait(2500)
    },
  },
  'history-compare': {
    path: encounter(),
    reset: resetNote,
    disclosure: 'Example draft',
    ready: noteReady,
    act: async (page) => {
      await wait(2500)
      const tab = page.getByRole('tab', { name: /Past Encounters/ })
      await tab.hover()
      await wait(400)
      await tab.click()
      const wellness = page.getByText(/^Encounter · /).first()
      await expect(wellness).toBeVisible({ timeout: 30000 })
      await expect(
        page.getByText('Annual wellness examination with stable weight and mild dental tartar.'),
      ).toBeVisible()
      await wait(2000)
      await page.getByRole('button', { name: 'Open', exact: true }).first().hover()
      await wait(1500)
      await wellness.hover()
      await wait(400)
      await wellness.click()
      const weight = page.getByText(/Weight 4\.5 kg \(unchanged from last year\)/)
      await expect(weight).toBeVisible()
      await wait(1500)
      await page.mouse.move(1280, 620)
      for (let step = 0; step < 4; step++) {
        await page.mouse.wheel(0, 70)
        await wait(80)
      }
      await expect(weight).toBeInViewport()
      await wait(2500)
      const vaccines = page.getByText(/Rabies and FVRCP boosters administered today/)
      for (let step = 0; step < 12; step++) {
        const bottom = await vaccines.evaluate((line) => line.getBoundingClientRect().bottom)
        if (bottom < 780) break
        await page.mouse.wheel(0, 70)
        await wait(80)
      }
      await expect(vaccines).toBeInViewport()
      await wait(3500)
    },
  },
  'search-patient': {
    path: encounter(),
    disclosure: 'Example draft',
    ready: noteReady,
    act: async (page) => {
      await wait(2000)
      await page.keyboard.press('Meta+k')
      await wait(1200)
      await page.keyboard.type('Jamie', { delay: 90 })
      const patient = page.getByRole('option').filter({ hasText: 'Jamie Chen' }).filter({
        hasText: 'Mochi',
      })
      await expect(patient.first()).toBeVisible({ timeout: 30000 })
      await wait(3000)
      await patient.first().hover()
      await wait(400)
      await patient.first().click()
      await page.waitForURL(new RegExp(`/patients/${MOCHI_PATIENT}`), { timeout: 30000 })
      await expect(page.getByText('Encounter History', { exact: true })).toBeVisible({
        timeout: 30000,
      })
      await wait(2500)
    },
  },
  'patient-archive': {
    path: '/patients',
    reset: (db) => restoreTheo(db),
    ready: (page) =>
      expect(page.getByRole('button', { name: 'View patient Theo' })).toBeVisible({
        timeout: 60000,
      }),
    act: async (page, ctx) => {
      const [{ modified_at: modifiedAt }] =
        await ctx.db`select modified_at from patients where id = ${THEO}`
      try {
        await wait(2500)
        const theo = page.getByRole('button', { name: 'View patient Theo' })
        await theo.hover()
        await wait(400)
        const remove = theo.getByRole('button', { name: 'Delete' })
        await remove.hover()
        await wait(500)
        await remove.click()
        const dialog = page.getByRole('dialog')
        await expect(dialog.getByText('Remove Patient').first()).toBeVisible()
        await wait(4000)
        const confirm = dialog.getByRole('button', { name: 'Remove Patient', exact: true })
        await confirm.hover()
        await wait(400)
        await confirm.click()
        await expect(page.getByText('Theo removed', { exact: true })).toBeVisible({
          timeout: 30000,
        })
        await expect(theo).toHaveCount(0)
        await wait(3500)
      } finally {
        await restoreTheo(ctx.db, modifiedAt)
      }
    },
  },
  sentinel: {
    path: encounter('d0c50000-0000-4000-8000-000000000202'),
    duration: 40,
    disclosure: 'Synthetic Sentinel example · fixture audio',
    ready: (page) =>
      expect(page.getByText(/Sentinel — Safety Alert/)).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(6000)
      const row = page.getByRole('button', { name: /^Seek to / }).first()
      await row.hover()
      await wait(1500)
      await row.click()
      await expect
        .poll(() => page.locator('audio').evaluate((audio) => audio.currentTime))
        .toBeGreaterThan(0)
      await wait(5000)
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
      await wait(2500)
      await page.getByRole('button', { name: 'Got it', exact: true }).click()
      await wait(4000)
    },
  },
  'sentinel-flagged': {
    path: '/messages',
    ready: dismissInboxTip,
    act: async (page) => {
      await wait(3000)
      await page.getByRole('button', { name: 'Flagged', exact: true }).click()
      await wait(4000)
      await expect(page.getByTestId('conversation-subject')).toContainText('activity restriction')
      await wait(3000)
      await page.getByTestId('panel-open-encounter').click()
      await expect(page.getByText(/Sentinel — Safety Alert/)).toBeVisible({ timeout: 60000 })
      await wait(3000)
    },
  },
  welcome: {
    path: '/dashboard',
    reset: resetFirstRun,
    disclosure: 'Starts after sign-in · welcome prompt reopened',
    ready: (page) => openSetup(page),
    act: async (page) => {
      await wait(5000)
      await page.getByRole('button', { name: 'I’ll just record', exact: true }).hover()
      await wait(3500)
      await page.getByRole('button', { name: 'Set up now', exact: true }).hover()
      await wait(1500)
      await page.getByRole('button', { name: 'Set up now', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'How should your notes come out?' }),
      ).toBeVisible({ timeout: 30000 })
      await wait(2500)
    },
  },
  'setup-note': {
    path: '/dashboard',
    reset: resetFirstRun,
    ready: (page) => openSetup(page, 0),
    act: async (page) => {
      await wait(2500)
      await tourCards(page, [
        'General SOAP Note',
        'Emergency Triage',
        'Dental Procedure',
        'Wellness Exam',
      ])
      await page.getByRole('button', { name: /^General SOAP Note/ }).hover()
      await wait(400)
      await page.getByRole('button', { name: /^General SOAP Note/ }).click()
      await expect(page.getByRole('button', { name: /^General SOAP Note/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await wait(2000)
      await page.getByRole('button', { name: 'Continue', exact: true }).hover()
      await wait(400)
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'What should the client get afterwards?' }),
      ).toBeVisible()
      await wait(2000)
    },
  },
  'setup-discharge': {
    path: '/dashboard',
    reset: resetFirstRun,
    ready: (page) => openSetup(page, 1),
    act: async (page) => {
      await wait(3000)
      await tourCards(page, ['General Discharge', 'Post-Surgical Discharge', 'Nothing for now'])
      await page.getByRole('button', { name: /^General Discharge/ }).hover()
      await wait(400)
      await page.getByRole('button', { name: /^General Discharge/ }).click()
      await expect(page.getByRole('button', { name: /^General Discharge/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await wait(1200)
      await page.getByRole('button', { name: 'Continue', exact: true }).hover()
      await wait(400)
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Record your next visit.' })).toBeVisible()
      await wait(2500)
    },
  },
  // Stops before recording; the first-encounter episode continues from here.
  'setup-handoff': {
    path: '/dashboard',
    reset: resetFirstRun,
    ready: (page) => openSetup(page, 2),
    act: async (page) => {
      await wait(500)
      await page.getByRole('button', { name: 'Start an encounter', exact: true }).hover()
      await wait(400)
      await page.getByRole('button', { name: 'Start an encounter', exact: true }).click()
      const patient = page.getByPlaceholder('Search or type a new name...')
      await expect(patient).toBeVisible({ timeout: 30000 })
      await expect
        .poll(() =>
          page.locator('input').evaluateAll((inputs) => inputs.map((input) => input.value)),
        )
        .toEqual(expect.arrayContaining(['General SOAP Note', 'General Discharge']))
      await wait(500)
      await patient.hover()
      await wait(400)
      await patient.click()
      await wait(600)
      await page.getByRole('option', { name: /Mochi/ }).click()
      await expect(patient).toHaveValue('Mochi')
      await wait(1500)
      await page.getByRole('button', { name: 'Record from web', exact: true }).hover()
      await wait(3000)
    },
  },
  'account-basics': {
    path: '/settings?tab=account',
    reset: resetFirstRun,
    ready: (page) =>
      expect(page.getByText('Display name', { exact: true })).toBeVisible({ timeout: 60000 }),
    act: async (page) => {
      await wait(1000)
      await page.locator('input[value="Dr. Avery Morgan"]').hover()
      await wait(3500)
      await page
        .getByText(/@inbox\.noctune\./)
        .first()
        .hover()
      await wait(2500)
      await page.getByText('Auto-finish on copy or send', { exact: true }).hover()
      await wait(4500)
    },
  },
  // Fills the invitation and cancels it; nothing is sent.
  'practice-invite': {
    path: '/practice',
    reset: resetFirstRun,
    disclosure: 'Nothing sent',
    // Wait for member and invitation rows; the panels load after their headings.
    ready: async (page) => {
      await expect(page.getByText('Active members', { exact: true })).toBeVisible({
        timeout: 60000,
      })
      await expect(page.getByText('Jordan Kim', { exact: true })).toBeVisible({ timeout: 60000 })
      await expect(page.getByText('taylor.nguyen@example.test')).toBeVisible({ timeout: 60000 })
    },
    act: async (page) => {
      await wait(2500)
      await page.getByRole('button', { name: 'Invite member' }).hover()
      await wait(400)
      await page.getByRole('button', { name: 'Invite member' }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText('Invite a member')).toBeVisible()
      await dialog.getByLabel('Email address').pressSequentially('sam.rivera@example.test', {
        delay: 90,
      })
      await wait(600)
      await dialog.getByRole('combobox').hover()
      await wait(400)
      await dialog.getByRole('combobox').click()
      await wait(900)
      await page.getByRole('option', { name: 'Technician', exact: true }).click()
      await expect(dialog.getByRole('combobox')).toHaveText('Technician')
      await wait(1000)
      await dialog.getByRole('button', { name: 'Cancel' }).hover()
      await wait(500)
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog).toBeHidden()
      await wait(2000)
    },
  },
  // Serves onboarding state for a new account so the dashboard checklist shows.
  'next-steps': {
    path: '/dashboard',
    reset: resetFirstRun,
    disclosure: 'Checklist shown as for a new account',
    ready: async (page, ctx) => {
      await page.unroute('**/api/v1/me/onboarding')
      await page.route('**/api/v1/me/onboarding', async (route) => {
        if (route.request().method() !== 'GET') return route.continue()
        await route.fulfill({
          json: {
            ok: true,
            data: {
              promptAnsweredAt: ctx.now,
              checklistHiddenAt: null,
              dismissedAt: null,
              completedSteps: [],
            },
          },
        })
      })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
      await expect(page.getByText('Finish setting up', { exact: true })).toBeVisible({
        timeout: 60000,
      })
    },
    act: async (page) => {
      await wait(3000)
      for (const step of [
        'Record or upload audio',
        'Create a SOAP template',
        'Send a discharge',
        'Meet your inbox',
      ]) {
        // Titles carry a visually hidden "Not started: " prefix.
        await page.getByText(new RegExp(`${step}$`)).hover()
        await wait(1300)
      }
      await page.getByRole('link', { name: /^Docs for Record or upload audio/ }).hover()
      await wait(3500)
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
