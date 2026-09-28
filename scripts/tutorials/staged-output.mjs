import fs from 'node:fs'
import path from 'node:path'

// Keep the last verified set until the complete replacement is ready.
export async function withStagedOutput(destination, render) {
  const parent = path.dirname(destination)
  fs.mkdirSync(parent, { recursive: true })
  const stage = fs.mkdtempSync(path.join(parent, '.tutorial-render-'))
  const backup = `${stage}-previous`
  let movedPrevious = false
  try {
    // Preserve hand-written README/caption files alongside generated assets.
    if (fs.existsSync(destination)) fs.cpSync(destination, stage, { recursive: true })
    await render(stage)
    if (fs.existsSync(destination)) {
      fs.renameSync(destination, backup)
      movedPrevious = true
    }
    try {
      fs.renameSync(stage, destination)
    } catch (error) {
      if (movedPrevious) fs.renameSync(backup, destination)
      throw error
    }
  } finally {
    fs.rmSync(stage, { recursive: true, force: true })
  }
  if (movedPrevious) fs.rmSync(backup, { recursive: true, force: true })
}
