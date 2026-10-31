import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ParacrineDatabase } from './database.js'

// From both src/ (Vitest) and dist/ (published runtime), this is the built worker.
const IMPORT_MAIN = fileURLToPath(new URL('../dist/legacy-import-main.js', import.meta.url))

/** Start at most one detached importer; never enumerate legacy files in a hook. */
export const ensureLegacyImport = (database: ParacrineDatabase, root: string): void => {
  if (database.legacyImportComplete()) return
  if (!['pending', 'messages', 'reads'].some((tree) => existsSync(join(root, tree)))) {
    database.completeLegacyImport()
    return
  }

  const token = randomUUID()
  if (!database.claimLegacyImport(token, true)) return
  try {
    // Eval-only and debugging exec flags belong to the host, not this script.
    // Required runtime options can still arrive through NODE_OPTIONS.
    const child = spawn(process.execPath, [IMPORT_MAIN, root, token], {
      detached: true,
      stdio: 'ignore',
    })
    // spawn failures are retried after the short launch lease; a hook must not
    // surface a background import failure as a delivery failure.
    child.once('error', () => undefined)
    child.unref()
  } catch (error) {
    database.releaseLegacyImport(token)
    throw error
  }
}
