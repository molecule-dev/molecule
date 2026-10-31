import { writeFileSync } from 'node:fs'
import process from 'node:process'

import { createProvider } from '../../../dist/index.js'

const [rootDir, recipient, output] = process.argv.slice(2)
let provider
let firstError = ''
try {
  provider = createProvider({ rootDir })
} catch (error) {
  firstError = error instanceof Error ? error.message : String(error)
}
if (provider === undefined) provider = createProvider({ rootDir })
const second = await provider.claimPending(recipient, { limit: 5 })
writeFileSync(output, JSON.stringify({ firstError, second }))
provider.close()
