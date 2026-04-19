import { readFileSync, writeFileSync } from 'node:fs'
import { globSync } from 'node:fs'
import { execSync } from 'node:child_process'

const files = execSync('find content -name "*.mdx"').toString().trim().split('\n')

for (const file of files) {
  let content = readFileSync(file, 'utf8')
  if (!content.startsWith('***')) continue

  const lines = content.split('\n')
  const frontmatter = []
  let i = 0

  if (lines[i] !== '***') continue
  i++
  if (lines[i] === '') i++

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('---') && line.replaceAll('-', '') === '') {
      i++
      break
    }
    if (line.startsWith('## title:')) {
      frontmatter.push(line.replace(/^## /, ''))
      i++
      if (i < lines.length && lines[i] === '') i++
      break
    }
    if (line.match(/^(title|aiDrafted|description):/)) {
      frontmatter.push(line)
      i++
    } else {
      break
    }
  }

  if (frontmatter.length === 0) continue

  const body = lines.slice(i).join('\n').replace(/^\n+/, '')
  const fixed = `---\n${frontmatter.join('\n')}\n---\n\n${body}`
  writeFileSync(file, fixed)
  console.log(`fixed ${file}`)
}
