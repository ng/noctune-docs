---
title: Review & Edit
type: User Guide
description: Check the draft against the recording, then finish the note.
---

# Check the draft against the recording, then finish the note

Open a ready encounter to review the generated SOAP note beside the source transcript. The header keeps patient details and the main actions visible while you work.

[Video: Review with confidence — web](https://docs-media.noctune.ai/assets/88a0ef6531297e3dc7bccb2bd20b389f359eb4f81f951b92deacc5030995b3af/review-with-confidence-web.mp4)

![Mochi encounter with the generated SOAP note on the left and speaker-labeled transcript on the right](https://docs.noctune.ai/screenshots/encounters/detail/overview.webp)

## Verify the transcript and audio

Transcript segments are labeled by speaker and time. Select a segment to seek the audio player to that point. Use this when checking a dosage, measurement, name, or other clinical detail against the recording.

**Save Audio** downloads the recording when it is available. Audio access follows the [storage and retention policy](../reference/data-storage.md); the transcript and notes remain available when older audio is gated.

## Edit the SOAP note

The note is shown as one card per section. To change one section, choose the pencil on its card, make your change, and choose **Save**. Editing a section locks it so later recordings can't overwrite it. See [Collaborative Notes](collaborative-notes.md) for section locks, suggestions, and working on a note with your team.

To edit the whole note at once, switch the **View / Edit** toggle to **Edit** to work in the markdown editor. Its toolbar supports headings, bold, italics, lists, inline code, undo, and redo. Choose **Save** to create an audited edit or **Cancel** to discard the draft.

![Mochi encounter with the SOAP markdown editor, formatting toolbar, Save, and Cancel controls](https://docs.noctune.ai/screenshots/encounters/detail/soap-edit.webp)

## Regenerate with different templates

Choose **Regenerate** to open the **Regenerate Note** dialog, then select the SOAP and discharge templates for a new generated version. Earlier versions remain available from the version selector, so you can compare them or restore prior text.

Once anyone has edited or locked a section, regenerating keeps the note's current templates and updates only the unlocked sections. Locked sections stay as they are, and any changes noctune would have made to them appear as suggestions. To rewrite just one section, use [Regenerate one section](collaborative-notes.md#regenerate-one-section).

![Regenerate Note dialog with the current SOAP and discharge template selections](https://docs.noctune.ai/screenshots/encounters/detail/regenerate.webp)

## Review prior visits

Open **Past Encounters** to see the same patient's earlier notes without leaving the current appointment. Expand a prior row for its note, jump by date, or search the history for a term such as a medication or weight.

![Mochi encounter with the Past Encounters tab showing two earlier visits and a history search field](https://docs.noctune.ai/screenshots/encounters/detail/past-encounters.webp)

## Add later audio

If the visit continued, choose **Add Audio** and select another supported file. noctune appends it to the encounter, extends the transcript, and generates an updated note from the combined record. Teammates in your practice can add recordings to the same encounter too.

If anyone has already edited or locked a section, the new recording updates only the unlocked sections. Anything it would change in a locked section arrives as a suggestion you can apply or reject with **Keep mine**. See [how new recordings update the note](collaborative-notes.md#how-new-recordings-update-the-note).

## Copy, email, and complete

- **Copy** copies the open document — the SOAP note, or the discharge summary when the **Discharge Notes** tab is active — for a PIMS or another record system.
- **Complete** marks the clinical review finished. The action changes to **Completed**, while the encounter remains available.
- **Send Email** opens the encounter email choices. Choose **Send discharge notes**, add the recipient, and send the client-facing summary. In a practice, you need a paid seat to send discharge notes. Support staff can help draft the note and send free-text correspondence.
- Before completion, the discharge dialog offers **Send + Complete** as the primary action and **Send only** as an option. After completion, the primary action is **Send**.
- If **Auto-finish on copy or send** is enabled in [Account settings](../settings/account.md), copying the SOAP note or sending discharge notes can also complete the encounter.

![Reviewed encounter showing the disabled Completed action](https://docs.noctune.ai/screenshots/encounters/detail/completed.webp)

![Send Discharge Summary dialog with the pet owner email prepared and Send enabled](https://docs.noctune.ai/screenshots/encounters/detail/send-discharge.webp)
