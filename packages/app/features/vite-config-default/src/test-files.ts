/**
 * Whether a vitest run passes when it finds no test files.
 *
 * A plain `vitest run` of an app with no unit tests yet passes and prints "No test files found".
 * A run that names files or a pattern still fails when none of them match, so a mistyped path
 * never reads as a passing run. The run's own command line is read with vitest's parser, which
 * is loaded only while vitest is running.
 *
 * @module
 */

import process from 'node:process'

/**
 * Whether a run with these arguments passes when it finds no test files.
 *
 * @param argv - The run's arguments after the node binary and the vitest script.
 * @param underVitest - Whether vitest is running (it sets `VITEST` before it loads the config).
 * @returns True for a run that names no files, false for one that does and outside vitest.
 */
export async function passesWithNoTestFiles(
  argv: readonly string[] = process.argv.slice(2),
  underVitest: boolean = Boolean(process.env.VITEST),
): Promise<boolean> {
  if (!underVitest) return false
  const { parseCLI } = await import('vitest/node')
  return parseCLI(['vitest', ...argv]).filter.length === 0
}

/** Whether this process's vitest run passes when it finds no test files. */
export const passWithNoTestFiles: boolean = await passesWithNoTestFiles()
