// Website builder shots (site-builder-web). The capture practice's site is seeded by
// Core's docs capture seeder as an unpublished draft written from the fictional
// practice's old website. Each shot restores that draft first, so takes can be
// recorded in any order; `publish` is the only shot that publishes, and `phone`
// publishes through the real API before it films the live page.
import path from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'
import { expect } from '@playwright/test'

// Free addresses use production's sites domain, so the film shows the address a
// vet gets. The capture browser maps every host under it to the local renderer.
export const SITES_ROOT_DOMAIN = 'sites.noctune.ai'
const OLD_SITE = 'https://northstarvet.example.test'
const builder = (edit) => `/website${edit ? `?edit=${edit}` : ''}`
const phone = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
}

// The seeded site's IDs and content come from Core's fixture module (Core #1092), parsed
// as the seeder writes them, so a reset always matches the seed.
function seededSite(ctx) {
  const { DOCS_CAPTURE_SITE } = ctx.requireCore(
    path.join(ctx.core, 'scripts/fixtures/noctune-demo/site.ts'),
  )
  const { siteContentSchema } = ctx.requireCore(
    path.join(ctx.core, 'src/lib/sites/shared/content.ts'),
  )
  return {
    ...DOCS_CAPTURE_SITE,
    content: () => siteContentSchema.parse(DOCS_CAPTURE_SITE.content()),
  }
}

// Back to the seeded, never-published draft: no published versions, the seeded
// look and content, and no finished draft job waiting to be shown.
async function resetSite(db, ctx) {
  const site = seededSite(ctx)
  const content = site.content()
  await db.begin(async (tx) => {
    await tx`update sites set status = 'draft', published_version_id = null, first_published_at = null, lapse_detected_at = null, theme = ${content.theme ?? site.theme}, updated_at = now() where id = ${site.id}`
    await tx`delete from site_versions where site_id = ${site.id} and published_at is not null`
    const rows =
      await tx`update site_versions set content = ${tx.json(content)}, updated_at = now() where id = ${site.draftVersionId} and site_id = ${site.id} and published_at is null returning id`
    if (rows.length !== 1) throw Error('Seeded website draft is missing')
  })
}

async function editorReady(page) {
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible({
    timeout: 90000,
  })
  const preview = page.frameLocator('iframe[title="Website preview"]')
  await expect(preview.locator('h1')).toBeVisible({ timeout: 90000 })
}

async function point(locator, ms = 400) {
  await locator.hover()
  await wait(ms)
  await locator.click()
}

