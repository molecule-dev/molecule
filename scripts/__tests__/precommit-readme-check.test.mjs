import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const HOOK = join(import.meta.dirname, '../../.husky/pre-commit')

/**
 * The `--index-only` phase is what `commitStagedPaths` runs for a producer's private index, and it
 * stops before the README regen. On 2026-11-21 a private-index commit gave two packages an express
 * peer, left both READMEs stale, and the release refused at its docs gate 27 minutes into its run.
 * The hook therefore checks those READMEs in that phase. A real run on private indexes proved it
 * refuses a stale README and passes a regenerated one (workspace regression entry
 * `precommit-index-only-skipped-readme`); these assertions keep the check wired in.
 */
describe('the pre-commit hook checks READMEs for a private-index commit', () => {
  const hook = readFileSync(HOOK, 'utf8')
  const indexOnly = hook.indexOf('if [ "${1:-}" = --index-only ]; then\n')
  const branch = hook.slice(indexOnly, hook.indexOf('\nfi\n', indexOnly) + 4)

  it('runs the README check over the commit’s doc packages before the index-only exit', () => {
    expect(indexOnly).toBeGreaterThan(0)
    expect(branch).toContain('regen-molecule-docs.mjs --check $DOC_DIRS')
    expect(branch.indexOf('regen-molecule-docs.mjs --check $DOC_DIRS')).toBeLessThan(
      branch.lastIndexOf('exit 0'),
    )
    // A stale README is recorded like every other failed check, and the branch refuses once,
    // with all of them, before it exits.
    expect(branch).toContain("gate_failed 'README check'")
    expect(branch.indexOf('refuse_if_failed')).toBeGreaterThan(branch.indexOf('gate_failed'))
    expect(branch.indexOf('refuse_if_failed')).toBeLessThan(branch.lastIndexOf('exit 0'))
  })

  it('computes the doc packages and the index export before that branch', () => {
    expect(hook.indexOf('DOC_DIRS=$(')).toBeGreaterThan(0)
    expect(hook.indexOf('DOC_DIRS=$(')).toBeLessThan(indexOnly)
    expect(hook.indexOf('index_tree() {')).toBeLessThan(indexOnly)
    // One computation: the regen of an ordinary commit reads the same DOC_DIRS.
    expect(hook.split('DOC_DIRS=$(').length).toBe(2)
  })

  it('also accepts a README that matches mlcl HEAD’s registry', () => {
    expect(branch).toContain('git -C "$MLCL_ROOT" show HEAD:registry.json')
    expect(branch).toContain('MLCL_REGISTRY_PATH=')
  })

  it('leaves no second index-only exit that would skip the check', () => {
    expect(hook.split('--index-only ]; then exit 0').length).toBe(1)
  })
})
