/**
 * The pre-commit hook runs every check before it refuses, and names each one that failed.
 *
 * It stopped at the first failed check, so a commit met one gate per attempt (2026-11-22: the
 * changeset gate, then the version gate, then a whole-tree check, one attempt each). These run
 * the real hook in a scratch repository whose `node` is a stand-in: it records each command it
 * is given and exits 1 for the scripts named in MOL_GATES_FIXTURE_FAIL.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

const HOOK = join(import.meta.dirname, '../../.husky/pre-commit')
const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/**
 * Writes an executable shell script.
 *
 * @param path - Where.
 * @param body - The script after its shebang.
 */
function executable(path, body) {
  writeFileSync(path, `#!/bin/sh\n${body}\n`)
  chmodSync(path, 0o755)
}

/**
 * Runs the hook, as husky does (`sh -e`), on a commit that changes one package's source.
 *
 * @param fail - Scripts whose stand-in run exits 1.
 * @returns The hook's status and stderr, and every command line the stand-in `node` was given.
 */
function runHook(fail) {
  const root = mkdtempSync(join(tmpdir(), 'precommit-gates-'))
  roots.push(root)
  const repo = join(root, 'molecule')
  const bin = join(root, 'bin')
  const log = join(root, 'node.log')
  for (const dir of [
    join(repo, 'packages/x/src'),
    join(root, 'node_modules/.bin'),
    join(root, 'mlcl'),
    join(root, 'scripts'),
    bin,
  ])
    mkdirSync(dir, { recursive: true })
  // The hook runs its mlcl checks when tsx is installed, and its doc-example check when the
  // workspace script exists.
  executable(join(root, 'node_modules/.bin/tsx'), 'exit 0')
  writeFileSync(join(root, 'scripts/verify-doc-examples.mjs'), '')
  executable(
    join(bin, 'node'),
    `printf '%s\\n' "$*" >> '${log}'
for name in $MOL_GATES_FIXTURE_FAIL; do case "$*" in *"$name"*) exit 1 ;; esac; done
exit 0`,
  )
  executable(join(bin, 'npx'), 'exit 0')
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' })
  git('init', '-q')
  git('config', 'user.email', 'fixture@example.com')
  git('config', 'user.name', 'Fixture')
  writeFileSync(join(repo, 'packages/x/src/index.ts'), 'export const x = 1\n')
  git('add', 'packages')
  git('commit', '-qm', 'fixture: initial tree')
  writeFileSync(join(repo, 'packages/x/src/index.ts'), 'export const x = 2\n')
  git('add', 'packages/x/src/index.ts')
  writeFileSync(log, '')
  const result = spawnSync('sh', ['-e', HOOK], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      MOL_GATES_FIXTURE_FAIL: fail.join(' '),
    },
  })
  const commands = readFileSync(log, 'utf8').split('\n').filter(Boolean)
  return { status: result.status, stderr: result.stderr, commands }
}

/** Whether a command line runs the README generator itself, not its `--check`. */
const regenerates = (command) =>
  command.includes('regen-molecule-docs.mjs') && !command.includes('--check')

describe('the pre-commit hook', () => {
  it('runs every check after one fails, and refuses once naming each failure', () => {
    const { status, stderr, commands } = runHook([
      'precommit-changeset',
      'check-tracked-imports',
      'check-registry-exports',
    ])
    expect(status).toBe(1)
    for (const gate of ['precommit-changeset', 'check-tracked-imports', 'registry exports'])
      expect(stderr).toContain(`pre-commit: ${gate} failed`)
    expect(stderr).toContain(
      'Failed checks: precommit-changeset, check-tracked-imports, registry exports.',
    )
    // The checks after the first failure still ran.
    for (const script of ['scripts/run-on-index.mjs', 'scripts/verify-doc-examples.mjs'])
      expect(
        commands.some((command) => command.includes(script)),
        script,
      ).toBe(true)
    // The README regen writes to the index, so a refused commit never reaches it.
    expect(commands.filter(regenerates)).toEqual([])
  })

  it('regenerates READMEs for a commit whose checks all pass', () => {
    const { status, stderr, commands } = runHook([])
    expect(stderr).not.toContain('Failed checks')
    expect(status).toBe(0)
    expect(commands.filter(regenerates)).toHaveLength(1)
  })
})
