---
type: Production Guide
title: Chrome extension videos and screenshots
description: Storyboards for the hand-recorded browser extension videos and the screenshot list still needed for the guide.
---

# Chrome extension videos and screenshots

These assets support the [Browser extension guide](../content/browser-extension.md).

Video 1 is produced by the tutorial pipeline as the `chrome-extension-web` episode: the
`capture-extension.mjs` source films the real panel app beside the extension's demo patient
record and composes the panel docked at the right (see
[Narrated tutorials](../tutorials/README.md#browser-extension-episode-13)). Videos 2 and 3 have
no capture shot or narration yet. Record those by hand in real Chrome with QuickTime Player or
Screen Studio, or add shots to `scripts/tutorials/extension-shots.mjs`. `pnpm screenshots:update`
still cannot render the side panel. Never fake or mock the panel, and never use production or
customer data. Sign in with a disposable capture account whose notes come from the synthetic
capture seed.

## Recording setup

- Chrome desktop, a clean profile with only the noctune extension installed and pinned.
- Window 1440 × 900, side panel open at its default width, bookmarks bar hidden.
- A demo PMS page with separate Subjective, Objective, Assessment, and Plan fields,
  plus one page with a single large notes box for whole note mode.
- macOS with the default shortcut (Command-Shift-E). Show key presses with an on-screen
  keystroke overlay.
- Synthetic patient: Max, canine, owner Sam Rivera. At least one Today note, one
  Yesterday note, one Needs credit note, and a practice with notes alongside Personal.

<span id="video-move-a-note"></span>

## Video 1: Move a note in 3 keystrokes

Target length 30–35 seconds. Shows the main flow from an open note to a finished record.

**Shot list**

1. The PMS patient record for Max on the left, the noctune panel on the right with Max's
   note open and Subjective highlighted as next.
2. Click the Subjective field. Press Command-Shift-E. The badge asks to confirm.
3. Press again. Subjective fills the field; the badge confirms and names Objective next.
4. Click the Objective field, press the shortcut. Repeat for Assessment and Plan.
5. The panel's progress bar fills; finished rows shrink to one line with ticks.
6. The success banner reads All sections inserted. Hold, then end on the filled record.

**On-screen text**

- "Click a field"
- "Press ⌘⇧E"
- "Press again to confirm on a new page"
- "Each press adds the next section"
- "You still review and save in your PMS"

| Time   | Shot | On-screen text                          | Action                                 |
| ------ | ---- | --------------------------------------- | -------------------------------------- |
| 0–4s   | 1    | —                                       | Establish record and panel             |
| 4–9s   | 2    | "Click a field" then "Press ⌘⇧E"        | Click Subjective, press shortcut       |
| 9–13s  | 3    | "Press again to confirm on a new page"  | Second press; Subjective appears       |
| 13–25s | 4    | "Each press adds the next section"      | Objective, Assessment, Plan            |
| 25–29s | 5    | —                                       | Progress bar and ticks                 |
| 29–34s | 6    | "You still review and save in your PMS" | Success banner, then the filled record |

<span id="video-whole-note"></span>

## Video 2: Whole note mode

Target length 20–25 seconds. Shows a PMS page with one large box.

**Shot list**

1. A PMS page with a single notes box; the panel shows Max's note in Sections mode.
2. Select Whole note in the panel's toggle.
3. Click the notes box and press Command-Shift-E (confirm press included).
4. The full note fills the box; the badge reads ✓ Whole note → Max; every section ticks.
5. Select Copy on the Plan section to show copying a single section, then end.

**On-screen text**

- "One box for the whole visit?"
- "Choose Whole note"
- "One press puts in the full note"
- "Copy any section to paste it yourself"

| Time   | Shot | On-screen text                          | Action                         |
| ------ | ---- | --------------------------------------- | ------------------------------ |
| 0–3s   | 1    | "One box for the whole visit?"          | Establish single-box page      |
| 3–7s   | 2    | "Choose Whole note"                     | Toggle to Whole note           |
| 7–14s  | 3–4  | "One press puts in the full note"       | Click box, press, note appears |
| 14–22s | 5    | "Copy any section to paste it yourself" | Copy one section               |

<span id="video-search-and-switch"></span>

## Video 3: Search and switch practice

Target length 25–30 seconds. Shows finding a note and changing where notes come from.

**Shot list**

1. The panel's list grouped under Today, Yesterday, and Earlier, with one Needs credit chip.
2. Type "Max" in Search patients. The patient appears at the top; select it.
3. Max's notes only; select the Yesterday note to open it, then go back.
4. Open the dropdown at the top of the panel and switch from Personal to the practice.
5. The list reloads with the practice's notes. End on the list.

**On-screen text**

- "Your notes, newest first"
- "Search by patient"
- "Switch between Personal and your practice"

| Time   | Shot | On-screen text                              | Action                  |
| ------ | ---- | ------------------------------------------- | ----------------------- |
| 0–5s   | 1    | "Your notes, newest first"                  | Scroll the grouped list |
| 5–12s  | 2    | "Search by patient"                         | Type, select patient    |
| 12–18s | 3    | —                                           | Open a note, go back    |
| 18–24s | 4    | "Switch between Personal and your practice" | Change the dropdown     |
| 24–28s | 5    | —                                           | Practice notes load     |

<span id="screenshots-todo"></span>

## Screenshots still needed

The guide ships without images until these hand captures exist. Save each at the
dimensions and encoding in [image-policy.json](https://github.com/ng/noctune-docs/blob/develop/capture/image-policy.json), keep them in Git LFS,
then add `BrowserFrame` references to the guide and entries to the screenshot manifest.

- [ ] Panel sign-in screen (Continue with Google, Continue with Apple, email and password)
- [ ] Encounter list with a search in progress (patient match at top, Today and Earlier groups)
- [ ] Note view mid-way: two sections ticked, the next row highlighted, progress bar at 2/5
- [ ] In-page badge after a shortcut press (✓ Subjective → Max · Next: Objective)
- [ ] Success banner: All sections inserted with Start over