// A stand-in for the practice's old website: a fictional, dated page served only
// inside the capture browser. The draft scene that follows simulates reading it.
const oldSiteHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>Northstar Veterinary Clinic - Home</title>
<style>
body{margin:0;min-height:100vh;background:linear-gradient(#7d8d98,#c3ccd2);font:13px Verdana,Geneva,sans-serif;color:#222}
#wrap{width:780px;margin:18px auto;background:#fff;border:1px solid #556;box-shadow:0 0 8px #445}
#banner{height:110px;background:linear-gradient(#1d4f91,#3a78c2);color:#fff;padding:18px 24px;box-sizing:border-box;border-bottom:4px solid #e8b100}
#banner h1{margin:0;font:bold 30px Georgia,'Times New Roman',serif;text-shadow:2px 2px 0 #0b2a55}
#banner p{margin:6px 0 0;font:italic 15px Georgia,serif;color:#dfe9ff}
#nav{background:#e8b100;padding:6px 10px;font-weight:bold;font-size:12px}
#nav a{color:#1d3f7a;margin:0 6px}
#cols{display:flex}
#side{width:200px;background:#eef2f7;border-right:1px solid #ccd;padding:12px;font-size:12px}
#side h3{margin:0 0 6px;font:bold 13px Arial,sans-serif;background:#1d4f91;color:#fff;padding:3px 6px}
#side table{width:100%;border-collapse:collapse;margin-bottom:14px}
#side td{padding:2px 0;border-bottom:1px dotted #aab}
#main{flex:1;padding:14px 20px}
#main h2{font:bold 20px Georgia,serif;color:#1d4f91;margin:0 0 8px}
#main h4{font:bold 14px Arial,sans-serif;color:#a33;margin:16px 0 4px}
.news{border:2px dashed #e8b100;background:#fffbe6;padding:8px;margin:12px 0;color:#7a4b00;font-weight:bold}
a{color:#00c}
#foot{border-top:1px solid #ccd;padding:8px;text-align:center;font-size:10px;color:#666;background:#f4f4f4}
</style></head><body><div id="wrap">
<div id="banner"><h1>Northstar Veterinary Clinic</h1><p>Caring for the pets of Northstar and the mid-valley</p></div>
<div id="nav"><a href="#">HOME</a>|<a href="#">ABOUT US</a>|<a href="#">SERVICES</a>|<a href="#">OUR TEAM</a>|<a href="#">PHARMACY</a>|<a href="#">CONTACT</a></div>
<div id="cols"><div id="side">
<h3>Clinic Hours</h3><table>
<tr><td>Mon - Thu</td><td>8:00am - 6:00pm</td></tr><tr><td>Friday</td><td>8:00am - 5:00pm</td></tr><tr><td>Saturday</td><td>9:00am - 1:00pm</td></tr><tr><td>Sunday</td><td>Closed</td></tr></table>
<h3>Contact Us</h3><p>100 Constellation Way<br>Northstar, OR 97000<br><b>(555) 010-0200</b><br><a href="#">hello@northstarvet.example.test</a></p>
<h3>Pharmacy</h3><p><a href="#">Click here</a> to order refills from our online pharmacy!</p>
</div><div id="main">
<h2>Welcome to our website!</h2>
<p>Northstar Veterinary Clinic is a family veterinary clinic. Our caring team offers wellness exams, vaccines, dental care and surgery for dogs and cats.</p>
<div class="news">*** Proudly serving Albany, Corvallis, Lebanon, Tangent, Philomath and Jefferson! ***</div>
<h4>Our Services</h4><ul><li>Wellness Exams</li><li>Vaccines</li><li>Dental Care</li><li>Surgery</li></ul>
<h4>Appointments</h4><p>Please call the clinic during business hours to make an appointment.</p>
</div></div>
<div id="foot">Copyright &copy; 2012 Northstar Veterinary Clinic. All rights reserved. | Best viewed at 1024x768</div>
</div></body></html>`

// The create request, the draft job and its stages are answered in the browser:
// reading a website and writing with the model need network access and cloud
// models the capture has neither of, and the real job takes about a minute. The
// look picker and the editor that follow load the seeded draft through the real API.
async function installDraftFixture(page, ctx) {
  const site = seededSite(ctx)
  const jobId = 'd0c5d0c5-0000-4000-8000-00000000d1a7'
  let created = 0
  // The page polls every two seconds; show each stage once, then the finished draft.
  const stages = ['reading', 'writing', 'saving']
  let polls = 0
  await page.route(/\/api\/v1\/sites\/current(?:\?.*)?$/, async (route) => {
    const response = await route.fetch()
    const payload = await response.json()
    if (created || !payload.ok) return route.fulfill({ response, json: payload })
    await route.fulfill({
      response,
      // Before the site exists, as a vet first sees it, offering the seeded site's address.
      json: {
        ...payload,
        data: {
          ...payload.data,
          site: null,
          draftJob: null,
          canCreate: true,
          suggestedSubdomain: site.subdomain,
        },
      },
    })
  })
  await page.route(/\/api\/v1\/sites(?:\?.*)?$/, async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const body = route.request().postDataJSON()
    if (body?.source?.kind !== 'url') throw Error('The draft shot starts from the old website')
    created = Date.now()
    await route.fulfill({ json: { ok: true, data: { siteId: site.id, jobId } } })
  })
  const jobPath = `/api/v1/sites/${site.id}/draft/jobs/${jobId}`
  await page.route(
    (url) => url.pathname === jobPath,
    async (route) => {
      const stage = stages[polls++] ?? null
      const done = stage === null
      const at = new Date(ctx.now).toISOString()
      await route.fulfill({
        json: {
          ok: true,
          data: {
            id: jobId,
            kind: 'create',
            status: done ? 'succeeded' : 'running',
            stage,
            source: { kind: 'url', url: OLD_SITE },
            result: done
              ? { drafted: true, saved: true, notice: null, profileSuggestions: null }
              : null,
            error: null,
            progress: { sections: [], currentSection: null, previewTitle: null, previewText: null },
            notifiesByEmail: false,
            createdAt: at,
            updatedAt: at,
            finishedAt: done ? at : null,
          },
        },
      })
    },
  )
  await page.route(
    (url) => url.pathname === `${jobPath}/seen`,
    (route) => route.fulfill({ json: { ok: true, data: null } }),
  )
}

export const siteShots = {
  'old-site': {
    path: `${OLD_SITE}/`,
    app: false,
    duration: 12,
    disclosure: "Demo page standing in for the practice's old website",
    setup: async (page) => {
      await page.route(`${OLD_SITE}/**`, (route) =>
        route.fulfill({ contentType: 'text/html', body: oldSiteHtml }),
      )
    },
    ready: (page) =>
      expect(page.getByRole('heading', { name: 'Northstar Veterinary Clinic' })).toBeVisible(),
    act: async (page) => {
      await wait(1500)
      await page.mouse.move(520, 420, { steps: 12 })
      await page.mouse.wheel(0, 160)
      await wait(4000)
    },
  },
  draft: {
    path: builder(),
    app: false,
    sites: true,
    duration: 40,
    disclosure: 'Website reading and drafting simulated',
    reset: resetSite,
    // Leave the shared capture database on the seeded, unpublished draft.
    restore: resetSite,
    setup: (page, ctx) => installDraftFixture(page, ctx),
    ready: (page) =>
      expect(page.getByPlaceholder('yourpractice.com')).toBeVisible({ timeout: 90000 }),
    act: async (page) => {
      await wait(1500)
      const url = page.getByPlaceholder('yourpractice.com')
      await point(url)
      await url.pressSequentially('northstarvet.example.test', { delay: 70 })
      await wait(800)
      await point(page.getByRole('button', { name: 'Write My First Draft' }))
      await expect(page.getByRole('heading', { name: 'Writing your first draft' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Pick a look' })).toBeVisible({
        timeout: 60000,
      })
      await wait(2500)
      await page.mouse.move(900, 520, { steps: 15 })
      await wait(4000)
    },
  },
  editor: {
    path: builder(),
    app: false,
    sites: true,
    duration: 24,
    reset: resetSite,
    // Leave the shared capture database on the seeded, unpublished draft.
    restore: resetSite,
    ready: editorReady,
    act: async (page) => {
      await wait(1500)
      await point(sectionRow(page, 'Hero'))
      const tagline = page.getByLabel('Tagline')
      await expect(tagline).toBeVisible()
      await wait(1500)
      await point(tagline)
      await page.keyboard.press('ControlOrMeta+a')
      await wait(300)
      await tagline.pressSequentially('Unhurried care for mid-valley pets.', {
        delay: 60,
      })
      await wait(1500)
      await page.mouse.move(1100, 500, { steps: 15 })
      await wait(5000)
    },
  },
  look: {
    path: builder('look'),
    app: false,
    sites: true,
    duration: 20,
    reset: resetSite,
    // Leave the shared capture database on the seeded, unpublished draft.
    restore: resetSite,
    ready: async (page) => {
      await editorReady(page)
      await expect(page.getByRole('button', { name: 'Browse Looks' })).toBeVisible()
    },
    act: async (page) => {
      await wait(1200)
      const colors = page.getByRole('radiogroup', { name: 'Colors' }).getByRole('radio')
      await point(colors.nth(1))
      await wait(2500)
      await point(page.getByRole('button', { name: 'Browse Looks' }))
      await wait(2500)
      const look = page.getByRole('radio', { name: 'Clean', exact: true })
      await point(look)
      await wait(2000)
      await point(page.getByRole('button', { name: /^Use / }))
      await expect(page.getByRole('progressbar', { name: 'Applying the look' })).toHaveCount(0, {
        timeout: 30000,
      })
      await wait(4000)
    },
  },
  details: {
    path: builder(),
    app: false,
    sites: true,
    duration: 24,
    reset: resetSite,
    // Leave the shared capture database on the seeded, unpublished draft.
    restore: resetSite,
    ready: editorReady,
    act: async (page) => {
      await wait(1200)
      for (const name of ['Service area', 'Hours', 'Pharmacy']) {
        await point(sectionRow(page, name))
        await wait(3500)
        await point(page.getByRole('button', { name: 'Back to sections' }))
        await wait(600)
      }
      await wait(2000)
    },
  },
  address: {
    path: builder('settings:address'),
    app: false,
    sites: true,
    duration: 16,
    reset: resetSite,
    // Leave the shared capture database on the seeded, unpublished draft.
    restore: resetSite,
    ready: async (page) => {
      await editorReady(page)
      await expect(page.getByRole('textbox', { name: 'Website address' })).toBeVisible()
    },
    act: async (page) => {
      await wait(1500)
      await page.getByRole('textbox', { name: 'Website address' }).hover()
      await wait(2500)
      // Hover only: the domain flow would call the hosting provider's API.
      await page.getByRole('button', { name: 'Connect Your Own Domain' }).hover()
      await wait(4000)
    },
  },
  publish: {
    path: builder(),
    app: false,
    sites: true,
    duration: 20,
    reset: resetSite,
    // Leave the shared capture database on the seeded, unpublished draft.
    restore: resetSite,
    ready: editorReady,
    act: async (page) => {
      await wait(1200)
      await point(page.getByRole('button', { name: 'Publish', exact: true }))
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: 'Publish your website?' })).toBeVisible()
      await wait(3000)
      await point(dialog.getByRole('button', { name: 'Publish', exact: true }))
      await expect(dialog.getByRole('heading', { name: 'Your website is live' })).toBeVisible({
        timeout: 30000,
      })
      await wait(5000)
    },
  },
  phone: {
    path: `http://northstarvet.${SITES_ROOT_DOMAIN}/`,
    app: false,
    sites: true,
    device: phone,
    duration: 20,
    reset: resetSite,
    // Leave the shared capture database on the seeded, unpublished draft.
    restore: resetSite,
    // Publish the seeded draft through the real API, as the publish shot does in the UI.
    setup: async (page, ctx) => {
      const site = seededSite(ctx)
      if (site.subdomain !== 'northstarvet') throw Error('Seeded website address changed')
      const response = await page.request.post(`${ctx.baseURL}/api/v1/sites/${site.id}/publish`)
      if (!response.ok()) throw Error(`Publishing the seeded website failed: ${response.status()}`)
    },
    ready: (page) => expect(page.locator('h1')).toBeVisible({ timeout: 90000 }),
    act: async (page) => {
      await wait(3000)
      // Glide to the hours, then to the address that opens directions.
      for (const heading of [/hours/i, /contact|visit|find us/i]) {
        await page
          .getByRole('heading', { level: 2, name: heading })
          .first()
          .evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        await wait(4500)
      }
    },
  },
}

// A section in the editor's outline, by its name there.
function sectionRow(page, name) {
  return page
    .getByRole('list', { name: /^Sections in page order/ })
    .getByRole('button', { name, exact: true })
}
