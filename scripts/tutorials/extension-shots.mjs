// Chrome extension tutorial shots. Playwright can't film Chrome's real side panel,
// so the runner (capture-extension.mjs) films two pages of one Chromium profile with
// the extension loaded: the extension's stand-in practice record (its e2e test page,
// dressed here as a patient record) and the real panel app (sidepanel.html in an
// unfocused popup window). It then composes them into one window with the panel
// docked at the right. Each shot's `act` paces its actions on the film clock so
// they land on the narration; `events` it marks drive the composition and the
// editor's zooms.

// Logical stage size. Pages render at twice this (deviceScaleFactor 2) so the
// editor can zoom in without softening text.
export const STAGE = { width: 1280, height: 720, scale: 2 }
// Docked panel width and the Chrome-style header drawn above it.
export const PANEL = { width: 380, header: 40, divider: 1 }
// The order the panel itself shows (macOS modifier order).
export const SHORTCUT = ['⇧', '⌘', 'E']

// Runs in the test page. Turns the extension's test page into a plain patient
// record for the fictional Mochi: test-only controls, notes, and the event log
// are hidden; fields keep their IDs so the extension behaves as in its e2e suite.
// Save is the record's own button: a fresh element, so the test page's "must
// never be clicked" alarm is not wired to it.
export function dressRecord() {
  document.title = 'Northstar PMS · Mochi'
  document.querySelector('header h1').innerHTML =
    'Northstar PMS<span style="font-weight:400;color:#6b7a76"> · Patient record</span>'
  const patient = document.querySelector('header .patient')
  patient.innerHTML =
    '<b id="patient-name" data-patient-name>Mochi</b> · Feline, Domestic Shorthair · 5 yrs · Owner: Jamie Chen'
  const style = document.createElement('style')
  style.textContent = `
    body { background: #f4f6f5; font-size: 13px; }
    header { padding: 12px 20px; gap: 14px; }
    header h1 { font-size: 15px; }
    header .patient:nth-of-type(2), aside, .toolbar, label small, #plan-ro, label[for=plan-ro],
    #email, label[for=email], #rich-reject, main > div > section:nth-of-type(n+4),
    main > div > section:nth-of-type(2) > label, main > div > section:nth-of-type(3) > p { display: none !important; }
    main { display: block; max-width: none; padding: 14px 18px; }
    main > div { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
    main > div > section { margin: 0; padding: 12px 14px; }
    main > div > section:nth-of-type(1) { grid-row: 1 / span 2; }
    main > div > section:nth-of-type(2) { grid-column: 2; }
    main > div > section:nth-of-type(3) { grid-column: 2; }
    h2 { font-size: 11px; margin-bottom: 6px; }
    label { margin: 8px 0 4px; }
    textarea { min-height: 0; height: 148px; resize: none; font-size: 13px; line-height: 1.45; }
    #rich { min-height: 0; height: 150px; overflow: auto; font-size: 13px; }
    #rich p { margin: 0; }
    iframe { border: 0; height: 168px; }
    .record-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
    .record-save { background: #2a7f78; color: #fff; border: 0; border-radius: 8px; padding: 8px 18px; font: 600 13px -apple-system, BlinkMacSystemFont, sans-serif; }
    .record-save.saved { background: #1a5c57; }
  `
  document.head.append(style)
  const headings = document.querySelectorAll('main section h2')
  headings[0].textContent = 'Exam notes'
  headings[1].textContent = 'Plan'
  headings[2].textContent = 'Client'
  document.querySelector('label[for=subjective]').textContent = 'Subjective'
  document.querySelector('label[for=objective]').textContent = 'Objective'
  document.querySelector('label[for=assessment]').textContent = 'Assessment'
  document.getElementById('objective').removeAttribute('maxlength')
  // A practice system's assessment box is multi-line; the test page's
  // single-line input exists to test newline collapsing.
  const single = document.getElementById('assessment')
  const assessment = document.createElement('textarea')
  for (const name of ['id', 'name', 'data-field'])
    assessment.setAttribute(name, single.getAttribute(name))
  single.replaceWith(assessment)
  document.getElementById('rich').innerHTML = '<p><br></p>'
  const frame = document.getElementById('frame').contentDocument
  frame.body.style.margin = '0'
  frame.querySelector('label').textContent = 'Discharge instructions'
  const discharge = frame.getElementById('discharge')
  Object.assign(discharge.style, {
    height: '104px',
    resize: 'none',
    font: '13px/1.45 -apple-system, BlinkMacSystemFont, sans-serif',
    boxSizing: 'border-box',
  })
  const actions = document.createElement('div')
  actions.className = 'record-actions'
  const save = document.createElement('button')
  save.type = 'button'
  save.className = 'record-save'
  save.textContent = 'Save record'
  save.addEventListener('click', () => {
    save.classList.add('saved')
    save.textContent = 'Saved'
  })
  actions.append(save)
  document.querySelector('main > div > section:nth-of-type(3)').append(actions)
}

