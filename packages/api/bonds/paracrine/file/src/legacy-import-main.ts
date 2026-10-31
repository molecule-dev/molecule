import { randomUUID } from 'node:crypto'

import { ParacrineDatabase } from './database.js'

const [root, suppliedToken] = process.argv.slice(2)
if (root === undefined) throw new Error('legacy import requires a store root')
const token = suppliedToken ?? randomUUID()
const database = new ParacrineDatabase(root)

const heartbeat = setInterval(() => {
  try {
    database.heartbeatLegacyImport(token)
  } catch (_error) {
    // A transient busy error is retried on the next interval; the PID check and
    // lease expiry still make a genuinely dead worker recoverable.
  }
}, 15_000)
heartbeat.unref()

try {
  if (database.claimLegacyImport(token)) await database.importLegacy()
} finally {
  clearInterval(heartbeat)
  database.releaseLegacyImport(token)
  database.close()
}
