import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import { setTimeout } from 'node:timers/promises'

import { createProvider } from '../../../dist/index.js'

const [rootDir, recipient, output] = process.argv.slice(2)
const provider = createProvider({ rootDir })
await provider.pending(recipient)
const deadline = Date.now() + 10_000
while (Date.now() < deadline) {
  const db = new DatabaseSync(join(rootDir, 'paracrine.sqlite'))
  db.exec('PRAGMA busy_timeout = 1000')
  const complete = db
    .prepare("SELECT value FROM migration WHERE key = 'legacy-complete'")
    .get()
  db.close()
  if (complete !== undefined) break
  await setTimeout(20)
}
const pending = await provider.pending(recipient)
writeFileSync(output, JSON.stringify(pending))
provider.close()
