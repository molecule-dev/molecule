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
 * Runs the hook, as husky does (`sh -e`), on a commit that changes some packages' source. The
 * stand-in README generator writes "# generated" into each package's README in the hook's export.
 *
 * @param fail - Scripts whose stand-in run exits 1.
 * @param options - The packages the commit changes, those it also stages a README for, and that
 *   README's text (by default other text than the generator writes).
 * @returns The hook's status and stderr, every command line the stand-in `node` was given, and
 *   each `npx` call as `<cwd>|<arguments>`.
 */
function runHook(
  fail,
  { packages = ['x'], stagedReadmes = [], readmeText = '# written by hand\n' } = {},
) {
  const root = mkdtempSync(join(tmpdir(), 'precommit-gates-'))
  roots.push(root)
  const repo = join(root, 'molecule')
  const bin = join(root, 'bin')
  const log = join(root, 'node.log')
  const npxLog = join(root, 'npx.log')
  for (const dir of [
    ...packages.map((name) => join(repo, `packages/${name}/src`)),
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
case "$*" in *--check*) ;; *regen-molecule-docs.mjs*)
  for arg in "$@"; do case "$arg" in packages/*)
    printf '# generated\\n' > "$MOLECULE_PACKAGES_DIR/\${arg#packages/}/README.md"
    echo "$arg/README.md" ;;
  esac; done ;;
esac
exit 0`,
  )
  executable(join(bin, 'npx'), `printf '%s|%s\\n' "$PWD" "$*" >> '${npxLog}'`)
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' })
  git('init', '-q')
  git('config', 'user.email', 'fixture@example.com')
  git('config', 'user.name', 'Fixture')
  for (const name of packages)
    writeFileSync(join(repo, `packages/${name}/src/index.ts`), `export const ${name} = 1\n`)
  git('add', 'packages')
  git('commit', '-qm', 'fixture: initial tree')
  for (const name of packages) {
    writeFileSync(join(repo, `packages/${name}/src/index.ts`), `export const ${name} = 2\n`)
    git('add', `packages/${name}/src/index.ts`)
  }
  for (const name of stagedReadmes) {
    writeFileSync(join(repo, `packages/${name}/README.md`), readmeText)
    git('add', `packages/${name}/README.md`)
  }
  writeFileSync(log, '')
  writeFileSync(npxLog, '')
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
  const npx = readFileSync(npxLog, 'utf8').split('\n').filter(Boolean)
  return { status: result.status, stderr: result.stderr, commands, npx }
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

  // 2026-11-24: one `npx prettier` per regenerated README took about a second each, four minutes
  // of a 232-README commit.
  it('checks every regenerated README with one Prettier run in the export of the index', () => {
    const { status, npx } = runHook([], { packages: ['x', 'y', 'z'] })
    expect(status).toBe(0)
    const prettier = npx.filter((call) => call.includes('prettier'))
    expect(prettier).toHaveLength(1)
    const [cwd, args] = prettier[0].split('|')
    expect(cwd).toMatch(/\/\.precommit-docs-\d+$/)
    expect(args).toBe(
      '--no-install prettier --check packages/x/README.md packages/y/README.md packages/z/README.md',
    )
  })

  // 2026-11-24: the hook named the first stale staged README and stopped, so a commit that staged
  // 78 of them could take one ten-minute attempt per README.
  it('refuses once, naming every staged README that differs from the generated one', () => {
    const { status, stderr, npx } = runHook([], {
      packages: ['x', 'y', 'z'],
      stagedReadmes: ['x', 'z'],
    })
    expect(status).toBe(1)
    expect(stderr).toContain(
      'Generated README(s) staged with content that differs from their source:\n    packages/x/README.md\n    packages/z/README.md\nLeave them out of the commit',
    )
    expect(stderr).not.toContain('packages/y/README.md')
    expect(npx.filter((call) => call.includes('prettier'))).toEqual([])
  })

  it('accepts a staged README that is the one generated, and checks it with the others', () => {
    const { status, stderr, npx } = runHook([], {
      packages: ['x', 'y'],
      stagedReadmes: ['x'],
      readmeText: '# generated\n',
    })
    expect(stderr).not.toContain('Generated README(s) staged')
    expect(status).toBe(0)
    expect(npx.filter((call) => call.includes('prettier'))).toEqual([
      expect.stringMatching(
        /\|--no-install prettier --check packages\/x\/README\.md packages\/y\/README\.md$/,
      ),
    ])
  })
})
