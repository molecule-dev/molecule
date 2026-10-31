import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { setTimeout } from 'node:timers/promises'

import { createProvider } from '../../../dist/index.js'

const [rootDir, recipient, output] = process.argv.slice(2)
const provider = createProvider({ rootDir })
let firstError = ''
try {
  await provider.claimPending(recipient, { limit: 5 })
} catch (error) {
  firstError = error instanceof Error ? error.message : String(error)
}
let second = { claims: [], hidden: 0 }
for (let index = 0; index < 100; index += 1) {
  second = await provider.claimPending(recipient, { limit: 5 })
  if (second.claims.length > 0) break
  await setTimeout(20)
}
writeFileSync(output, JSON.stringify({ firstError, second }))
provider.close()
