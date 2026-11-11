---
title: Account
type: User Guide
description: Your name, identity, and encounter preferences.
---

# Your name, identity, and encounter preferences

The Account tab controls your personal identity and the encounter preferences noctune currently exposes in Settings, including where discharge emails go.

![noctune Account settings with display-name preview, inbound email identity, and auto-finish preference](https://docs.noctune.ai/screenshots/settings/account.webp)

## Display name

Your display name appears on messages, signed notes, mentions, and practice membership. The preview shows how it will look in a client reply. Edit the field and choose **Save**; the button remains disabled when nothing has changed.

The current Account tab derives the avatar initials from this name. It does not provide profile-photo upload.

## Inbound email

The inbound section shows your standing noctune mailbox under `inbox.noctune.ai`. Mail sent to that address appears in [Messages](../messages.md) without exposing your external email address. This is your private noctune inbox, shown as **You** in the inbox switcher. The practice inbox is a separate shared address.

Handle customization is gated by the available account capability. When customization is not available, the section keeps the assigned address visible and links to the relevant billing option.

<span id="encounter-preference"></span>

<span id="encounter-preferences"></span>

## Encounter preferences

The **Encounter preferences** section holds the auto-finish switch and your discharge email settings.

<span id="auto-finish-on-copy-or-send"></span>

### Auto-finish on copy or send

**Auto-finish on copy or send** marks an encounter complete when you copy the SOAP note or send a discharge message. Turn it off if you prefer to finish every encounter explicitly after those actions.

<span id="email-me-the-discharge-too"></span>

### Email me the discharge too

Turn on **Email me the discharge too** to get each discharge draft by email. It's off by default. When your SOAP note is ready, noctune sends the discharge in its own email to your account email address, next to the SOAP note ready email.

- Nothing goes to the client. The email says the draft hasn't been sent, and **Review and send** opens the encounter so you can send it.
- The discharge has its own email, so you can forward it without also forwarding the SOAP note.
- No draft email is sent when a note has no discharge.
- The email is a copy of the generated text when the note was ready. Later edits in noctune don't change it.

While the switch is on, an **Also send to** list appears below it. Each address you add there gets its own copy of the draft once it's confirmed, so recipients can't see each other's addresses. These copies say who shared them and leave out the **Review and send** link. You can't add your own account email here, because drafts already go there.

Turning the switch off stops draft emails to you and to the addresses in **Also send to**.

<span id="copy-every-discharge-i-send"></span>

### Copy every discharge I send

Addresses in the **Send a copy to** list under **Copy every discharge I send** get a hidden copy (Bcc) of each discharge you send a client, from the website or the iPhone app. Use it for a clinic inbox you keep records from. You can add your own account email here.

You can also save an address from the send window with **Always Bcc this address**. See [Always Bcc a clinic inbox](../encounters/discharge-copies.md#always-bcc-a-clinic-inbox).

<span id="add-and-confirm-an-address"></span>

### Add and confirm an address

Both lists work the same way:

1. Type the address in the field below the list and choose **Add**.
2. noctune emails that address a confirmation link. The address shows **Waiting for confirmation** and gets nothing until someone with access to that inbox confirms it. The link expires after 7 days.
3. Once confirmed, the address shows **Confirmed** and starts getting copies.

If the link has expired or never arrived, choose **Resend** next to the address. A resent link replaces the earlier one. See [For the person receiving copies](../encounters/discharge-copies.md#for-the-person-receiving-copies) for what the recipient sees.

Each list holds up to 5 addresses. The two lists are separate: an address confirmed for drafts doesn't get sent copies, and the other way round, until it's added and confirmed in that list too.

<span id="remove-an-address"></span>

### Remove an address

Choose the **×** next to an address to remove it. It stops getting copies straight away. Removing an address from one list doesn't remove it from the other.

## Sign-in credentials

Email-address changes, password changes, linked Google or Apple identities, and global sign-out are not managed by the current Account tab shown above. Use the authentication flow presented on the sign-in screen or contact support when an account identity needs administrative help.
