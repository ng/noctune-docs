---
title: Dental Charts (early preview)
type: User Guide
description: Get a per-tooth dental chart from a dictated dog or cat dental exam, then read, edit, review, confirm, compare, download, and email it. Early preview.
keywords:
  - dental chart
  - dental charting
  - COHAT
  - Triadan
  - tooth resorption
  - periodontal
  - early preview
sources:
  - id: core-guide
    resource: https://github.com/ng/noctune-core/blob/3d93f627/docs/dental-charting-guide.md
  - id: core-panel
    resource: https://github.com/ng/noctune-core/blob/c4a2d461/src/components/dental/DentalChartPanel.tsx
  - id: core-header
    resource: https://github.com/ng/noctune-core/blob/c4a2d461/src/components/dental/DentalChartHeader.tsx
  - id: core-drawer
    resource: https://github.com/ng/noctune-core/blob/c4a2d461/src/components/upload/DentalChartChoice.tsx
  - id: core-legend
    resource: https://github.com/ng/noctune-core/blob/c4a2d461/src/components/dental/DentalChartLegend.tsx
  - id: core-email
    resource: https://github.com/ng/noctune-core/blob/c4a2d461/src/components/email/DischargeEmailModal.tsx
  - id: core-export
    resource: https://github.com/ng/noctune-core/blob/3d93f627/src/components/dental/DentalChartExportMenu.tsx
  - id: core-tooth-editor
    resource: https://github.com/ng/noctune-core/blob/3d93f627/src/components/dental/DentalToothEditor.tsx
  - id: core-located-findings
    resource: https://github.com/ng/noctune-core/blob/3d93f627/src/components/dental/DentalLocatedFindings.tsx
  - id: core-callout
    resource: https://github.com/ng/noctune-core/blob/3d93f627/src/components/dental/DentalChartCallout.tsx
  - id: core-sample-dialog
    resource: https://github.com/ng/noctune-core/blob/3d93f627/src/components/dental/DentalSampleChartDialog.tsx
---

# Dental charts

> **Early preview.** Dental charting is new and still changing. It covers **dogs and cats**,
> adult teeth only. Every chart is a **draft until you review and confirm it**. The charts on
> this page come from invented sample dictations read by synthetic voices, about fictional
> patients.

When you dictate a dental exam (COHAT), noctune can build a dental chart beside the note: a
drawing of the dog's or cat's mouth with every tooth you mentioned, the same findings written out
tooth by tooth, and a short summary. noctune marks what it is unsure of instead of guessing, and you
can play back the moment each tooth was dictated.

This page describes the web app. A chart costs no extra credits.

## Get a chart

There are four ways to get one.

- **Dental Procedure template.** Choose **Dental Procedure** as the SOAP template in the New
  Encounter drawer. A **Dental chart** chip appears under the template pickers, and the chart is
  built after the note. Recordings made in the iPhone and Android apps with this template get
  the same chart.
- **Add it in the drawer.** With any other template, click **Add** under the template pickers
  and choose **Dental chart**. To leave the chart out of one encounter, remove the chip.
- **Add dental chart.** On a finished encounter without a chart, open **More actions** (the `⋯`
  button in the encounter header) and choose **Add dental chart**. If the patient isn't a dog or
  a cat, or the encounter has no patient, noctune first asks **Chart as a dog or a cat?** Building
  the chart from the recording can take a minute or two. The **Dental Chart** tab shows a loading
  state, then fills in by itself.
- **Accept the suggestion.** If you didn't ask for a chart but the recording gives findings for
  specific, named teeth, the encounter shows "This recording includes a dental exam. Add a dental
  chart?" Click **Add dental chart**, or close the prompt. A closed prompt doesn't come back.
  General remarks such as "teeth look good" or "mild tartar" don't trigger it.

When you add a dental chart in the New Encounter drawer for a patient that isn't a dog or a cat,
you can pick **Dog** or **Cat** there. It's optional.

