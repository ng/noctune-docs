---
title: Messages
type: User Guide
description: Read client replies and what you have sent.
sources:
  - id: core-1
    resource: https://github.com/ng/noctune-core/blob/33734aea/src/components/messages/InboxSwitcher.tsx
  - id: core-2
    resource: https://github.com/ng/noctune-core/blob/33734aea/src/components/messages/NewMessageDialog.tsx
  - id: core-3
    resource: https://github.com/ng/noctune-core/blob/33734aea/src/components/messages/MoveToPracticeDialog.tsx
---

# Read client replies and what you have sent

Messages brings together encounter replies and direct mail for your personal noctune inbox and your active practice inbox. **Sent** keeps the outbound messages you initiated from noctune.

[Video: Discharge and follow-up — web](https://docs-media.noctune.ai/assets/25b6dfe3ea85748629276310c3588f5bfb4b36547bdf0950f446f07aaf221ac6/discharge-follow-up-web.mp4)

![noctune Messages inbox with two client threads, selected Mochi conversation, encounter link, assignment, and reply actions](https://docs.noctune.ai/screenshots/messages/inbox.webp)

## Inbox and Sent

Use the top tabs to switch between incoming and outgoing mail. Inbox filters include **All**, **Unread**, **Flagged**, **Last 7 days**, and **Archived**. In a practice workspace, **Assigned to me** and **Unassigned** help divide follow-up work.

Choose a thread to read the message history. Encounter-linked replies show the patient and a **See encounter** action, so you can move directly to the SOAP note, transcript, and clinical context. Assignment is visible in the list for team triage.

Use **Search messages** to match the subject, body, sender name, or sender address. [Global search](navigation-and-search.md#direct-text-matches) finds recent message senders but does not search message content.

## Personal and practice inboxes

When both inboxes are available, choose **All inboxes**, the **practice name**, or **You** above the message list. Each inbox shows its own address and unread count. With only one available inbox, noctune shows its address instead of the switcher. Use the copy action beside an address to share it.

- **Practice inbox:** shared by active members of the selected practice. Use it for client conversations your team needs to see, link to a patient, and assign.
- **You:** your personal noctune inbox, visible only to you. It remains separate from the practice inbox even when you view **All inboxes**. Assignment filters are hidden in this scope.
- **All inboxes:** combines the active practice inbox with your own personal inbox. It never reveals another teammate's personal mail.

Inbox availability depends on relay access. A personal relay entitlement or a paid seat in a relay-enabled practice can enable your personal inbox. The practice inbox depends on the practice's own plan. Switching practices changes which shared inbox you see.

Your personal noctune inbox is different from **Your personal email**, the reply route that sends replies to your external email account.

### Move a personal conversation to the practice

Open a direct thread in your personal inbox and choose **Move to practice inbox** when available. The confirmation names the practice and explains that everyone there will see the conversation and future replies will use the practice address. After moving, you can link it to a patient and assign it to a teammate.

A moved thread shows where it came from. **Undo** returns messages that came from your own personal inbox; it does not take the practice's own messages with it. Review the destination before moving a private conversation.

## noctune Nest

When an outbound message uses Nest, a client reply returns to noctune without exposing your personal address. A reply to an encounter-linked message remains associated with that encounter; a reply to a global message returns to the Messages inbox.

See [Messaging & Email Relay](reference/messaging.md) for the routing details.

## Choose how replies route

- **noctune Nest** — replies return to noctune. In an encounter composer, the option is labeled **This encounter**; elsewhere it is **The Nest** or the patient's Nest.
- **noctune (no reply)** — a one-way message from `noreply@mail.noctune.ai`.
- **Your personal email** — replies go to your external email inbox, and your address is shared with the recipient.

## Start a message

Choose **New Message** in the top bar or from a thread. Add one or more **To** recipients, reveal **Bcc** if needed, choose the **From** inbox, enter a subject and message, and send. Under **All inboxes**, the practice inbox is the default when available; choosing **You** starts from your personal inbox. Practice sends use the practice address and return replies to the shared inbox. Personal sends offer the reply routes described above. The composer supports a practice footer when a practice workspace is active.

![New message composer with the From picker showing practice and personal noctune inboxes](https://docs.noctune.ai/screenshots/messages/composer.webp)

### Insert an email template

Choose **Templates** to search your [Email Templates](email-templates.md). Insertion preserves text already in the draft, fills an empty subject, and resolves available merge fields. Use the immediate **Undo** action if you picked the wrong template.

Unresolved fields appear with an explanation. Fix the recipient or source data, edit the draft, or explicitly confirm **Send anyway**; the unresolved text is delivered if you proceed.

### Reply to a thread

Open the thread and choose **Reply**. Replies use the thread’s inbox. Practice replies return to the shared practice address; personal replies retain their routing choices. Both support templates and merge-field checks.

## Review Sentinel-flagged work

The **Flagged** filter narrows Inbox to encounters where [noctune Sentinel](reference/sentinel.md) detected hostile behavior. The list keeps the patient, owner, subject, assignment, and safety label together.

![Messages inbox filtered to the Sentinel-flagged Jasper conversation](https://docs.noctune.ai/screenshots/messages/flagged.webp)

## Unread badge and notifications

The sidebar badge reflects unread messages. The notification matrix also shows the current email and push defaults for new client replies under [Notifications](settings/notifications.md).