// Runs in each filmed page: a drawn pointer (screencasts omit the real one), and
// in the record, keycaps that show the shortcut beside the field being filled.
export function installOverlays() {
  if (document.getElementById('film-cursor')) return
  const cursor = document.createElement('div')
  cursor.id = 'film-cursor'
  cursor.innerHTML =
    '<svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2 L2 20 L7 15.5 L10.5 23 L13.5 21.6 L10 14.2 L17 14.2 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  Object.assign(cursor.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
    display: 'none',
    transition: 'transform 40ms linear',
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))',
  })
  document.documentElement.append(cursor)
  document.addEventListener(
    'mousemove',
    (event) => {
      cursor.style.display = 'block'
      cursor.style.transform = `translate(${event.clientX - 2}px, ${event.clientY - 2}px)`
    },
    true,
  )
  const keys = document.createElement('div')
  keys.id = 'film-keys'
  Object.assign(keys.style, {
    position: 'fixed',
    zIndex: '2147483646',
    pointerEvents: 'none',
    display: 'flex',
    gap: '6px',
    opacity: '0',
    transition: 'opacity 160ms ease, transform 160ms ease',
  })
  document.documentElement.append(keys)
  const mark = document.createElement('div')
  mark.id = 'film-sync'
  Object.assign(mark.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '48px',
    height: '48px',
    background: '#ff00ff',
    zIndex: '2147483647',
    display: 'none',
  })
  document.documentElement.append(mark)
}

// Runs in the record: keycaps just above the right edge of `box`, on the field's
// label row (the badge appears below the field), pressed briefly, then faded out.
export function showKeys({ box, keys }) {
  const holder = document.getElementById('film-keys')
  holder.innerHTML = ''
  for (const key of keys) {
    const cap = document.createElement('span')
    cap.textContent = key
    Object.assign(cap.style, {
      minWidth: '30px',
      height: '30px',
      padding: '0 8px',
      boxSizing: 'border-box',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '7px',
      background: '#ffffff',
      color: '#132d2b',
      border: '1px solid #c9d3cf',
      boxShadow: '0 2px 0 #c9d3cf, 0 4px 10px rgba(19,45,43,.12)',
      font: '600 15px -apple-system, BlinkMacSystemFont, sans-serif',
      transition: 'transform 90ms ease, box-shadow 90ms ease',
    })
    holder.append(cap)
  }
  holder.style.left = `${box.x + box.width - holder.getBoundingClientRect().width}px`
  holder.style.top = `${box.y - 38}px`
  holder.style.opacity = '1'
  setTimeout(() => {
    for (const cap of holder.children) {
      cap.style.transform = 'translateY(2px)'
      cap.style.boxShadow = '0 0 0 #c9d3cf, 0 2px 6px rgba(19,45,43,.12)'
    }
  }, 180)
  setTimeout(() => {
    for (const cap of holder.children) {
      cap.style.transform = ''
      cap.style.boxShadow = '0 2px 0 #c9d3cf, 0 4px 10px rgba(19,45,43,.12)'
    }
  }, 420)
  setTimeout(() => (holder.style.opacity = '0'), 1500)
}

