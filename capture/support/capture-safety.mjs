const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/**
 * Parses a capture URL and rejects targets outside the local machine.
 *
 * @param {string} value
 * @returns {URL}
 */
export function requireLoopbackBaseUrl(value) {
  const url = new URL(value)
  const hostname = url.hostname.toLowerCase()

  if (!['http:', 'https:'].includes(url.protocol) || !LOOPBACK_HOSTS.has(hostname)) {
    throw new Error('CAPTURE_BASE_URL must use HTTP(S) and target localhost or a loopback address')
  }

  return url
}

/**
 * Confirms that a disposable database guard names the exact PostgreSQL target.
 *
 * @param {{
 *   databaseUrl: string | undefined
 *   guard: string | undefined
 *   forbiddenDatabaseUrl?: string
 * }} options
 */
export function assertCaptureDatabase({ databaseUrl, guard, forbiddenDatabaseUrl }) {
  if (!databaseUrl) {
    throw new Error('CAPTURE_DATABASE_URL is required in .env.capture.local or the environment')
  }

  const identity = databaseIdentity(databaseUrl)

  if (forbiddenDatabaseUrl && identity === databaseIdentity(forbiddenDatabaseUrl)) {
    throw new Error(
      'Refusing to capture against the database configured in Noctune Core .env.local',
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
