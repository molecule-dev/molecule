import { log } from 'node:console'
import process from 'node:process'

import { createProvider } from '../../../dist/index.js'

const [rootDir, from, to, body] = process.argv.slice(2)
const provider = createProvider({ rootDir })
const message = await provider.send({ from, to, body })
log(JSON.stringify(message))
provider.close()
