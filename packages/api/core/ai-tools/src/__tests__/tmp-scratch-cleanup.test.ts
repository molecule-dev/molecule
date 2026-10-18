/**
 * The tests in this package remove the scratch trees they make. On 2026-10-18 a full suite run
 * in the sibling api repo left ~147,000 directories in `/tmp` (≈5.4 GB) and filled the disk;
 * the guard that caught nothing there is repeated here so this package's suite cannot start
 * leaking the same way.
 *
 * `parse-check.test.ts` is the representative path: it makes a `parse-check-` tree at module
 * scope. This guard runs that file in a private `TMPDIR` and requires the prefix to come back
 * empty.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

const PREFIX = 'parse-check-'
const REPRESENTATIVE = 'src/__tests__/parse-check.test.ts'
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

let guardTmp = ''

afterAll(() => {
  if (guardTmp) rmSync(guardTmp, { recursive: true, force: true })
})

describe('the suite’s scratch directories', () => {
  it('leaves none behind when the representative test runs', () => {
    guardTmp = mkdtempSync(join(tmpdir(), 'tmp-scratch-guard-'))
    const vitest = join(
      dirname(createRequire(import.meta.url).resolve('vitest/package.json')),
      'vitest.mjs',
    )
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST')),
    )
    try {
      execFileSync(process.execPath, [vitest, 'run', REPRESENTATIVE, '--reporter=dot'], {
        cwd: PACKAGE_ROOT,
        env: { ...env, TMPDIR: guardTmp },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      const failure = error as { stdout?: Buffer; stderr?: Buffer }
      throw new Error(
        `the representative test run failed:\n${String(failure.stdout ?? '')}\n${String(failure.stderr ?? '')}`,
        { cause: error },
      )
    }
    const left = readdirSync(guardTmp).filter((name) => name.startsWith(PREFIX))
    expect(left).toEqual([])
  }, 600_000)
})
