// Supply the reserved native tutorial encounter with codec-valid demo audio.
// Uses the application's upload API; no direct AWS client or pipeline invocation.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import dotenv from 'dotenv'
import {
  assertCaptureDatabase,
  parseCaptureDatabaseAllowlist,
} from '../../capture/support/capture-safety.mjs'

const [docsArg, coreArg, outputArg, mode] = process.argv.slice(2)
if (!docsArg || !coreArg || !outputArg)
  throw Error('Usage: hydrate-native-audio.mjs PRIMARY_DOCS CORE_RUNTIME MANIFEST')
if (mode && mode !== '--verify-existing') throw Error('Unknown audio hydration mode')
if (fs.existsSync(outputArg) && mode !== '--verify-existing')
  throw Error('Audio manifest already exists; use --verify-existing to reuse it')
const existing = mode === '--verify-existing' ? JSON.parse(fs.readFileSync(outputArg)) : null
const docs = path.resolve(docsArg),
  core = path.resolve(coreArg)
const capture = dotenv.parse(fs.readFileSync(path.join(docs, '.env.capture.local')))
const source = path.resolve(docs, capture.CAPTURE_CORE_DIR || '../noctune-core')
const config = dotenv.parse(fs.readFileSync(path.join(source, '.env.local')))
assertCaptureDatabase({
  databaseUrl: capture.CAPTURE_DATABASE_URL,
  guard: capture.CAPTURE_DATABASE_GUARD,
  allowedDatabaseFingerprints: parseCaptureDatabaseAllowlist(
    JSON.parse(fs.readFileSync(new URL('../../capture/database-allowlist.json', import.meta.url))),
  ),
  forbiddenDatabaseUrls: [config.DATABASE_URL, process.env.DATABASE_URL],
})
if (new URL(config.NEXT_PUBLIC_SUPABASE_URL).hostname !== 'vvmqgqvkkcgmulbiytsf.supabase.co')
  throw Error('Development authentication project required')
