---
title: Browser extension
type: User Guide
description: Keep your noctune note beside your practice information management system and move it into the record one section at a time.
---

# Browser extension

<span id="what-it-does"></span>

## What it does

The noctune browser extension opens your noctune note in a panel beside your practice information management system (PIMS), on any PIMS website. Click a field in the patient record and press one key. The next section of your note goes into that field. The extension never saves, submits, or sends anything in your PIMS. You still review the record and save it there yourself.

[Video: Browser extension — move a note into your practice system](https://docs-media.noctune.ai/assets/c197dfd348faaa8a2974615bc91476c1c0a47c4450ff0c02b6522cd0ba3d0723/chrome-extension-web.mp4)

<span id="requirements"></span>

## Before you start

You need a noctune account. If you don't have one yet, [sign up at app.noctune.ai](https://app.noctune.ai/sign-up). The extension works in Chrome on a Mac or Windows computer. It doesn't work in other browsers or on phones and tablets yet.

If your PIMS is a program installed on Windows, or runs in a Remote Desktop or Citrix window, the extension can't reach it. Use [noctune for Windows](windows-app.md) instead.

<span id="install"></span>

## Install the extension

1. Open the [noctune listing in the Chrome Web Store](https://chromewebstore.google.com/detail/noctune/kcknienoooaaaagldfclmkfhodnfjhjf) and choose **Add to Chrome**. The listing isn't searchable in the store, so use this link.
2. Select the puzzle-piece icon in the Chrome toolbar, then select the pin next to **noctune**. The noctune icon now stays in your toolbar.
3. Select the noctune icon to open the panel on the right side of the window.

<span id="sign-in"></span>

## Sign in and choose a practice

Sign in with the same account you use for [noctune on the web](https://app.noctune.ai): **Continue with Google**, **Continue with Apple**, or your email and password.

If you belong to a practice, choose where your notes come from:

- **Personal** shows your own notes.
- A practice name shows that practice's notes. Your role (such as Owner or Veterinarian) appears under its name.

To switch later, use the dropdown at the top of the panel. If you don't belong to a practice, the panel just shows **Personal**.

<span id="move-a-note"></span>

## Move a note in 3 steps

Pick a note from the list in the panel. Then:

1. **Open the patient record** in your PIMS, in the same Chrome window.
2. **Click a field**, such as the Subjective box.
3. **Press Command-Shift-E** on a Mac or **Ctrl-Shift-E** on Windows.

The first section goes into the field. Click the next field and press the shortcut again. Each press adds the next section.

You can also select **Insert** on any section in the panel. It goes into the field you last clicked.

<span id="badge"></span>

### The badge

A small badge appears near the field each time you press the shortcut. It tells you what went in and what comes next, for example: **✓ Subjective → Max · Next: Objective**. It fades after a few seconds.

<span id="confirm"></span>

### Press again on a new page

The first time you press the shortcut on a page, noctune checks with you first. The badge asks **Insert Max's note here? Press ⇧⌘E again**. Press the shortcut again within 10 seconds to insert. After that, each press on that page inserts straight away.

<span id="same-field"></span>

### Still in the same field

If you press the shortcut without moving to a new field, the badge warns you, for example: **Still in the Subjective field. Press again to add Objective here.** Press again within 3 seconds if you really want both sections in one field. Otherwise, click the next field first.

<span id="copied"></span>

### If you weren't in a field

If no field was selected, or the field wouldn't take the text, noctune copies the section instead. The badge reads **Copied Subjective — press ⌘V**. Click the field and press **Command-V** (Mac) or **Ctrl-V** (Windows) to paste it. That section stays next, so nothing is skipped.

<span id="undo"></span>

### Undo an insert

To take text back out of a field, press **Command-Z** (Mac) or **Ctrl-Z** (Windows) in your PIMS, just like undoing your own typing.

To send a section again, select it in the panel. It becomes the next section, and your next press inserts it. You can also choose **Insert** on it. The tick stays; nothing is removed from your PIMS.

<span id="progress"></span>

### Track your progress

- The bar at the top of the note shows how many sections are in, such as **2/5**.
- The next section stays open and highlighted. Sections that are in shrink to one line with a tick.
- Select any section, finished or not, to make it next. You can move through the note in any order.
- When every section is in, the panel shows **All sections inserted**. Select **Start over** to go through the note again from the top.

Before you insert, check the patient name at the top of the note. On some PIMS websites, a dot shows whether the open patient record matches. Green means it matches; amber means the page shows a different patient.

<span id="whole-note"></span>

## Whole note mode and Copy

Some PIMS websites have one large box for the whole visit. Select **Whole note** at the top of the note, then click the box and press the shortcut once. The full note goes in, and every section is ticked. Select **Sections** to go back. The panel remembers your choice.

Every section also has a **Copy** button. Use it to paste a section anywhere yourself.

<span id="find-a-note"></span>

## Find a note

The list shows your notes newest first, under **Today**, **Yesterday**, and **Earlier**. Select **Load more** at the bottom for older notes.

Type in **Search patients** to filter the list. Matching patients appear at the top; select one to see only their notes. Older notes that match appear under **Older matches**. Use the arrow keys and Enter to pick a result without the mouse.

Some notes show a status label:

| Label                                           | What it means                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Waiting**, **Transcribing**, **Writing note** | noctune is still working on it. It updates on its own.                                 |
| **Needs credit**                                | Add credit to finish the note. Selecting it opens noctune.                             |
| **Failed**                                      | noctune couldn't finish the note. Selecting it opens noctune, where you can try again. |

<span id="site-access"></span>

## Use noctune on a site every time

The shortcut works on any website without extra setup. When you press it, Chrome lets noctune use that one tab until you leave the page.

To skip that step on your PIMS, the panel may ask **Use noctune on your-pims.com every time?** Select **Allow**, then confirm in Chrome. This lets noctune put text into fields on that one website whenever you ask it to. It doesn't give noctune access to any other website. Select **Not now** to hide the question for that site.

To remove this access later, select the puzzle-piece icon in the Chrome toolbar, then open the menu next to **noctune**.

<span id="shortcut"></span>

## Change the shortcut

Open the **⋯** menu at the top of the panel and select **Change shortcut**. Chrome opens its shortcut settings, where you can pick a different key.

If another extension already uses Command-Shift-E or Ctrl-Shift-E, Chrome may leave noctune's shortcut unset. The panel then shows **Shortcut not set · Set shortcut**. Select **Set shortcut** to choose one.

<span id="privacy"></span>

## Privacy and safety

- The extension only reads your notes. It never changes anything in noctune.
- It never saves, submits, or sends anything in your PIMS. You do that yourself.
- It only reaches a website when you press the shortcut there, or on sites you allowed.
- Note text is never stored on your computer. Chrome keeps only your sign-in and a few settings, such as your practice and the sites you allowed. Signing out clears your notes from the extension.
- The extension doesn't collect analytics on what your notes say.

<span id="troubleshooting"></span>

## Troubleshooting

**The list is empty for my practice.** Your notes may be under Personal. Select **Switch to Personal**, or use the dropdown at the top of the panel.

**The shortcut does nothing.** Check that a shortcut is set (see [Change the shortcut](#shortcut)). Make sure you opened a note in the panel first. With no note open, the shortcut just opens the panel.

**The text didn't appear in the field.** Some fields won't accept text from extensions. noctune copied the section for you, so click the field and paste it with Command-V or Ctrl-V.

**Sign-in opened the noctune dashboard instead of signing me in.** This was fixed in a recent update. Open `chrome://extensions`, find noctune, and select the reload button. Then sign in again from the panel.

<span id="known-limits"></span>

## Known limits

- noctune doesn't yet know which field each section belongs in. You choose the field each time.
- The patient name check only works on PIMS websites where noctune can read the patient's name. Elsewhere, check the name yourself.
- The extension works only in Chrome on a desktop or laptop computer. For a PIMS installed on Windows, see [noctune for Windows](windows-app.md).
