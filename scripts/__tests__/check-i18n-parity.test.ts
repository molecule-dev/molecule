import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { newMissing } from '../check-i18n-parity.js'

const SCRIPTS_DIR = dirname(dirname(fileURLToPath(import.meta.url))) // .../scripts
const ROOT = join(SCRIPTS_DIR, '..')

/**
 * Strip comment-only lines so a `check:i18n-parity` mention that survives in a
 * comment can't satisfy a wiring assertion after the real step is removed —
 * the same defence check-security-workflow.js uses against weakened CI.
 */
function runnableLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
}

describe('i18n parity guard (cross-cutting-i18n)', () => {
  it('reports no NEW missing keys: every literal t() key resolves in its owning bond', () => {
    // newMissing() = keys used in code via a literal `t('ns.key')` whose
    // namespace is owned by exactly one locale bond, but absent from that
    // bond's en.ts AND not in the accepted-debt baseline. It must be empty: a
    // non-empty result means a user-facing string shipped as an inline
    // defaultValue without ever being added to its companion locale bond, so
    // every non-English locale is silently stuck on English for that surface.
    expect(newMissing()).toEqual([])
  })

  it('is actually invoked by the CI build job — not merely defined as an npm script', () => {
    const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
    expect(runnableLines(ci)).toMatch(/run:\s*npm run check:i18n-parity\b/)
  })

  it('is invoked by the husky pre-commit hook', () => {
    const hookPath = join(ROOT, '.husky', 'pre-commit')
    expect(existsSync(hookPath)).toBe(true)
    expect(runnableLines(readFileSync(hookPath, 'utf8'))).toMatch(/npm run check:i18n-parity\b/)
  })
})
