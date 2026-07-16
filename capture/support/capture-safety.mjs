import { createHash } from 'node:crypto'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const DATABASE_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/

/**
 * Parses a capture URL and rejects targets outside the local machine.
 *
 * @param {string} value
 * @returns {URL}
 */
export function requireLoopbackBaseUrl(value) {
  const url = new URL(value)
  const hostname = url.hostname.toLowerCase()

  if (url.protocol !== 'http:') {
    throw new Error('CAPTURE_BASE_URL must use HTTP; the local capture server does not provide TLS')
  }
  if (!LOOPBACK_HOSTS.has(hostname)) {
    throw new Error('CAPTURE_BASE_URL must target localhost or a loopback address')
  }

  return url
}

/**
 * Validates the committed allowlist and returns its database fingerprints.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function parseCaptureDatabaseAllowlist(value) {
  const fingerprints =
    value && typeof value === 'object' && 'databaseFingerprints' in value
      ? value.databaseFingerprints
      : undefined

  if (!Array.isArray(fingerprints) || fingerprints.length === 0) {
    throw new Error('capture/database-allowlist.json must contain databaseFingerprints')
  }
  if (
    fingerprints.some(
      (fingerprint) =>
        typeof fingerprint !== 'string' || !DATABASE_FINGERPRINT_PATTERN.test(fingerprint),
    )
  ) {
    throw new Error('Capture database fingerprints must use sha256:<64 lowercase hex digits>')
  }
  if (new Set(fingerprints).size !== fingerprints.length) {
    throw new Error('Capture database fingerprints must be unique')
  }

  return fingerprints
}

/**
 * Confirms that a disposable database guard names the exact PostgreSQL target.
 *
 * @param {{
 *   databaseUrl: string | undefined
 *   guard: string | undefined
 *   allowedDatabaseFingerprints: string[]
 *   forbiddenDatabaseUrls?: Array<string | undefined>
 * }} options
 */
export function assertCaptureDatabase({
  databaseUrl,
  guard,
  allowedDatabaseFingerprints,
  forbiddenDatabaseUrls = [],
}) {
  if (!databaseUrl) {
    throw new Error('CAPTURE_DATABASE_URL is required in .env.capture.local or the environment')
  }

  const identity = databaseIdentity(databaseUrl)
  const reviewedDatabaseFingerprints = parseCaptureDatabaseAllowlist({
    databaseFingerprints: allowedDatabaseFingerprints,
  })

  if (
    forbiddenDatabaseUrls
      .filter(Boolean)
      .some((forbiddenDatabaseUrl) => identity === databaseIdentity(forbiddenDatabaseUrl))
  ) {
    throw new Error(
      'Refusing to capture against a database configured for Noctune Core or the parent process',
    )
  }

  const fingerprint = databaseIdentityFingerprint(identity)
  if (!reviewedDatabaseFingerprints.includes(fingerprint)) {
    throw new Error(
      `Capture database is not independently approved in capture/database-allowlist.json; reviewed fingerprint: "${fingerprint}"`,
    )
  }

  const expectedGuard = captureDatabaseGuard(databaseUrl)
  if (guard !== expectedGuard) {
    throw new Error(
      `CAPTURE_DATABASE_GUARD must identify the selected disposable database; set it to "${expectedGuard}"`,
    )
  }
}

/**
 * Builds the required target-bound guard for a capture database URL.
 *
 * @param {string} value
 * @returns {string}
 */
export function captureDatabaseGuard(value) {
  return `noctune-docs-capture:${databaseIdentity(value)}`
}

/**
 * Produces the credential-free fingerprint used by the committed allowlist.
 *
 * @param {string} value
 * @returns {string}
 */
export function captureDatabaseFingerprint(value) {
  return databaseIdentityFingerprint(databaseIdentity(value))
}

/**
 * Produces a credential-free identity for a PostgreSQL database URL.
 *
 * @param {string} value
 * @returns {string}
 */
function databaseIdentity(value) {
  const url = new URL(value)
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('Capture database URLs must use postgres:// or postgresql://')
  }
  const hostname = url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '')
  const port = url.port || '5432'
  const database = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, '')

  if (!database) {
    throw new Error('Capture database URLs must name a database')
  }

  return `${hostname}:${port}/${database}`
}

/**
 * Hashes an already canonical database identity without exposing its host or name.
 *
 * @param {string} identity
 * @returns {string}
 */
function databaseIdentityFingerprint(identity) {
  return `sha256:${createHash('sha256').update(identity).digest('hex')}`
}