// The panel slides in from the right edge with an ease-out over `slide` seconds
// from `openAt` (film seconds; at or before 0 it is open from the start).
export function panelX({ openAt, slide = 0.32, stageWidth, panelWidth }) {
  if (openAt <= 0) return String(stageWidth - panelWidth)
  return `${stageWidth}-${panelWidth}*(1-pow(1-clip((t-${openAt})/${slide},0,1),3))`
}

// FFmpeg filter that composes the record and panel recordings (inputs 0 and 1,
// trimmed to the film's start) with the panel header (input 2) into one frame.
export function composeFilter({ siteIn, panelIn, duration, openAt, slide }) {
  const s = STAGE.scale,
    width = STAGE.width * s,
    height = STAGE.height * s
  const panelWidth = PANEL.width * s,
    header = PANEL.header * s,
    divider = PANEL.divider * s
  const trim = (input, start) =>
    `[${input}:v]trim=start=${start.toFixed(3)},setpts=PTS-STARTPTS,fps=30,setsar=1`
  return [
    `${trim(0, siteIn)},crop=${width}:${height}:0:0[site]`,
    `${trim(1, panelIn)},crop=${panelWidth}:${height - header}:0:0[body]`,
    `[2:v]setsar=1[header]`,
    `[header][body]vstack=inputs=2,pad=${panelWidth + divider}:${height}:${divider}:0:color=0xDADCE0[panel]`,
    `[site][panel]overlay=x='${panelX({ openAt, slide, stageWidth: width, panelWidth: panelWidth + divider })}':y=0:eval=frame,trim=duration=${duration},format=yuv420p[v]`,
  ].join(';')
}

// Shot registry. `duration` is the film length in seconds from the first frame
// after setup. `panel` says whether the panel is docked from the start or opens
// during the shot. Times in `act` are film seconds, chosen against the narration
// timeline (tutorials/chrome-extension-web.json) with a one-second lead-in.
export const shots = {
  'move-a-note': {
    layout: 'fields',
    panel: 'closed',
    duration: 29.5,
    act: async (film) => {
      const { site, panel } = film
      await film.at(1.6)
      await film.glide(site, site.locator('#assessment'), { settle: false })
      await film.at(3.7)
      await film.openPanel()
      await film.at(6.15)
      await film.click(panel, film.listRow('Mochi'))
      await film.waitFor(panel.locator('.note-patient'), 'Mochi')
      await film.mark('note-open')
      for (const [field, clickAt, pressAt, section] of [
        ['#subjective', 9.2, 10.25, 'Subjective'],
        ['#objective', 12.2, 12.55, 'Objective'],
        ['#assessment', 13.2, 13.6, 'Assessment'],
        ['#rich', 14.05, 14.4, 'Plan'],
        ['discharge', 14.95, 15.45, 'Discharge'],
      ]) {
        const target =
          field === 'discharge'
            ? site.frameLocator('#frame').locator('#discharge')
            : site.locator(field)
        await film.at(clickAt - 0.65)
        await film.click(site, target)
        await film.at(pressAt)
        await film.press(field === 'discharge' ? site.locator('#frame') : target, section)
      }
      await film.waitFor(panel.locator('.seg-count'), '5/5')
      await film.waitFor(panel.locator('.note-footer-done-text'), 'All sections inserted')
      await film.at(17.4)
      await film.glide(panel, panel.locator('.note-footer-done-text'))
      await film.at(20.7)
      await film.click(site, site.locator('.record-save'))
      await film.mark('saved')
      await film.at(22.6)
      await film.hideCursor()
    },
  },
}