const email = capture.DOCS_CAPTURE_USER_EMAIL || 'docs-capture@test.noctune.local'
if (!email.endsWith('@test.noctune.local')) throw Error('Reserved capture identity required')
const requireCore = createRequire(path.join(core, 'package.json'))
requireCore('tsx/cjs')
const { buildSyntheticDemoAudio } = requireCore(
  path.join(core, 'scripts/fixtures/noctune-demo/media.ts'),
)
const { createClient } = requireCore('@supabase/supabase-js')
const sql = requireCore('postgres')(capture.CAPTURE_DATABASE_URL, { max: 1 })
const encounter = 'd0c50000-0000-4000-8000-000000000201'
const practice = 'd0c50000-0000-4000-8000-000000000601'
const base = 'http://127.0.0.1:3100'
try {
  const [row] = await sql`SELECT patient_id, audio_s3_key, audio_s3_keys, audio_file_name,
    audio_mime_type, audio_file_size_bytes, audio_duration_seconds FROM transcriptions
    WHERE id = ${encounter} AND practice_id = ${practice}`
  if (!row || row.audio_duration_seconds !== 284) throw Error('Expected reserved Mochi fixture')
  const [template] = await sql`SELECT id FROM soap_templates
    WHERE name = 'General SOAP Note' AND type = 'system' AND purpose = 'soap'`
  if (!template) throw Error('General SOAP template missing')
  const auth = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  let user
  for (let page = 1; page <= 20 && !user; page++) {
    const { data, error } = await auth.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw Error('Reserved auth lookup failed')
    user = data.users.find((candidate) => candidate.email === email)
    if (data.users.length < 100) break
  }
  if (!user) throw Error('Reserved capture user missing')
  const password = `Tutorial-${randomBytes(24).toString('base64url')}!1a`
  if ((await auth.auth.admin.updateUserById(user.id, { password })).error)
    throw Error('Reserved authentication refresh failed')
  const { data, error } = await auth.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw Error('Reserved sign-in failed')
  const headers = {
    Authorization: `Bearer ${data.session.access_token}`,
    'X-Practice-Id': practice,
  }
  async function api(endpoint, body) {
    const response = await fetch(base + endpoint, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      headers: { ...headers, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) throw Error(`Capture API returned ${response.status}`)
    const result = await response.json()
    if (!result.ok) throw Error('Capture API did not succeed')
    return result.data
  }
  const before = await api(`/api/v1/transcriptions/${encounter}`)
  if (before.audioS3Key !== row.audio_s3_key) throw Error('API/database fixture mismatch')
  const audio = buildSyntheticDemoAudio(284)
  if (
    existing &&
    (existing.encounter !== encounter ||
      existing.s3Key !== row.audio_s3_key ||
      existing.sha256 !== audio.sha256Hex)
  )
    throw Error('Existing audio manifest does not match the fixture')
  const upload =
    existing ||
    (await api('/api/v1/uploads/presigned-url', {
      fileName: 'tutorial-mochi-synthetic.wav',
      contentType: audio.contentType,
      fileSizeBytes: audio.bytes.length,
      soapTemplateId: template.id,
      patientRecordId: row.patient_id,
    }))
  if (!existing) {
    const url = new URL(upload.uploadUrl)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'dev-noctune-4983.s3.us-east-1.amazonaws.com' ||
      decodeURIComponent(url.pathname.slice(1)) !== upload.s3Key
    )
      throw Error('Upload destination is not the expected development bucket')
    const put = await fetch(url, {
      method: 'PUT',
      redirect: 'error',
      headers: upload.requiredHeaders,
      body: audio.bytes,
    })
    if (!put.ok) throw Error(`Development audio upload returned ${put.status}`)
  }
  await sql.begin(async (tx) => {
    // This is a precomputed fixture, so bind the uploaded file without dispatching
    // generation. Confirm its session so orphan cleanup cannot delete adopted media.
    const sessions = await tx`UPDATE upload_sessions SET status = 'confirmed',
    confirmed_at = COALESCE(confirmed_at, now()), transcription_id = ${encounter}
    WHERE id = ${upload.uploadId} AND s3_key = ${upload.s3Key} AND practice_id = ${practice}
      AND patient_id = ${row.patient_id} AND status IN ('pending', 'uploading', 'confirmed') RETURNING id`
    if (sessions.length !== 1) throw Error('Expected exactly one matching tutorial upload session')
    await tx`UPDATE transcriptions SET audio_s3_key = ${upload.s3Key},
    audio_s3_keys = ${tx.json([upload.s3Key])}, audio_file_name = 'tutorial-mochi-synthetic.wav',
    audio_mime_type = 'audio/wav', audio_file_size_bytes = ${audio.bytes.length}
    WHERE id = ${encounter} AND practice_id = ${practice}`
  })
  if (!existing) {
    fs.mkdirSync(path.dirname(path.resolve(outputArg)), { recursive: true })
    fs.writeFileSync(
      outputArg,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          encounter,
          uploadId: upload.uploadId,
          s3Key: upload.s3Key,
          original: row,
          sha256: audio.sha256Hex,
          durationSeconds: 284,
          disclosure: 'Synthetic tone fixture; no clinical speech. Processing was not invoked.',
        },
        null,
        2,
      ) + '\n',
    )
  }
  const after = await api(`/api/v1/transcriptions/${encounter}`)
  if (!after.audioUrl) throw Error('Fixture updated, but audio signing failed; see manifest')
  const playback = await fetch(after.audioUrl, {
    headers: { Range: 'bytes=0-43' },
    redirect: 'error',
  })
  if (playback.status !== 206)
    throw Error(`Fixture updated; playback range returned ${playback.status}`)
  const bytes = Buffer.from(await playback.arrayBuffer())
  if (bytes.toString('ascii', 0, 4) !== 'RIFF') throw Error('Playback did not return WAV data')
  console.log('Native fixture audio uploaded and CloudFront range playback verified.')
} catch (error) {
  // Do not print SDK errors, tokens, credentials, or signed request URLs.
  console.error(
    error instanceof Error && !/https?:\/\//.test(error.message)
      ? error.message
      : 'Native audio hydration failed',
  )
  process.exitCode = 1
} finally {
  await sql.end()
}
