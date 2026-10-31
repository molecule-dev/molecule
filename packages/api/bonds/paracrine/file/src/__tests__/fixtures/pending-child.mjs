import { writeFileSync } from 'node:fs'
import process from 'node:process'

import { createProvider } from '../../../dist/index.js'

const [rootDir, recipient, output] = process.argv.slice(2)
const provider = createProvider({ rootDir })
const pending = await provider.pending(recipient)
writeFileSync(output, JSON.stringify(pending))
provider.close()
