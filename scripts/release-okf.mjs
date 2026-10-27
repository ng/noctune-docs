import { execFileSync } from 'node:child_process'

/** Keep the portable bundle current after semantic-release updates the changelog. */
export async function prepare(_config, { cwd }) {
  execFileSync(process.execPath, ['scripts/okf.mjs'], { cwd, stdio: 'inherit' })
}
