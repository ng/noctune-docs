import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertCaptureDatabase,
  captureDatabaseFingerprint,
  captureDatabaseGuard,
  parseCaptureDatabaseAllowlist,
  requireLoopbackBaseUrl,
} from './capture-safety.mjs'

const captureDatabaseUrl =
  'postgresql://capture:secret@docs-capture.example.test:5432/noctune_capture'
const captureDatabaseFingerprintValue = captureDatabaseFingerprint(captureDatabaseUrl)

test('accepts HTTP loopback capture URLs', () => {
  assert.equal(requireLoopbackBaseUrl('http://localhost:3100').hostname, 'localhost')
  assert.equal(requireLoopbackBaseUrl('http://127.0.0.1:3100').hostname, '127.0.0.1')
  assert.match(requireLoopbackBaseUrl('http://[::1]:3100').hostname, /::1/)
})

test('rejects HTTPS and non-loopback capture URLs', () => {
  assert.throws(
    () => requireLoopbackBaseUrl('https://localhost:3100'),
    /must use HTTP; the local capture server does not provide TLS/,
  )
  assert.throws(
    () => requireLoopbackBaseUrl('http://docs.example.test'),
    /must target localhost or a loopback address/,
  )
})

test('validates committed database allowlist fingerprints', () => {
  assert.deepEqual(
    parseCaptureDatabaseAllowlist({
      databaseFingerprints: [captureDatabaseFingerprintValue],
    }),
    [captureDatabaseFingerprintValue],
  )
  assert.throws(() => parseCaptureDatabaseAllowlist({ databaseFingerprints: [] }), /must contain/)
  assert.throws(
    () =>
      parseCaptureDatabaseAllowlist({
        databaseFingerprints: [captureDatabaseFingerprintValue, captureDatabaseFingerprintValue],
      }),
    /must be unique/,
  )
})

test('requires independent approval before accepting a target-bound guard', () => {
  assert.throws(
    () =>
      assertCaptureDatabase({
        databaseUrl: captureDatabaseUrl,
        guard: captureDatabaseGuard(captureDatabaseUrl),
        allowedDatabaseFingerprints: [`sha256:${'0'.repeat(64)}`],
      }),
    /not independently approved/,
  )

  assert.doesNotThrow(() =>
    assertCaptureDatabase({
      databaseUrl: captureDatabaseUrl,
      guard: captureDatabaseGuard(captureDatabaseUrl),
      allowedDatabaseFingerprints: [captureDatabaseFingerprintValue],
    }),
  )
})

test('rejects a match against any effective Core database identity', () => {
  const pooledCaptureDatabaseUrl =
    'postgresql://other:credentials@docs-capture-pooler.example.test/noctune_capture'

  assert.throws(
    () =>
      assertCaptureDatabase({
        databaseUrl: captureDatabaseUrl,
        guard: captureDatabaseGuard(captureDatabaseUrl),
        allowedDatabaseFingerprints: [captureDatabaseFingerprintValue],
        forbiddenDatabaseUrls: [
          'postgresql://core:secret@core.example.test/noctune',
          pooledCaptureDatabaseUrl,
        ],
      }),
    /Refusing to capture against a database configured for Noctune Core or the parent process/,
  )
})

test('requires the exact target-bound guard after allowlist approval', () => {
  assert.throws(
    () =>
      assertCaptureDatabase({
        databaseUrl: captureDatabaseUrl,
        guard: 'noctune-docs-capture:wrong-target',
        allowedDatabaseFingerprints: [captureDatabaseFingerprintValue],
      }),
    /must identify the selected disposable database/,
  )
})
