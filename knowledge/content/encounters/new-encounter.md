---
title: New Encounter
type: User Guide
description: Record a visit or upload audio you already have.
---

# Record a visit or upload audio you already have

Start from **New Encounter** in the top bar or **Start an encounter** on the Dashboard. The same drawer handles live browser recording and existing audio files.

[Video: Record and recover — web](https://docs-media.noctune.ai/assets/0cc877af025b42a26d5227444863458956855a9f67dfa9d27aea2e10bd8f1046/record-and-recover-web.mp4)

![New Encounter drawer with patient, SOAP template, discharge template, browser recording, and file upload controls](https://docs.noctune.ai/screenshots/encounters/new-encounter/drawer.webp)

## Choose the patient and templates

Select a patient before recording. If the patient does not exist, type the new name and use the create option in the selector.

The two template choices have different jobs:

- **SOAP template** controls the clinician-facing note.
- **Discharge template** controls the client-facing summary.

Your personal default takes precedence over the practice default. You can choose a different available template for this encounter. Check [Billing](../settings/billing.md) for the active workspace’s plan and note allowance.

## Record in the browser

1. Select the patient and templates.
2. Choose **Record from web** and allow microphone access.
3. Use **Pause** and **Resume** when needed. The recording strip shows elapsed time, waveform history, and the active input.
4. Choose **Stop** to add the take to the queue.
5. Add another take or file if the appointment has multiple parts, then choose **Process file** or **Process files**.

![New Encounter drawer during a paused browser recording with timer, waveform, resume, stop, discard, and microphone controls](https://docs.noctune.ai/screenshots/encounters/new-encounter/browser-recording.webp)

### Move around without stopping

Closing the drawer does not end an active take. A recording dock remains available while you move through noctune; use it to return to the drawer or stop the recording. noctune also warns before a tab closes while a recording or unprocessed queue is active.

### Recover an interrupted take

While recording, noctune stores recovery chunks in the browser. After a crash or accidental close, the recovery prompt can upload, download, or discard the local take. Successful upload or explicit discard removes the recovery copy.

If local browser storage is unavailable, recording can continue in memory, but the drawer warns that crash recovery is unavailable. If the active microphone disappears, noctune attempts another input and otherwise pauses without discarding captured audio.

## Upload existing audio

Drop supported audio into the recording area or choose **browse files**. Every accepted file appears in the queue with its name and size. Remove any unwanted row before processing.

![New Encounter drawer with Mochi selected and one audio file ready to process](https://docs.noctune.ai/screenshots/encounters/new-encounter/upload-queue.webp)

See [Supported Formats & Limits](../reference/supported-formats.md) for accepted extensions and size limits.

## Record on iOS

The noctune iOS app can record an appointment and upload it into the same account. Select the patient and note templates in the app, record the visit, then stop and submit. The encounter appears in the web queue for review. The current iOS controls are shown in the app itself and can differ slightly by release.

## What happens next

Submitted audio appears under **In progress** while noctune transcribes and generates notes. When the note is ready, the encounter moves to **Needs review**. Processing problems appear under **Issues**.

![Encounter processing screen showing that the recording is being transcribed](https://docs.noctune.ai/screenshots/encounters/detail/processing.webp)

Next: follow the full [Encounter workflow](overview.md#encounter-workflow), then see [Review & Edit](review-and-edit.md) for detailed review tools.
