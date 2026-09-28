# Narrated tutorials

Tutorials live with the written guides and consume authentic web/iOS captures.
Speech adapters are independent of storyboards and video rendering. Nothing here
runs during the website build or publishes videos.

## Local setup

Requires Node 24, FFmpeg/ffprobe, and the docs dependencies (`pnpm install`).
Create `.env.tutorials.local` in your primary **noctune-docs** checkout using
`scripts/tutorials/.env.example`. It is Git-ignored. Set `DEEPGRAM_API_KEY` locally;
never put credentials in storyboards, command arguments, or committed files.

```sh
# Run from the docs checkout/worktree containing these scripts.
# Set this to your PRIMARY docs checkout when working in a Git worktree.
export TUTORIAL_ENV_FILE=/absolute/path/to/noctune-docs/.env.tutorials.local

pnpm tutorials:audition tutorials/audition-profiles.json \
  .tutorial-output/auditions "$TUTORIAL_ENV_FILE"

pnpm tutorials:narrate tutorials/voice-audition.json \
  .tutorial-output/audition "$TUTORIAL_ENV_FILE"

pnpm tutorials:narrate tutorials/first-encounter-web.json \
  .tutorial-output/first-encounter/narration "$TUTORIAL_ENV_FILE"
pnpm tutorials:render .tutorial-output/first-encounter/narration \
  .tutorial-output/first-encounter/video public/screenshots
```

An explicitly exported environment variable overrides its environment-file value.
To audition another Deepgram voice without modifying the file:

```sh
TUTORIAL_TTS_MODEL=aura-2-athena-en pnpm tutorials:narrate \
  tutorials/voice-audition.json .tutorial-output/athena "$TUTORIAL_ENV_FILE"
```

## Providers

- **Deepgram**: `TUTORIAL_TTS_PROVIDER=deepgram`, `TUTORIAL_TTS_MODEL=aura-2-arcas-en`,
  and `DEEPGRAM_API_KEY`. Full `flux-*` voice IDs use `/v2/speak`; `aura-*` IDs use
  `/v1/speak`. Separate voice and direction settings are rejected for this adapter.
  Lossless FLAC is normalized locally to WAV, avoiding streaming WAV length headers.
- **OpenAI**: `TUTORIAL_TTS_PROVIDER=openai`,
  `TUTORIAL_TTS_MODEL=gpt-4o-mini-tts`, `TUTORIAL_TTS_VOICE=cedar`, and
  `OPENAI_API_KEY`. Optional `TUTORIAL_TTS_INSTRUCTIONS` controls delivery.
  The adapter has request-contract tests; it has not been exercised with a live key.
- **Other providers**: add an adapter to `scripts/tutorials/providers/` and register
  it in `providers/index.mjs`. Implement `validate(config, env)` and
  `synthesize({ text, config, env })`, returning `{ bytes, extension }` for WAV,
  MP3, FLAC, or Ogg. Keep endpoint-specific fields, authentication, and capability
  validation inside the adapter. The common pipeline does not assume one vendor's
  API format. A model served by an existing adapter can be selected through the env;
  a new vendor needs an adapter, not a change to the renderer.

