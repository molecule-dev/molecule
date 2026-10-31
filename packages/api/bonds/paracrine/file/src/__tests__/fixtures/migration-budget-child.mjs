import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import process from 'node:process'

import { createProvider } from '../../../dist/index.js'

const [rootDir, recipient, output] = process.argv.slice(2)
const provider = createProvider({ rootDir })
const durations = []
for (let index = 0; index < 40; index += 1) {
  const started = performance.now()
  const claimed = await provider.claimPending(recipient, { limit: 1 })
  await provider.releaseClaims(claimed.claims)
  const elapsed = performance.now() - started
  durations.push(elapsed)
  if (elapsed >= 1000) break
}
writeFileSync(output, JSON.stringify({ durations }))
provider.close()
