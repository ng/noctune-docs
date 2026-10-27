---
type: Social Post
title: Keep the reviewed parts of the note
description: LinkedIn draft for the week of October 26, 2026, showing section locks and team follow-up.
status: draft
tags:
  - linkedin
  - soap
  - collaboration
  - inboxes
---

# Keep the reviewed parts of the note

Suggested posting date: Tuesday, October 27, 2026. Draft only; not scheduled or published.

## Post

```text
The history is corrected. The exam is reviewed.
Then someone adds the treatment recording.

That new recording should help finish the note without undoing the work your team already checked.

In noctune, editing a SOAP section locks it. Later recordings update the unlocked sections. If new information belongs in a locked section, it appears as a suggestion for review.

You can also lock a section without editing it, or regenerate one unlocked SOAP section and review the proposed rewrite before accepting it.

Templates set the structure. Section locks protect the reviewed text in that visit. The final note still needs your clinical review.

Practice templates are locked too. Owners and admins set the clinic's standard; everyone else can use it, make it their default, or duplicate it to adapt their own version.

And when the visit turns into follow-up, Messages now brings together your personal noctune inbox and the practice inbox. Personal mail stays private; practice conversations are shared with the team. You choose when to move a personal thread into the practice.

Where does your team most often hand off the note: after intake, after the exam, or after treatment?

#VeterinaryMedicine #VeterinaryTeam #noctune
```

## First comment

```text
Here’s the section-by-section workflow, including who can unlock a section and how suggestions work:
https://docs.noctune.ai/encounters/collaborative-notes

Personal and practice inboxes:
https://docs.noctune.ai/messages
```

## Visuals

Use the original PNG exports from the regenerated synthetic product captures, in this order:

1. [Section cards](assets/2026-10-27/collaborative-section-cards.png): a technician's locked history, the veterinarian's locked exam, and the remaining AI sections.
2. [Suggestion](assets/2026-10-27/collaborative-suggestion.png): proposed new information beside the locked section with Add line and Keep mine.
3. [Locked practice template](assets/2026-10-27/templates-practice-locked.png): a practice member's read-only view, with the padlock note that only owners and admins can edit.
4. [Messages](assets/2026-10-27/messages-inbox.png): the practice and personal inbox switcher.

The images use synthetic capture data. The existing tutorial videos predate the inbox and template-library redesign; use these current screenshots for this post.

Suggested image alt text: “Synthetic noctune encounter showing individually locked SOAP sections and a proposed update for clinician review.” For the template image: “noctune practice template open read-only for a practice member, with a note that only owners and admins can edit it.” For the inbox image: “noctune Messages with separate personal and practice inbox scopes.”

## Source checks

- [Collaborative notes](../../content/encounters/collaborative-notes.mdx)
- [Templates and locked note sections](../../content/templates.mdx)
- [Practice templates](../../content/templates.mdx#practice-templates)
- [Messages and moving a conversation](../../content/messages.mdx)

These behaviors were checked against noctune Core develop revision `33734aea`; the practice-template lock was checked against develop revision `96542a95`. Recheck the deployed app and the linked documentation before posting next week.

## Reproduce the image exports

Run `pnpm screenshots:update`, inspect the contact sheets, then run `pnpm social:export`. The export checks that each original browser PNG produces the committed WebP under the screenshot policy before copying it into this campaign. It never enlarges or retouches the product UI. Keep the PNGs in Git LFS.
