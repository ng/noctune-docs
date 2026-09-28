# Resume the tutorial buildout

## Objective

Build the beginner-friendly noctune tutorial series through finished, reviewable
video exports: end-to-end web and iOS walkthroughs, a hybrid workflow using the
same fictional appointment, and the feature episodes in [the series plan](series-plan.md).
Produce burned-caption LinkedIn videos and clean docs videos with switchable
English VTT/SRT captions. Prepare the docs viewing experience and delivery index.
Actual social posting and public video publication are separate from this buildout.

## Starting point

- PR #73 is merged into `develop`. Continue on `feat/tutorial-series` in the existing docs worktree at
  `<primary-docs-checkout>/.codex/worktrees/tutorial-pipeline`; preserve other worktrees.
- Merged pipeline PR: [noctune-docs #73](https://github.com/ng/noctune-docs/pull/73).
- Tooling, commands, and provider configuration: [README](README.md).
- Current storyboard: `tutorials/first-encounter-web.json`.
- Local review: `<primary-docs-checkout>/.capture/tutorials/2026-09-28/first-encounter-arcas/delivery/review.html`.
- Current draft is approximately 88 seconds with 27 caption cues. It uses still
  screenshots and designed instruction cards, not a continuous interaction capture.
- User approved the current visual direction on September 28, 2026. Keep Deepgram
  Arcas, the horizontal owl/wordmark, sage/teal palette, light browser frame,
  designed checklist/sequence cards, and both caption delivery modes. Keep TTS
  provider-neutral. The local key is already in the primary docs checkout's ignored
  `.env.tutorials.local`; do not expose or commit it.
- Local full checks and rendered-frame QA passed. Full listening review remains
  outstanding; do not mark it passed based on caption transcription.
- Full adversarial review found six Minor issues and no merge blockers. The six
  fixes now have regression coverage on `feat/tutorial-series`; tracking task
  `noctune-docs-4` precedes the remaining buildout (`noctune-docs-3`).
- CodeRabbit had no reviews or inline findings at the last check. It explicitly
  skipped automatic review because auto reviews are disabled. A green CodeRabbit
  status is not evidence that a review ran. Check again on resume and address
  actionable findings if present. No manual review request has been posted.

## Current recording checkpoint

- PR #74 contains the six review fixes and the web capture tools. The first local
  full check passed; GitHub Actions is currently limited by account billing.
- All seven web scenes have real app footage in `.tutorial-output/web-interactions`.
  Recording includes pause/resume/stop and **Process 1 file**, using isolated upload
  API/storage fixtures. Composition explicitly labels the simulated cloud services.
- The review shot verifies citation highlighting, audio seeking, and transcript
  navigation together. A reserved tutorial note version adds the weight citation;
  playback uses Core’s 284-second synthetic WAV fixture with proper range responses.
- Edit/save/complete and discharge/no-reply preparation are captured. No email is sent.
  Core PR #833 removes the Accepted badge and fixes saved clinical edits being hidden
  by original content blocks. Both fixes pass local pre-push checks and visual capture.
- All held cards can now be replaced with inspected footage via `prepare-media`
  `review,edit,send`. The approved fallback storyboard remains unchanged.
- Both exports live under `.tutorial-output/first-encounter-recorded/delivery` and are
  copied to the primary docs `.capture/tutorials/2026-09-28/first-encounter-recorded/`.
  Unchanged scenes reuse approved Arcas audio. The clean player loads all 27 English
  cues and toggles captions correctly. Full listening review remains pending.
- Frame-based in-points replace wall-clock trims: the encoded opening is matched
  to the ready UI screenshot, with raw/source timing retained in the manifest.
- The native harness is in the existing clean sibling worktree
  `.worktrees/ios-asc-capture` (from the workspace root); read its
  `docs/app-store-capture.md`. Dedicated iPhone UUID:
  `53023D75-6CCC-4084-BC77-A4B970C103FB`. Use `--reuse-fixtures` to retain native takes. A fresh ad-hoc signed capture build
  succeeded at `/tmp/noctune-asc-capture-build/Build/Products/Debug-iphonesimulator/Noctune.app`
  from Swift commit `ba48f05`; no tracked Swift files changed. Older native review
  footage includes a keyboard onboarding prompt and needs a fresh take.
- Native fixture playback still needs working development media. The explicit
  `noctune-dev` AWS profile reports a missing SSO token; the user has been asked to
  run `aws sso login --profile noctune-dev`. Verify development account `957396244983`
  before reading development SSM/media configuration. Preserve the approved disposable
  docs database and do not reseed the canonical development database.

## Execution order

1. Check PR review threads, CI, current branches, worktrees, and Ygg coordination.
   Address actionable review findings and failed checks before expanding the pipeline.
2. Audit the current web/iOS capture setup, fictional fixtures, platform capabilities,
   and exact UI labels against the written guides and app code. Reuse the approved
   capture database/authentication safeguards. If a new database must be allowlisted,
   follow the repository's independent human-confirmation requirement.
3. Implement deterministic recording of authentic web interactions. Build the first
   encounter around one fictional patient and appointment, including recording or
   upload, the actual processing button, queue/processing, clinical review, editing/saving,
   completion, discharge, and encounter-linked follow-up. Disclose processing cuts.
4. Replace eligible stills/cards with verified footage. The user clarified that the
   incorrect UI is the Accepted badge inside the note, not the header completion
   control. [Core PR #833](https://github.com/ng/noctune-core/pull/833) removes it; local capture verifies
   it is absent. Fixture audio and citation playback are now verified; use the recorded
   scenes. Never fabricate or retouch product UI.
5. Record citation/annotation navigation after the correction: click the highlight,
   show the matching transcript jump and audio seek together, then hold briefly.
   Show Discharge Notes before opening the send dialog. Verify reply-route behavior
   against the particular composer; account entitlements differ in existing handlers.
6. Build the iOS end-to-end episode using authentic native interactions and supported
   features. Align patient/appointment fixtures, then produce the hybrid episode.
   Use platform-specific narration and labels; do not imply feature parity without
   verification. Read each repository's instructions before changing its capture code.
7. Build the feature series in order: Record and recover; Review with confidence;
   Make templates your own; Discharge and follow-up; Keep the practice organized;
   Sentinel. Produce separate web/iOS episodes where supported. Split longer topics
   into focused episodes when needed for readable demonstrations.
8. Add a docs tutorial index/player experience for the completed videos, with clean
   playback and selectable English captions. Prepare a reviewable media hosting plan
   based on the existing deployment constraints before choosing final public URLs.
9. Run the acceptance checks below for each episode, refresh the delivery index and
   progress checklist, address new review feedback, run required repository checks,
   rebase/push, and verify a clean branch up to date with its remote.

## Content that must survive revisions

- General SOAP and discharge templates ship with noctune; community templates and
  custom templates are available. Keep this brief in the overview.
- Highlighted citations/annotations jump to matching audio and transcript.
- All accounts can send reviewed discharge notes. Without Nest, no-reply is the
  default. Nest adds private relay replies, hides the personal address, and routes
  the conversation back to the encounter. Avoid an Apple comparison in narration.
- Review drafts before use or sending. Saving edits and completing are distinct.
- Cover full screen, editing, transcript/audio playback, messages, past encounters,
  and the remaining web UI in focused episodes, not an exhaustive overview tour.
- No “AI narration” footer. Keep fictional-data and capture/time-cut disclosures.

## Acceptance and progress

An episode is complete only after authentic supported interactions (or deliberately
approved instructional visuals), accurate narration and UI labels, full playback
and listening review, caption timing/wording review, and successful decode checks.
Both exports must share the same narration and scene timeline. Inspect captioned
frames for clipping, overlaps, and readability. Check the clean player loads all
cues and captions can be toggled. Preserve source/timing provenance and cache safety.

- [x] Provider-neutral narration, rendering, caption alignment, and dual exports.
- [x] Approved first web draft and visual direction.
- [ ] Real web encounter capture and final web episode.
- [x] Completed-encounter UI correction verified and held shots recaptured.
- [ ] Native iOS end-to-end episode.
- [ ] Hybrid episode with fixture continuity.
- [ ] Record and recover episodes.
- [ ] Review with confidence episodes.
- [ ] Template episodes.
- [ ] Discharge and follow-up episodes.
- [ ] Organization/navigation episodes.
- [ ] Sentinel episode(s) for supported platforms.
- [ ] Docs index/player integration and media delivery plan.
- [ ] Full audiovisual QA, caption review, review-feedback resolution, and pushed changes.

Continue independent work when one shot is blocked. Record the exact dependency
and request only missing information needed to proceed. Do not mark the overall
goal complete just because the pipeline or the first draft is finished.
