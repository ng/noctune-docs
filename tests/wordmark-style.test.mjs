import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const sourceRoots = ['app', 'components', 'content']
const sourceFiles = ['mdx-components.tsx']
const authoredExtensions = new Set(['.css', '.js', '.jsx', '.md', '.mdx', '.mjs', '.ts', '.tsx'])

test('uses the lowercase noctune wordmark in authored documentation', async () => {
  const files = [...sourceFiles]

  for (const sourceRoot of sourceRoots) {
    files.push(...(await findAuthoredFiles(path.join(repositoryRoot, sourceRoot))))
  }

  const violations = []

  for (const file of files) {
    const absolutePath = path.isAbsolute(file) ? file : path.join(repositoryRoot, file)
    const source = await fs.readFile(absolutePath, 'utf8')

    for (const [lineIndex, line] of source.split('\n').entries()) {
      for (const match of line.matchAll(/noctune/gi)) {
        if (match[0] !== 'noctune') {
          violations.push(`${path.relative(repositoryRoot, absolutePath)}:${lineIndex + 1}`)
        }
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Use the lowercase noctune wordmark in authored documentation:\n${violations.join('\n')}`,
  )
})

async function findAuthoredFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await findAuthoredFiles(entryPath)))
    } else if (entry.isFile() && authoredExtensions.has(path.extname(entry.name))) {
      files.push(entryPath)
    }
  }

  return files
}
