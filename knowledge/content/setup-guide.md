---
title: Setup Guide
type: User Guide
description: Set up noctune in eight steps.
---

# Set up noctune in eight steps

Set up noctune's core workflow with these eight essentials. Follow them in order or jump to the feature you need.

[Video: Your first encounter — web](https://docs-media.noctune.ai/assets/e22c711bc4654c48e1c8cb87534a57c804303a06555c2b56190d8f24515b51ff/first-encounter-web.mp4)

**[Open noctune →](https://app.noctune.ai/dashboard)**

<span id="record-or-upload"></span>

## Record or upload audio

Choose **New Encounter** in the top bar or **Start an encounter** on the Dashboard. Select the patient and templates, then choose **Record from web** or drop in an existing audio file. Nothing is processed until you submit the queued recording.

![New Encounter drawer with patient, SOAP template, discharge template, browser recording, and file upload controls](https://docs.noctune.ai/screenshots/encounters/new-encounter/drawer.webp)

**[Start an encounter in noctune →](https://app.noctune.ai/dashboard)**

See [New Encounter](encounters/new-encounter.md) for the complete recording and upload workflow, including [supported formats and limits](reference/supported-formats.md).

<span id="soap-template"></span>

## Create a SOAP template

Open **Templates**, stay on **SOAP**, and choose **New Template**. A SOAP template structures the **internal clinical record**: the clinician-facing note that noctune drafts from the encounter.

![Create a custom SOAP template dialog with Copy a template, Blank, and Import starting-point tiles](https://docs.noctune.ai/screenshots/templates/new-template.webp)

**[Create a SOAP template in noctune →](https://app.noctune.ai/templates/soap?new=1)**

See [Create a custom template](templates.md#create-a-custom-template) for editing, saving, quality review, and template-writing guidance.

<span id="discharge-template"></span>

## Create a discharge template

Open **Templates**, select **Discharge**, and choose **New Template**. A discharge template structures **patient-specific take-home instructions**, such as medication directions, warnings, home care, and recheck timing.

![Create a custom discharge template dialog with the Discharge tab selected and Copy a template active](https://docs.noctune.ai/screenshots/templates/new-discharge-template.webp)

**[Create a discharge template in noctune →](https://app.noctune.ai/templates/discharge?new=1)**

Keep reusable education and delivery copy—client literature, greetings, cover messages, and signatures—in an [Email Template](email-templates.md). Email Templates are reusable message content; they are neither the internal SOAP record nor the patient-specific generated discharge.

See [SOAP templates](templates.md#soap-templates) and [Discharge templates](templates.md#discharge-templates) for defaults, placeholders, and the full workflow.

<span id="import-an-existing-template"></span>

## Import an existing template

Already have a template from another scribe or practice system? Open **Templates**, choose **New Template**, and select the **Import** tile. Name the template, paste the complete source, then choose **Organize this**. The organizer is available to every authenticated user.

![Create a custom template dialog with the Import tile selected and a pasted template ready to organize](https://docs.noctune.ai/screenshots/templates/import-paste.webp)

noctune reads the paste's structure without rewriting it. Your full paste opens as an unsaved draft with **Preview** still selected. An import banner above the editor keeps **View original paste** available and shows anything that may belong in a template of its own—for example, client-facing discharge content inside a clinical template.

Choose **Preview** to inspect the exact proposed markdown, **Create SOAP template** or **Create discharge template** to save that companion draft and remove its matched source blocks from the current draft, or **Dismiss** to keep everything together. The receipt offers **Open** and **Undo**; Undo remains available only until you edit the current draft after accepting. If the banner flags client-education or unassigned passages, use **View original paste** to identify and preserve anything you need before accepting, then verify both drafts afterward. If analysis fails, the complete paste still opens unchanged so you can organize it manually.

![Import banner suggesting a discharge template with Create, Preview, and Dismiss choices above the unsaved editor](https://docs.noctune.ai/screenshots/templates/import-proposals.webp)

**[Import a template in noctune →](https://app.noctune.ai/templates/soap?new=1)**

See [Review an imported template](templates.md#review-an-imported-template) for the complete proposal workflow and [Choose the right place for each job](templates.md#choose-the-right-place-for-each-job) for when content belongs in a SOAP template, a discharge template, or an email template.

<span id="send-discharge"></span>

## Send a discharge

Open a ready encounter, review **Discharge Notes**, then choose **Send Email → Send discharge notes**. Add the recipient and send; noctune never sends a draft automatically.

![Send Discharge Summary dialog with the patient owner email prepared and Send enabled](https://docs.noctune.ai/screenshots/encounters/detail/send-discharge.webp)

**[Open encounters in noctune →](https://app.noctune.ai/encounters)**

See [Copy, email, and complete](encounters/review-and-edit.md#copy-email-and-complete) for completion behavior and sending options.

<span id="fullscreen"></span>

## Go fullscreen

Open any encounter note and choose **Full screen** beside the View/Edit control. The note fills the window and hides the patient header and transcript; press **Esc** to leave. You can also use **⌘⇧F** on macOS or **Ctrl+Shift+F** on Windows.

![Mochi SOAP note in the distraction-free full-screen encounter view](https://docs.noctune.ai/screenshots/encounters/detail/fullscreen.webp)

**[Open encounters in noctune →](https://app.noctune.ai/encounters)**

See [Review & Edit](encounters/review-and-edit.md) for the complete note-review workspace.

<span id="markdown"></span>

## Format with Markdown

Choose **Edit** on a SOAP note or discharge summary. The toolbar above the editor adds headings, bold, italics, lists, and inline code, or you can type Markdown directly. Choose **Save** when the note is ready.

![Mochi encounter with the SOAP Markdown editor, formatting toolbar, Save, and Cancel controls](https://docs.noctune.ai/screenshots/encounters/detail/soap-edit.webp)

**[Open encounters in noctune →](https://app.noctune.ai/encounters)**

See [Edit the SOAP note](encounters/review-and-edit.md#edit-the-soap-note) for editing and audited save behavior.

<span id="messages"></span>

## Meet your inbox

Open **Messages** in the sidebar to see client replies, their patient context, and assignment status. Use **New Message** to start a conversation; encounter-linked replies stay connected to the visit.

![noctune Messages inbox with client threads, selected Mochi conversation, encounter link, assignment, and reply actions](https://docs.noctune.ai/screenshots/messages/inbox.webp)

**[Open Messages in noctune →](https://app.noctune.ai/messages)**

See [Messages](messages.md) for inbox workflows and [Messaging & Email Relay](reference/messaging.md) for delivery and reply routing.

## Keep reviewed sections and team workflows consistent

Editing an encounter section locks it against later generation. New audio updates unlocked sections and offers suggestions for locked sections. Changing your template default only affects future encounters. Read [Collaborative Notes](encounters/collaborative-notes.md) before regenerating an edited note.

In a practice, owners and admins can share templates and set practice defaults. Your own default takes precedence. In [Messages](messages.md), choose the practice inbox for shared follow-up or **You** for your personal noctune inbox; **All inboxes** shows both when available.
