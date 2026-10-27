#!/usr/bin/env node
/**
 * The `paracrine` CLI entry (compiled to `dist/cli-main.js`, wired as the
 * package `bin`). All behavior lives in {@link runCli}; this file only
 * translates exit codes.
 *
 * @module
 */

import { runCli } from './cli.js'

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
