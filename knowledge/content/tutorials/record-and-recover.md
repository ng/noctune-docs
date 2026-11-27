---
title: Record and recover
type: Tutorial
description: Keep a recording safe through calls and closed apps.
sources:
  - id: swift-1
    resource: https://github.com/ng/noctune-swift/pull/190
  - id: swift-2
    resource: https://github.com/ng/noctune-swift/pull/191
  - id: swift-3
    resource: https://github.com/ng/noctune-swift/pull/184
---

# Keep a recording safe through calls and closed apps

Record in the browser or on iPhone, upload audio you already have, pick up a recording that was interrupted or never finished uploading, and get back one you discarded by mistake.

## On the web

[Video: Record and recover — web](https://docs-media.noctune.ai/assets/434e1c3ddf6de6bcb67f27a42f47792876d72cc53bbcb594f39d37ebf90a71ca/record-and-recover-web.mp4)

## On iPhone

[Video: Record and recover — iPhone](https://docs-media.noctune.ai/assets/52d6a01df33d634ffeb3b5558973aed5af1b59fe50fa4a752751a50e43460801/record-and-recover-ios.mp4)

### Get back a recording you discarded

In the iOS app, discarding a recording doesn't delete it straight away. It moves to **Recently deleted** on the same iPhone or iPad, where you can recover it for up to 31 days. Nothing is uploaded while it's there.

You can discard a recording in two places:

- **In the recorder:** choose **More** (**…**) at the top, then **Discard recording…**, and confirm with **Discard recording**. A message confirms the recording moved to Recently deleted.
- **In a recording that didn't finish uploading:** open **You → Not yet uploaded**, choose **Discard** on the recording, then **Discard recording**.

To recover it:

1. Open the **You** tab and, under **Recording**, choose **Recently deleted**.
2. Find the recording by its patient, the time it was recorded, and its length. Play it first if you want to check it's the right one.
3. Choose **Recover**. The recording goes back under **Not yet uploaded**. Choose **Show** to open that list, then upload it to send it for transcription.

Each recording in Recently deleted shows how long it has left, for example **Deleted for good in 12 days**. When that time runs out, it's deleted from the device for good. To remove one sooner, choose **Delete**, or choose **Delete all** to empty the list. A discarded recording was never uploaded, so once it's deleted there's no other copy.

A few things to know:

- **Only you can see your discarded recordings.** Recently deleted lists only the recordings made by the account that's signed in.
- **They stay on that device.** A recording discarded on one iPhone can't be recovered from another device or from the web.
- **A recording can be removed before its 31 days are up.** Deleting your account removes your recordings from the device, including discarded ones. On a shared device, if you haven't used noctune on it for more than 30 days, your recordings on it are removed the next time someone else signs in.
- **A recording with no audio isn't kept.** If a take captured nothing, discarding it deletes it.

### When you sign out or your sign-in expires

A recording that hasn't uploaded yet stays on the device when you sign out, and it uploads after you sign back in to the same account. Only the account that recorded it can see it or upload it.

If your sign-in expires during a visit, the recording keeps going. If it's still expired when you stop, noctune saves the recording and returns you to sign in, and the recording uploads after you sign back in. If you sign out yourself while a recording is in progress, the recording stops and is saved.
