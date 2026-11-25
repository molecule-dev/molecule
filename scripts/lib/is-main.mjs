import { realpathSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/** Node resolves the entry module's symlinks but preserves its argv spelling. */
export function isMainModule(url) {
  try {
    return (
      Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url))
    )
  } catch (_error) {
    // An imported module may have no on-disk entry argument, such as in node -e.
    return false
  }
}