Reference contracts: [Deepgram batch](https://developers.deepgram.com/docs/flux-tts/batch)
and [OpenAI speech](https://developers.openai.com/api/docs/guides/text-to-speech).

## Stories and captures

Each version 1 story contains a title and scenes with a unique slug `id`, `platform`
(`web` or `ios`), short `headline` lines, `narration`, and relative `source` path.
Optional `start` selects a point in an MP4/MOV. `disclosure` adds a visible note.
The audition story needs no visual fields because it is audio-only.

For a text-only workflow card, omit `source` and provide `instructionCard`: one to
four strings of at most 50 characters. These cards have no browser chrome and are
labeled as instruction cards, so they can hold a scene while a UI capture is blocked.
Use `disclosure` to explain the capture hold. Optional `instructionTitle` and
`instructionLabels` add a heading and row labels; `instructionStyle` selects
`checklist`, `sequence`, or `evidence` (citation-to-audio/transcript navigation).

Web sources resolve under the renderer's third argument, normally
`public/screenshots`. iOS sources resolve under its optional fourth argument,
pointing to the native capture export directory. The same scene schema supports
web-only, iOS-only, and mixed tutorials. Do not stretch a short clip, invent taps,
or substitute generated product screens. Insufficient motion footage fails the
render rather than freezing without disclosure. Stills are labeled on screen.

The initial web storyboard follows `content/encounters/index.mdx` and
`content/setup-guide.mdx`. Existing screenshots illustrate separate fixture states;
the initial draft is not a continuous recording of one appointment. Before a final
step-by-step release, capture the same synthetic appointment through every state,
including the queue and completion actions, and review labels against the current UI.
A hybrid cut also needs iOS and web fixtures aligned to the same appointment.

Keep fixture seeding in Core's `scripts/seed-docs-capture.ts`, orchestrated by the
existing docs capture runner. Reuse the database allowlist and authentication guards;
do not point capture tooling at a production or ordinary development database.
No screenshot source files are changed by the tutorial renderer.

## Outputs and checks

- Narration: normalized WAV per scene, `timeline.json`, and `narration.srt`.
- Rendering: 1920×1080 H.264/AAC MP4, SRT, manifest, and scene review PNGs/contact sheet.
- Cache: sibling `.speech-cache/`, keyed by text, provider, model, voice, and direction.
  Cache hits avoid another paid synthesis call. Delete a specific cached WAV to retry.
- Scene timings use measured speech duration plus a short pause, rounded to 30 fps.
- The narration step writes coarse scene-level SRT. Run the separate caption pass below
  for short timed phrases, WebVTT, and a captioned LinkedIn export. A 4:5 composition
  and fresh motion capture remain follow-up production work.
- Generation stages new files and preserves the previous complete output if it fails.
  Run only one process per output directory at a time.
- The renderer verifies dimensions, codecs, duration, and full decoding. Inspect all
  QA frames and watch/listen to the full video before publishing. Automatic media
  checks do not establish pronunciation, clinical accuracy, or visual quality.

`pnpm test:tutorials` covers provider routing, secret-safe failures, cache reuse,
voice changes, failed-output preservation, mixed-platform rendering, timing, and
source-path constraints. `pnpm check` includes these tests without calling paid APIs.
Generated media stays ignored. Publish reviewed videos to a chosen media destination;
do not check large generated videos into ordinary Git history.

## Captions and browser presentation

Web footage sits in a light browser frame with an address field, rounded outer corners,
and a soft shadow. iOS footage retains its phone frame. Both layouts reserve space below
the product UI for a maximum of two caption lines. The horizontal logo remains visible.

```sh
pnpm tutorials:captions .tutorial-output/first-encounter/narration \
  .tutorial-output/first-encounter/captions "$TUTORIAL_ENV_FILE"
pnpm tutorials:caption-video .tutorial-output/first-encounter/video \
  .tutorial-output/first-encounter/captions .tutorial-output/first-encounter/delivery
```

The timing pass uses Deepgram Nova-3 on the already-generated WAV files, independently
of the narration provider. It caches word timings by audio content only after alignment and cue validation.
Rejected existing cache entries are removed with a rerun instruction; rerun the
caption command to obtain fresh timings. To force a fresh timing pass manually,
remove the relevant local `.caption-cache/` directory. Caption text comes
from the authored script, with hyphenated compounds split into words. Recognition
corrections are reported in `captions.json`; token-count mismatches, large transcript
changes, or invalid times stop generation for review. Speech recognition timestamps
are approximate, so listen and inspect synchronization before publishing.

The timing function can be replaced independently; the delivery renderer consumes
provider-neutral `captions.json` cues with start/end seconds and text, tied to the
video's scene/audio hashes. It refuses captions from a different narration version.

Delivery regenerates SRT/WebVTT from the validated `captions.json` cues, so edits
for delivery should be made in that JSON rather than in sidecar subtitle files.

Delivery includes a clean MP4 plus SRT/WebVTT for optional closed captions, a second MP4
with captions burned in for sound-off viewing, and `review.html` with both players.
The review page embeds its VTT as a Blob so captions can be toggled even when opened
locally. A docs integration should use the WebVTT file in a standard caption track.

Burning uses transparent image overlays rather than requiring a special subtitle-enabled
FFmpeg build. Inspect every cue in `qa/captions-contact-sheet.png`; the automated gate
checks media decoding, timing bounds, line limits, and narration identity, not listening
quality. Generated `.caption-cache/` folders are local and must not be committed.

## Record web interactions

Use the primary docs checkout's existing `.env.capture.local` and a clean isolated
Core worktree at the intended product revision, with dependencies installed. The
runner validates the existing database allowlist and guard, applies committed Core
migrations to that disposable database, and refreshes only the reserved development
auth identity. Existing fictional encounters are preserved; no reseed occurs.

Acquire the shared `noctune-native-capture` coordination lock before starting. The
runner also holds the docs screenshot lock to avoid a concurrent fixture refresh.
It uses loopback port 3108, real development authentication, and a synthetic browser
microphone. No email is sent. The recording shot exercises the real uploader against
isolated API/storage fixtures and labels the simulated upload in the composition;
clinical processing uses precomputed examples. No demo audio is uploaded to cloud storage.

```sh
pnpm tutorials:capture-web /absolute/path/to/primary/noctune-docs \
  /absolute/path/to/isolated/noctune-core .tutorial-output/web-interactions
```

An optional fourth argument selects comma-separated shots (`start`, `record`,
`process`, `review`, `edit`, `send`, or `follow-up`). Each verified 32-second MP4 includes real UI and a
reading hold; the output includes raw browser video, poster frames, and a checksum
manifest. In-points are matched against a screenshot of the ready UI, so delayed
browser screencast frames do not expose initial loading skeletons. Raw filenames,
ready references, match scores, and source in-points remain in the manifest. A
reading hold may extend the last authentic frame. Missing UI states fail the run
while preserving previous complete output.
The developer-only Next.js badge is hidden during recording; product UI is unchanged.
Review footage before composing it into an episode. The runner creates a reserved
tutorial note version with a citation tied to the existing weight discussion. It
serves Core’s deterministic 284-second synthetic WAV locally with byte-range support
to verify real audio seeking and transcript navigation. This is fixture audio, not
a recording of the fictional consultation. Edit capture resets only the reserved
tutorial note and encounter completion, saves a wording change through the UI, and
verifies that the correction appears before completing the encounter. Discharge
capture prepares the recipient and selects no-reply without sending an email.

To compose verified clips with the current storyboard's held cards and remaining
static captures, assemble a separate media root first. This checks recording hashes
and copies source bytes without altering `public/screenshots/`:

```sh
pnpm tutorials:prepare-media tutorials/first-encounter-web.json \
  .tutorial-output/web-interactions .tutorial-output/first-encounter-recorded/prepared \
  review,edit,send
pnpm tutorials:narrate .tutorial-output/first-encounter-recorded/prepared/story.json \
  .tutorial-output/first-encounter-recorded/narration "$TUTORIAL_ENV_FILE"
```

Use the prepared `media/` directory as the renderer's web media root, then run the
caption and dual-delivery commands. The `sources.json` records which scenes use
recorded versus static media. The optional final argument explicitly names instruction
cards to replace with inspected recordings. Missing recordings fail the assembly;
unlisted cards remain intact. Keep the approved original story as the fallback.

## Native capture audio

Use the Swift worktree's `docs/app-store-capture.md` and its guarded fixture server.
The native capture build and server must both use `http://127.0.0.1:3100`;
`localhost` may resolve to an unrelated IPv6 listener. Retain `--reuse-fixtures`
after capturing native takes.

The shared Mochi fixture initially references a placeholder media key. With the
capture server running, this helper uploads Core's 284-second synthetic tone WAV
through the normal app API and associates it only with reserved encounter 201:

```sh
node scripts/tutorials/hydrate-native-audio.mjs /absolute/path/to/primary/noctune-docs \
  /absolute/path/to/noctune-core-capture-worktree \
  .tutorial-output/native-interactions/audio-fixture.json
```

It validates the disposable database and development auth project, refreshes only
the reserved login, requires the exact development S3 upload destination, and checks
CloudFront range playback. It does not invoke processing or require AWS CLI login.
Keep its manifest: it records the original media fields, new object key, checksum,
and disclosure. An existing manifest prevents accidental repeat uploads. Restart the
native fixture server and relaunch the app afterward to refresh credentials and caches.
Append `--verify-existing` to verify and rebind the manifest's existing object without
uploading again. The adopted upload session is confirmed in the disposable database
so orphan cleanup cannot delete the fixture. Run either mode before native recording:
refreshing the reserved login can invalidate an app session already in use.
The audio is a playback/seek fixture with tone cues, not the spoken transcript.

## Edit native recordings

Keep raw native recordings and their checksum manifest under
`.tutorial-output/native-interactions`. Mark rejected takes `usable: false`.
The first iOS storyboard and cut recipe are `first-encounter-ios.json` and
`first-encounter-ios.cuts.json`. Each cut records its source, in-point, duration,
and optional final-frame reading hold. The editor verifies approved source hashes
and cut bounds, normalizes variable frame rates to 30 fps, and preserves provenance.
It never changes the original recording or product UI.

```sh
node scripts/tutorials/edit-recordings.mjs .tutorial-output/native-interactions \
  tutorials/first-encounter-ios.cuts.json .tutorial-output/first-encounter-ios/media
pnpm tutorials:narrate tutorials/first-encounter-ios.json \
  .tutorial-output/first-encounter-ios/narration "$TUTORIAL_ENV_FILE"
pnpm tutorials:render .tutorial-output/first-encounter-ios/narration \
  .tutorial-output/first-encounter-ios/video public/screenshots \
  .tutorial-output/first-encounter-ios/media
pnpm tutorials:captions .tutorial-output/first-encounter-ios/narration \
  .tutorial-output/first-encounter-ios/captions "$TUTORIAL_ENV_FILE"
pnpm tutorials:caption-video .tutorial-output/first-encounter-ios/video \
  .tutorial-output/first-encounter-ios/captions .tutorial-output/first-encounter-ios/delivery
```

The iOS episode shows supported transcript-row seeking, rather than implying native
citation behavior matches the web. Completion uses **Mark as complete** without
sending the prepared email. The processing cut transitions to the existing fictional
example draft; it does not claim to show the new recording's generated output.
Inspect action timing and reading holds after narration changes. Caption alignment
and decode checks do not replace a complete listening review.
