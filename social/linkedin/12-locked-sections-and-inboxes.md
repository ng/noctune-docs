---
type: Social Post
title: Keep the reviewed parts of the note
description: LinkedIn draft for the week of October 26, 2026, showing how technicians and veterinarians build one note through the day without losing each other's edits.
status: draft
tags:
  - linkedin
  - soap
  - collaboration
---

# Keep the reviewed parts of the note

Suggested posting date: Tuesday, October 27, 2026. Draft only; not scheduled or published.

## Post

```text
The technician records the history and fixes a detail.
The veterinarian records the exam and corrects the findings.

Then a technician adds the treatment recording. If the whole note regenerates, those corrections are gone.

So the doctor waits until everyone else is finished, and the records pile up until the end of the day.

In noctune, the team builds one note together:

1. The technician records the history. Editing Subjective locks it.
2. The veterinarian records the exam. noctune updates only the sections nobody has edited. Correcting Objective locks it too.
3. Technicians add treatments, medications, and discharge. noctune fills in the Plan and discharge notes and leaves locked sections exactly as they are.

If a later recording mentions something that belongs in a locked section, it appears as a suggestion. The veterinarian decides whether to apply it.

Need another pass on just the plan? Regenerate that one section and review the rewrite before anything changes.

Every recording creates a new version, labeled with who added it, and you can restore an earlier one.

The doctor can finish the exam between appointments instead of waiting for the end of the day. The note still needs clinical review before it's final.

How does your team hand off the note today? Does the doctor wait for everyone else to finish?

#VeterinaryMedicine #VeterinaryTeam #noctune
```

## First comment

```text
Here's the whole handoff, step by step: who can unlock a section, how suggestions work, regenerating one section, and version history:
https://docs.noctune.ai/encounters/collaborative-notes
```

## Follow-up questions

Use these to reply to commenters in the first hour:

- Who records first in your exam rooms, the technician or the doctor?
- Which section gets corrected most often: the history, the exam, or the plan?
- When a technician adds treatments late in the visit, who signs off on the final note?

## Visuals

Use the original PNG exports from the regenerated synthetic product captures, in this order:

1. [Section cards](assets/2026-10-27/collaborative-section-cards.png): a technician's locked history, the veterinarian's locked exam, and the remaining AI sections, with chips for three recordings.
2. [Suggestion](assets/2026-10-27/collaborative-suggestion.png): a later recording's proposed addition beside the veterinarian's locked exam, with Add line and Keep mine.
3. [Regenerate one section](assets/2026-10-27/collaborative-regenerate-section.png): the Plan rewrite shown for review with Apply rewrite and Discard.
4. [Version history](assets/2026-10-27/collaborative-version-history.png): each recording's version, labeled with who added it.

The images use synthetic capture data. If the section-locks tutorial video has been reviewed and published by posting time, it can lead the post instead, with these images as the fallback.

Suggested image alt text: "Synthetic noctune encounter showing individually locked SOAP sections, a proposed update for clinician review, a single-section rewrite, and version history."

## Source checks

- [Collaborative notes](../../content/encounters/collaborative-notes.mdx)
- [Templates and locked note sections](../../content/templates.mdx)

These behaviors were checked against noctune Core develop revision `33734aea`. Recheck the deployed app and the linked documentation before posting.

## Reproduce the image exports

Run `pnpm screenshots:update`, inspect the contact sheets, then run `pnpm social:export`. The export checks that each original browser PNG produces the committed WebP under the screenshot policy before copying it into this campaign. It never enlarges or retouches the product UI. Keep the PNGs in Git LFS.
