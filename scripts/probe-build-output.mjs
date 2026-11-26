// Temporary: lists where prerendered HTML lives after `next build`, to see what Vercel leaves.
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const skip = new Set(['node_modules', '.git', 'public', 'content', 'knowledge', '.capture'])
const counts = new Map()
const walk = async (dir, depth) => {
  if (depth > 7) return
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (e.isDirectory()) {
      if (!skip.has(e.name)) await walk(join(dir, e.name), depth + 1)
    } else if (/\.(html|rsc|meta|body)$/.test(e.name)) {
      const ext = e.name.slice(e.name.lastIndexOf('.'))
      const key = `${dir.split('/').slice(0, 3).join('/')} ${ext}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
}
await walk('.', 0)
console.log(
  '[probe] VERCEL=%s NEXT_DEPLOYMENT_ID=%s',
  process.env.VERCEL,
  process.env.NEXT_DEPLOYMENT_ID ? 'set' : 'unset',
)
for (const d of [
  '.next',
  '.next/server',
  '.next/server/app',
  '.vercel',
  '.vercel/output',
  '.next/output',
])
  console.log(
    '[probe] ls %s: %s',
    d,
    (await readdir(d).catch(() => ['<missing>'])).slice(0, 40).join(' '),
  )
for (const [k, n] of [...counts].sort()) console.log('[probe] %s %d', k, n)
