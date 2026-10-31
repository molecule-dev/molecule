import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import process from 'node:process'

import { createProvider } from '../../../dist/index.js'

const [rootDir, output] = process.argv.slice(2)
const provider = createProvider({ rootDir })
const started = performance.now()
const claimed = await provider.claimPending('b')
const duration = performance.now() - started
writeFileSync(output, JSON.stringify({ duration, claims: claimed.claims }))
provider.close()
