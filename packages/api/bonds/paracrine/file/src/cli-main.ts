#!/usr/bin/env node
/** The `paracrine` executable; all command behavior lives in {@link runCli}. */
import { assertSqliteRuntime } from './runtime.js'
import { suppressSqliteExperimentalWarning } from './warnings.js'

assertSqliteRuntime()
suppressSqliteExperimentalWarning()
const { runCli } = await import('./cli.js')

try {
  const lines = await runCli(process.argv.slice(2))
  for (const line of lines) console.log(line)
} catch (error) {
  if (error instanceof Error && error.message.startsWith('usage:')) {
    console.error(error.message)
    process.exit(2)
  }
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
