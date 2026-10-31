import { writeFileSync } from 'node:fs'
import process from 'node:process'

import { createProvider } from '../../../dist/index.js'

const [rootDir, recipient, output] = process.argv.slice(2)
const provider = createProvider({ rootDir })
const first = await provider.claimPending(recipient, { limit: 5 })
await provider.claimPending(recipient, { limit: 5 })
writeFileSync(output, JSON.stringify({ first, backfills: globalThis.backfills }))
provider.close()
