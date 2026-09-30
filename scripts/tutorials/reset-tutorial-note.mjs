// Restore the reserved tutorial note and reopen Mochi's encounter in the approved
// capture database. Native takes need this between edits; the web runner resets
// per shot, but it also refreshes the reserved login, which signs the app out.
// Usage: node scripts/tutorials/reset-tutorial-note.mjs PRIMARY_DOCS CORE_RUNTIME
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import dotenv from 'dotenv'
import {
  assertCaptureDatabase,
  parseCaptureDatabaseAllowlist,
} from '../../capture/support/capture-safety.mjs'

const [configRootArg, coreArg] = process.argv.slice(2)
if (!configRootArg || !coreArg)
  throw Error('Usage: reset-tutorial-note.mjs PRIMARY_DOCS CORE_RUNTIME')
const configRoot = path.resolve(configRootArg)
const capture = dotenv.parse(fs.readFileSync(path.join(configRoot, '.env.capture.local')))
const sourceCore = path.resolve(configRoot, capture.CAPTURE_CORE_DIR || '../noctune-core')
const sourceEnv = dotenv.parse(fs.readFileSync(path.join(sourceCore, '.env.local')))
assertCaptureDatabase({
  databaseUrl: capture.CAPTURE_DATABASE_URL,
  guard: capture.CAPTURE_DATABASE_GUARD,
  allowedDatabaseFingerprints: parseCaptureDatabaseAllowlist(
    JSON.parse(fs.readFileSync(new URL('../../capture/database-allowlist.json', import.meta.url))),
  ),
  forbiddenDatabaseUrls: [sourceEnv.DATABASE_URL, process.env.DATABASE_URL],
})
const sql = createRequire(path.join(path.resolve(coreArg), 'package.json'))('postgres')(
  capture.CAPTURE_DATABASE_URL,
  { max: 1 },
)
try {
  const [note] =
    await sql`update soap_notes n set rendered_markdown = original.rendered_markdown, edit_metadata = null, updated_at = original.updated_at from soap_notes original where n.id = 'd0c50000-0000-4000-8000-000000000309' and original.id = 'd0c50000-0000-4000-8000-000000000301' returning n.id`
  await sql`update transcriptions set finished_at = null, finished_by = null, finish_method = null where id = 'd0c50000-0000-4000-8000-000000000201'`
  if (!note) throw Error('Reserved tutorial note is missing; run a web capture first')
  console.log('Reserved tutorial note restored; relaunch the app to clear its cache.')
} finally {
  await sql.end()
}