![New Encounter drawer for Murphy with the Dental Procedure template chosen and a Dental chart chip below the template pickers, reading Charted from the recording, for dogs and cats](https://docs.noctune.ai/screenshots/encounters/dental/new-encounter-chip.webp)

![Oscar's encounter with the prompt This recording includes a dental exam. Add a dental chart? and an Add dental chart button](https://docs.noctune.ai/screenshots/encounters/dental/suggestion.webp)

![Smokey's finished encounter with the More actions menu open on Add dental chart, A tooth chart from this recording, and the New: dental charts from your dictation card below the encounter header](https://docs.noctune.ai/screenshots/encounters/dental/add-menu.webp)

### See a sample chart first

On a finished dog or cat encounter that has no chart, the encounter page shows a small card, "New:
dental charts from your dictation", marked **Early preview**. **See a sample chart** opens a
read-only chart of a fictional dog (Otis, a pug) or cat (Tigger, a domestic shorthair). Switch
between them with **Dog** and **Cat**, and select a tooth to hear the part of the sample
dictation it came from.

Opening the sample keeps the card. Close the card with its `×` button ("Dismiss, don't show
again") and it doesn't come back for your account, on any device. The card doesn't appear while a
suggestion is showing, once the encounter has a chart, or for other species.

![The Sample dental chart window, marked Early preview, with Dog selected and Cat beside it: the canine chart of Otis, a fictional pug, made from a sample dictation](https://docs.noctune.ai/screenshots/encounters/dental/sample-dog.webp)

If you see no **Dental chart** chip, **Add**, **More actions** menu, or sample-chart card, dental
charting isn't switched on yet. A chart an encounter already has stays readable either way.

If the browser closes during a recording, the recovered recording uses the template's choice. A
chip you added by hand isn't kept (use **Add dental chart** afterwards), and a chip you removed
from the Dental Procedure template comes back.

## Read the chart

The **Dental Chart** tab sits next to **SOAP** and **Discharge Notes**. From top to bottom:

- **Status bar.** "Draft: not yet confirmed", or **Confirmed** with who confirmed it and when. An
  edited draft also says who last edited it. The bar holds **Download**, **Confirm chart**, and
  a **More chart actions** menu (`⋯`) with **Re-extract chart** and **Change to cat chart** (or
  **Change to dog chart**).
- **Review banner**, when something needs checking. See [Review flags](#review-flags).
- **Summary.** Oral exam, occlusion, radiographs, anaesthesia, procedure notes, and home care, as
  dictated. Click **Edit** to change them.
- **The chart.** The upper jaw sits above the lower jaw, and the **patient's** right is on the
  left of the drawing, as on a standard dental chart. Beside the drawing, the quadrant lists
  (**Upper right quadrant**, **Upper left quadrant**, **Lower right quadrant**, **Lower left
  quadrant**) give every tooth by its Triadan number, grouped into incisors, canine, premolars,
  and molars, with what was said about it in words.
- **Legend.**
- **Located findings**, if any: a card for each tooth with a finding on a part of it, showing
  that tooth from the side with the finding marked. See [Located findings](#located-findings).
- **Unplaced findings**, if any: things said in the recording that couldn't be matched to a
  tooth on this chart. For example, no tooth number was heard, or the number doesn't exist for
  the species, such as 105 on a cat.

![Murphy's canine dental chart in draft: the mouth drawn in the middle with the upper right and lower right quadrant lists on the left and the upper left and lower left lists on the right, a Remaining teeth normal chip, and amber markers on flagged teeth](https://docs.noctune.ai/screenshots/encounters/dental/chart-dog.webp)

![Tigger's feline dental chart with tooth resorption findings written in the quadrant lists, including an extracted lower tooth](https://docs.noctune.ai/screenshots/encounters/dental/chart-cat.webp)

### The legend

| Drawing                  | Meaning                                                  |
| ------------------------ | -------------------------------------------------------- |
| Pale outline             | Not charted: nothing was said about this tooth           |
| Solid outline            | Normal: you called it normal, or every score given was 0 |
| Dot on the tooth         | Other findings; read the tooth's line                    |
| Red ring at the gum line | Gingivitis 1 to 3, stronger per grade                    |
| Tan fill                 | Calculus 1 to 3, darker per grade                        |
| Jagged line              | Fracture; a red mark means the pulp is exposed           |
| Notch                    | Tooth resorption                                         |
| Dashed outline           | Missing                                                  |
| Cross                    | Extracted                                                |
| Faded, single slash      | Crown amputated: the crown removed, the roots left       |
| Amber marker             | Needs review                                             |

Colour is never the only signal: every state is also written in the tooth's line. A tooth with no
entry wasn't charted. noctune never marks a tooth normal unless you said so. If you said
"everything else is normal", a **Remaining teeth normal** chip appears and the uncharted teeth draw
as normal. Remove the chip if that isn't right.

### Located findings

Below the legend, teeth with a finding on a particular part of the tooth get a card with a side
view of that tooth. A finding sits where you said: crown tip, crown, furcation, or a root.
Fractures, tooth resorption, and periapical lesions get a card even when nobody said where, drawn
at their usual place.

A pocket deeper than normal is a pin at the gum line: solid over the mesial root, the middle, or
the distal root for mesiobuccal, buccal, and distobuccal; hollow at the same place for a lingual
or palatal position, because the far side can't be seen from the cheek; and a dashed band when no
position was said. A dashed mark always means where on the tooth wasn't dictated. The cards are
for reading only; edit the tooth to change them.

![The Located findings cards on Tigger's feline chart below the legend: 108, crown amputated with stage 3 resorption, drawn from the side with its crown removed, and 407 and 409 with resorption at a site that was not dictated, marked dashed](https://docs.noctune.ai/screenshots/encounters/dental/located-findings.webp)

## Hear what was said

Click a tooth, in the drawing or in its quadrant list, to open it. Each quote in the tooth's
window has a play button: press it to play the recording from where that tooth was dictated, and
press it again to pause. The encounter's audio player and transcript follow along.

![The window for tooth 208 on Murphy's chart, showing the quote To await, calculus three, gingivitis three, buccal pocket seven millimetres with a play button, the review flag explaining the number was heard as to await, Mark reviewed, and the tooth's scores with a 7 mm pocket probed at Buccal](https://docs.noctune.ai/screenshots/encounters/dental/tooth-editor.webp)

## Edit a tooth

In the tooth's window you can set:

- the status: present, missing, extracted, unerupted, or retained root
- **Called normal**
- the calculus and gingivitis indices, mobility, furcation, and the periodontal stage
- the deepest probing depth, and **Where the deepest pocket was probed**: one of six points,
  mesiobuccal, buccal, and distobuccal, plus the three lingual points on a lower tooth or the
  three palatal points on an upper one
- findings, from searchable AVDC codes, and **Where on the tooth** each one is
- treatments, from searchable AVDC codes (a code that isn't in the list is kept as you typed it)
- the **Procedure**
- a note

"Not said" means no value was given; 0 is a real score. Clearing the depth clears where it was
probed. Click **Save**. **Remove entry** takes the tooth off the chart, after asking first.

**Procedure** records what was done to the tooth. **Extraction** marks it extracted. **Crown
amputation** keeps it present, because the roots stay, and draws it faded with a single slash; its
row reads "crown amputation". Choose **None** to clear it. Add the AVDC code (for example **CR/A ·
Crown amputation**) in **Treatments** as well. Tigger's 108 in [Located findings](#located-findings)
shows how a crown-amputated tooth looks.

To change several teeth at once, click **Select teeth**, pick the teeth, then click **Edit
selected** (or **Remove entries**, which asks first). Only the fields you change are applied to
each tooth. Findings and treatments you pick are added to each tooth rather than replacing what's
there, and a field that differs between the teeth starts blank.

If someone else saved the chart while you were editing, your save is refused, the chart reloads,
and noctune tells you it changed.

## Review flags

noctune flags what it is unsure of instead of guessing:

- a tooth number it couldn't read, such as "one of four" for 104
- left and right that may be the speaker's rather than the patient's
- a score outside its scale, such as calculus 2.5
- a contradiction, such as a probing depth said without a site that is shallower than a site
  already probed
- a probing depth above normal with no periodontal finding

Flagged teeth carry an amber marker and a **Review** tag. The review banner steps through them, for
example "2 teeth and 1 unplaced finding need review".

- **Mark reviewed** in the banner clears that item straight away.
- In the window of a flagged tooth, each flag reads "Flagged for review: …", and **Mark
  reviewed** saves your changes and clears all of that tooth's flags. noctune records who marked
  it reviewed and when, and the window shows it. **Save** alone leaves the flags open.
- Each unplaced finding has its own **Mark reviewed**, **Remove**, and play buttons.

![Bruno's chart with the review banner reading 1 tooth needs review, explaining that the side was given from the speaker's view, with Mark reviewed and the previous and next buttons](https://docs.noctune.ai/screenshots/encounters/dental/review-banner.webp)

## Confirm the chart

**Confirm chart** records that you've checked the chart. It stays off while review flags are open,
for example "Resolve 3 review flags to confirm". You don't need to mark teeth without flags
reviewed one by one. Any later edit, including one to the summary,
turns the chart back into a draft, and it needs confirming again.

![Otis's dental chart with the status bar reading Confirmed by Dr. Avery Morgan with the date and time](https://docs.noctune.ai/screenshots/encounters/dental/confirmed.webp)

## Compare with an earlier visit

When the patient has earlier charts, **Compare with** lists them by visit date. Pick one to see
what changed:

- teeth newly missing or extracted
- scores that got worse or better
- new findings
- teeth charted on only one of the two visits

A summary sits above the chart, and each changed tooth gets a marker and a line in its list. A
score recorded now but not last time reads as newly recorded, not as worse. A graded finding that
changed stage, such as tooth resorption TR1 to TR3, reads as worse or better. You can keep editing
while comparing. **Stop comparing** clears it. Charts of the other species are listed but can't be
picked.

![Pepper's chart compared with her visit last October: a summary of teeth that are worse, better, new, or newly extracted above the chart, and change markers on those teeth](https://docs.noctune.ai/screenshots/encounters/dental/compare-dog.webp)

![Tigger's chart compared with her visit a year earlier: resorption that progressed and a newly extracted tooth are marked, with a summary above the chart](https://docs.noctune.ai/screenshots/encounters/dental/compare-cat.webp)

In **Past Encounters**, encounters with a dental chart carry a **Dental chart** tag.

## Re-extract, or change dog and cat

Both actions are in the **More chart actions** menu (`⋯`) at the end of the status bar.

**Re-extract chart** builds a new chart from the recording. If the chart has been edited or
confirmed, noctune asks first, because your edits won't carry over and the new chart needs
confirming. The current chart stays as it is while the new one is built. If you save an edit
before it finishes, your edit wins and the new chart is discarded.

noctune takes the species from the patient record, because it's rarely said in the recording.
When the patient record gives no dog or cat (another species, or no patient) and you haven't
chosen, noctune uses the species the note picked up from the recording, if you said it, and the
chart says so, for example "Charted as a cat from the recording". You can choose instead:

- **At upload.** When you add a dental chart in the New Encounter drawer for a patient that isn't
  a dog or a cat, pick **Dog** or **Cat** there.
- **No patient, or not a dog or cat.** The Dental Chart tab explains why no chart was built and
  offers **Chart as dog** and **Chart as cat**.
- **Wrong mouth.** On a ready chart, **Change to cat chart** (or **Change to dog chart**) builds a
  new chart from the recording on the other mouth. noctune asks first if the chart has been
  edited or confirmed.

A species you chose stays chosen. If the patient record says otherwise, the status bar says so,
for example "Charted as a cat; the patient record says dog".

![Duchess, a horse: the Dental Chart tab says dental charts are available for dogs and cats only and offers Chart as dog and Chart as cat](https://docs.noctune.ai/screenshots/encounters/dental/species-choice.webp)

When the note is regenerated or audio is added, a chart nobody has edited or confirmed is rebuilt.
An edited or confirmed chart is kept, and you can re-extract it yourself. Added audio never starts
a chart the encounter didn't already have.

## Download

**Download** offers a PDF or an image (PNG). Both look like the chart on screen: the tooth lists
for each side either side of the mouth, grouped by quadrant and tooth type, with the key below.
The PDF adds the noctune logo, the practice and patient header on every page, and the summary; a
long chart's lists carry on to a second page. Until the chart is confirmed, the file carries a
"Draft: not yet confirmed" mark drawn into it, and the menu says so.

**Copy as text**, in the same menu, copies the chart as plain text for pasting into a practice
system that can't take a picture: the summary, one line per charted tooth in codes (for example
`108: CI 3, GI 3, pocket 6 mm DP, T/FX/CCF crown tip`), the teeth not charted, and a last line
saying whether the chart is confirmed and how many teeth need review. Until the chart is
confirmed, the text starts with a DRAFT line.

![The Download menu on Murphy's draft chart with Download PDF and Download image, each marked Draft: not yet confirmed, and Copy as text, which starts with a DRAFT line](https://docs.noctune.ai/screenshots/encounters/dental/download-menu.webp)

![The image downloaded from Murphy's draft chart, carrying the Draft: not yet confirmed mark, shown on a plain page background](https://docs.noctune.ai/screenshots/encounters/dental/export-png.webp)

## Email the chart

**With a discharge.** In the discharge email window, tick **Attach dental chart (PDF)** to attach a
plain-language copy of the chart for the client, for example "broken tooth" instead of T/FX/CCF.
The box is never ticked for you.

You can attach a chart before you confirm it. The window then says "This chart has not been
confirmed and will be sent marked as a draft", and how many teeth still need review if flags are
open. The client gets the PDF with a "Draft: not yet confirmed" mark on every page. Once the chart
is confirmed, it's attached without the mark.

![Send Discharge Notes window for Murphy with Attach dental chart (PDF) ticked and the note that the chart has not been confirmed, will be sent marked as a draft, and how many teeth still need review](https://docs.noctune.ai/screenshots/encounters/dental/discharge-attach.webp)

**With a SOAP note.** When you send the SOAP note (**Send Email**, then **Send SOAP note**), the
window also offers **Attach dental chart (PDF)**. This attaches the clinical chart, with scores and
AVDC codes. An unconfirmed chart is marked as a draft.

Either way, the chart goes to the **To** recipients. Bcc and automatic copy recipients get the
email without it unless you also tick **Also attach it for Bcc and copy recipients**. If the
patient's species no longer matches a chart built from the patient record, the option is off until
you re-extract it.

## Limits

- **Early preview.** Dental charting is new, and what you see may change.
- **Dogs and cats only.** Charts use a dog or a cat mouth. A patient of another species, or an
  encounter with no patient, gets no chart until you choose dog or cat or fix the patient.
- **Adult teeth only.** Deciduous (baby) teeth aren't drawn; anything said about them goes in a
  tooth's note.
- **No freehand drawing** on teeth.
- **Built after the recording ends**, not live.
- **Tooth numbers can be misheard.** Check flagged teeth and play back their quotes when something
  looks wrong.
- **A draft until you confirm it.** noctune doesn't decide anything clinical. Review the chart
  against the recording before you rely on it or send it.
