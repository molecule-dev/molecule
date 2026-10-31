import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

export const IMPORT_MAIN = fileURLToPath(
  new URL('../../dist/legacy-import-main.js', import.meta.url),
)

/** Wait for the detached worker without adding legacy reads to a hook. */
export const waitForLegacyImport = async (root: string): Promise<void> => {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    db.exec('PRAGMA busy_timeout = 1000')
    const complete = db.prepare("SELECT value FROM migration WHERE key = 'legacy-complete'").get()
    db.close()
    if (complete !== undefined) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('legacy import did not complete')
}
