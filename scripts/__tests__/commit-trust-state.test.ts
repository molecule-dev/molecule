/**
 * `trust:new` commits the ledger it just changed — and only the ledger. Real temporary git repos,
 * because the property that matters (another session's staged file stays out of the commit) is a
 * git behavior, not something a mock can show.
 */
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'

import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'

import { commitTrustState, trustCommitMessage } from '../lib/commit-trust-state.mjs'

const LEDGER = '.trust-state.json'
let dir: string | null = null

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = null
})

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

/** A repo with the ledger and one other file already committed. */
function repo(): string {
  dir = mkdtempSync(join(tmpdir(), 'trust-commit-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  git(dir, 'config', 'commit.gpgsign', 'false')
  git(dir, 'config', 'core.hooksPath', '.git/hooks')
  writeFileSync(join(dir, LEDGER), '[\n  "@molecule/a"\n]\n')
  writeFileSync(join(dir, 'other.txt'), 'one\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'initial')
  return dir
}

/** The exact shared state a refused commit must preserve. */
function snapshot(root: string): { head: string; index: string; ledger: string } {
  return {
    head: git(root, 'rev-parse', 'HEAD'),
    index: git(root, 'write-tree'),
    ledger: readFileSync(join(root, LEDGER), 'utf8'),
  }
}

/** A successful trust operation's sole ledger addition. */
function addOwnName(root: string): void {
  writeFileSync(join(root, LEDGER), '[\n  "@molecule/a",\n  "@molecule/b"\n]\n')
}

/** Land another writer's commit without acquiring or rewriting the shared index. */
function landPeerCommit(root: string): string {
  const env = { ...process.env, GIT_INDEX_FILE: join(root, '.git', 'peer.index') }
  const run = (args: string[], input?: string): string =>
    execFileSync('git', args, {
      cwd: root,
      env,
      encoding: 'utf8',
      ...(input ? { input } : {}),
    }).trim()
  const parent = run(['rev-parse', 'HEAD'])
  run(['read-tree', parent])
  const blob = run(['hash-object', '-w', '--stdin'], 'peer committed\n')
  run(['update-index', '--add', '--cacheinfo', `100644,${blob},other.txt`])
  const tree = run(['write-tree'])
  const commit = run(['commit-tree', tree, '-p', parent, '-m', 'peer'])
  run(['update-ref', 'HEAD', commit, parent])
  return commit
}

describe('trustCommitMessage', () => {
  it('names the package when one was added', () => {
    expect(trustCommitMessage(['@molecule/b'])).toBe(
      'chore(trust): record @molecule/b in the trust state',
    )
  })

  it('counts and lists the packages when several were added', () => {
    const message = trustCommitMessage(['@molecule/b', '@molecule/c'])
    expect(message.split('\n')[0]).toBe('chore(trust): record 2 newly trusted packages')
    expect(message).toContain('- @molecule/b')
    expect(message).toContain('- @molecule/c')
  })
})

describe('commitTrustState', () => {
  it('commits the changed ledger and nothing else, leaving another file staged', () => {
    const root = repo()
    writeFileSync(join(root, LEDGER), '[\n  "@molecule/a",\n  "@molecule/b"\n]\n')
    // another session's work, already staged in the shared checkout
    writeFileSync(join(root, 'other.txt'), 'two\n')
    git(root, 'add', 'other.txt')

    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] })

    expect(result.committed).toBe(true)
    expect(result.sha).toMatch(/^[0-9a-f]{7,}$/)
    expect(git(root, 'show', '--name-only', '--format=%s', 'HEAD').split('\n')).toEqual([
      'chore(trust): record @molecule/b in the trust state',
      '',
      LEDGER,
    ])
    // the other file is still staged and still unpublished
    expect(git(root, 'diff', '--cached', '--name-only')).toBe('other.txt')
    expect(git(root, 'status', '--porcelain', '--', LEDGER)).toBe('')
  })

  it('does nothing when the run added no package', () => {
    const root = repo()
    const before = git(root, 'rev-parse', 'HEAD')
    const result = commitTrustState({ root, file: LEDGER, added: [] })
    expect(result.committed).toBe(false)
    expect(result.reason).toMatch(/nothing was added/)
    expect(git(root, 'rev-parse', 'HEAD')).toBe(before)
  })

  it('does nothing when the ledger file has no change', () => {
    const root = repo()
    const before = git(root, 'rev-parse', 'HEAD')
    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/a'] })
    expect(result.committed).toBe(false)
    expect(result.reason).toMatch(/no change/)
    expect(git(root, 'rev-parse', 'HEAD')).toBe(before)
  })

  it('leaves an untracked ledger alone instead of force-adding an ignored file', () => {
    const root = repo()
    writeFileSync(join(root, '.gitignore'), `${LEDGER}\n`)
    git(root, 'rm', '-q', '--cached', LEDGER)
    git(root, 'add', '.gitignore')
    git(root, 'commit', '-q', '-m', 'ledger becomes untracked')
    writeFileSync(join(root, LEDGER), '["@molecule/z"]\n')
    const before = git(root, 'rev-parse', 'HEAD')

    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/z'] })

    expect(result.committed).toBe(false)
    expect(result.reason).toMatch(/not tracked/)
    expect(git(root, 'rev-parse', 'HEAD')).toBe(before)
  })

  it('reports a directory that is not a git work tree', () => {
    dir = mkdtempSync(join(tmpdir(), 'trust-nogit-'))
    mkdirSync(join(dir, 'sub'))
    writeFileSync(join(dir, LEDGER), '[]\n')
    const result = commitTrustState({ root: dir, file: LEDGER, added: ['@molecule/b'] })
    expect(result.committed).toBe(false)
    expect(result.reason).toMatch(/not inside a git work tree|not tracked/)
  })

  it('reports a failed commit with the file to commit by hand, instead of throwing', () => {
    const root = repo()
    writeFileSync(join(root, LEDGER), '[\n  "@molecule/a",\n  "@molecule/b"\n]\n')
    // a pre-commit hook that refuses everything
    const hooks = join(root, '.git', 'hooks')
    writeFileSync(join(hooks, 'pre-commit'), '#!/bin/sh\necho refused-by-hook >&2\nexit 1\n', {
      mode: 0o755,
    })

    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] })

    expect(result.committed).toBe(false)
    expect(result.reason).toContain(`commit ${LEDGER} by hand`)
    expect(result.reason).toContain('refused-by-hook')
  })

  it('refuses foreign staged and unstaged ledger names before running hooks', () => {
    const root = repo()
    writeFileSync(join(root, LEDGER), '["@molecule/a","@molecule/foreign-staged"]\n')
    git(root, 'add', LEDGER)
    writeFileSync(
      join(root, LEDGER),
      '["@molecule/a","@molecule/b","@molecule/foreign-staged","@molecule/foreign-unstaged"]\n',
    )
    const marker = join(root, '.git', 'hook-ran')
    writeFileSync(
      join(root, '.git', 'hooks', 'pre-commit'),
      `#!/bin/sh\necho ran > '${marker}'\n`,
      { mode: 0o755 },
    )
    const before = snapshot(root)

    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] })

    expect(result.committed).toBe(false)
    expect(result.reason).toContain("beyond this run's exact trusted-name additions")
    expect(snapshot(root)).toEqual(before)
    expect(existsSync(marker)).toBe(false)
  })

  it('refuses a foreign index edit even when the working ledger contains only our addition', () => {
    const root = repo()
    writeFileSync(join(root, LEDGER), '["@molecule/a","@molecule/c"]\n')
    git(root, 'add', LEDGER)
    addOwnName(root)
    const before = snapshot(root)

    expect(commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] }).committed).toBe(false)
    expect(snapshot(root)).toEqual(before)
  })

  it('accepts the exact own addition when it is already staged', () => {
    const root = repo()
    addOwnName(root)
    git(root, 'add', LEDGER)

    expect(commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] }).committed).toBe(true)
    expect(git(root, 'status', '--porcelain', '--', LEDGER)).toBe('')
  })

  it('runs hooks against a private index that excludes unrelated staging', () => {
    const root = repo()
    addOwnName(root)
    writeFileSync(join(root, 'other.txt'), 'foreign staged\n')
    git(root, 'add', 'other.txt')
    const marker = join(root, '.git', 'hook-index')
    writeFileSync(
      join(root, '.git', 'hooks', 'pre-commit'),
      `#!/bin/sh\ngit diff --cached --name-only > '${marker}'\n`,
      { mode: 0o755 },
    )

    expect(commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] }).committed).toBe(true)
    expect(readFileSync(marker, 'utf8').trim()).toBe(LEDGER)
    expect(git(root, 'diff', '--cached', '--name-only')).toBe('other.txt')
  })

  it('preserves and refuses a ledger edit made while the hook runs', () => {
    const root = repo()
    addOwnName(root)
    const before = snapshot(root)
    writeFileSync(
      join(root, '.git', 'hooks', 'pre-commit'),
      `#!/bin/sh\nprintf '%s\\n' '["@molecule/a","@molecule/b","@molecule/c"]' > '${join(root, LEDGER)}'\n`,
      { mode: 0o755 },
    )

    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] })

    expect(result.committed).toBe(false)
    expect(result.reason).toContain('changed during the hook')
    expect(git(root, 'rev-parse', 'HEAD')).toBe(before.head)
    expect(git(root, 'write-tree')).toBe(before.index)
    expect(JSON.parse(readFileSync(join(root, LEDGER), 'utf8'))).toContain('@molecule/c')
  })

  it('preserves unrelated shared staging added while the hook runs', () => {
    const root = repo()
    addOwnName(root)
    const head = git(root, 'rev-parse', 'HEAD')
    writeFileSync(
      join(root, '.git', 'hooks', 'pre-commit'),
      `#!/bin/sh\necho peer > '${join(root, 'other.txt')}'\nGIT_INDEX_FILE='${join(root, '.git', 'index')}' git add other.txt\n`,
      { mode: 0o755 },
    )

    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] })

    expect(result.committed).toBe(false)
    expect(git(root, 'rev-parse', 'HEAD')).toBe(head)
    expect(git(root, 'show', ':other.txt')).toBe('peer')
    expect(JSON.parse(readFileSync(join(root, LEDGER), 'utf8'))).toContain('@molecule/b')
  })

  it('refuses HEAD movement during the hook without replacing the peer commit', () => {
    const root = repo()
    addOwnName(root)
    let peer: string | undefined
    const result = commitTrustState({
      root,
      file: LEDGER,
      added: ['@molecule/b'],
      run: (cmd, args, options) => {
        const value = execFileSync(cmd, args, options)
        if (args[0] === 'hook') peer = landPeerCommit(root)
        return value
      },
    })

    expect(result.committed).toBe(false)
    expect(result.reason).toContain('changed during the hook')
    expect(git(root, 'rev-parse', 'HEAD')).toBe(peer)
    expect(git(root, 'show', 'HEAD:other.txt')).toBe('peer committed')
    expect(JSON.parse(readFileSync(join(root, LEDGER), 'utf8'))).toContain('@molecule/b')
  })

  it('uses CAS when a peer lands immediately before update-ref', () => {
    const root = repo()
    addOwnName(root)
    const before = snapshot(root)
    let peer: string | undefined
    const result = commitTrustState({
      root,
      file: LEDGER,
      added: ['@molecule/b'],
      run: (cmd, args, options) => {
        if (args[0] === 'update-ref') peer = landPeerCommit(root)
        return execFileSync(cmd, args, options)
      },
    })

    expect(result.committed).toBe(false)
    expect(git(root, 'rev-parse', 'HEAD')).toBe(peer)
    expect(git(root, 'write-tree')).toBe(before.index)
    expect(readFileSync(join(root, LEDGER), 'utf8')).toBe(before.ledger)
    expect(existsSync(join(root, '.git', 'index.lock'))).toBe(false)
  })

  it("retains an existing index lock instead of removing another writer's lock", () => {
    const root = repo()
    addOwnName(root)
    const head = git(root, 'rev-parse', 'HEAD')
    const lock = join(root, '.git', 'index.lock')
    writeFileSync(lock, 'foreign lock')

    expect(commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] }).committed).toBe(false)
    expect(readFileSync(lock, 'utf8')).toBe('foreign lock')
    expect(git(root, 'rev-parse', 'HEAD')).toBe(head)
  })

  it('reports the landed commit truthfully if final index publication fails', () => {
    const root = repo()
    addOwnName(root)
    const result = commitTrustState({
      root,
      file: LEDGER,
      added: ['@molecule/b'],
      run: (cmd, args, options) => {
        const value = execFileSync(cmd, args, options)
        if (args[0] === 'update-ref') rmSync(join(root, '.git', 'index.lock'))
        return value
      },
    })

    expect(result.committed).toBe(true)
    expect(result.sha).toBe(git(root, 'rev-parse', '--short=7', 'HEAD'))
    expect(result.reason).toContain(
      'trust commit landed, but the shared index could not be updated',
    )
    expect(JSON.parse(git(root, 'show', `HEAD:${LEDGER}`))).toContain('@molecule/b')
    expect(JSON.parse(readFileSync(join(root, LEDGER), 'utf8'))).toContain('@molecule/b')
  })

  it('works as a standalone copy without any workspace helper', () => {
    const root = repo()
    addOwnName(root)
    const standalone = join(root, 'standalone.mjs')
    copyFileSync(new URL('../lib/commit-trust-state.mjs', import.meta.url), standalone)
    const script = `import {commitTrustState} from ${JSON.stringify(pathToFileURL(standalone).href)}; process.stdout.write(JSON.stringify(commitTrustState({root:${JSON.stringify(root)},file:${JSON.stringify(LEDGER)},added:['@molecule/b']})))`
    const result = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }),
    )

    expect(result.committed).toBe(true)
    expect(git(root, 'status', '--porcelain', '--', LEDGER)).toBe('')
  })

  it('keeps the actual caller success message and reports a partial-publication warning', () => {
    const source = readFileSync(new URL('../trust-new-packages.mjs', import.meta.url), 'utf8')
    const ast = ts.createSourceFile('trust-new-packages.mjs', source, ts.ScriptTarget.Latest, true)
    const statement = ast.statements.find(
      (node) => ts.isIfStatement(node) && node.getText(ast).includes('commitTrustState({'),
    )
    expect(statement).toBeDefined()
    const logs: string[] = []
    const errors: string[] = []
    runInNewContext(statement!.getText(ast), {
      CI: false,
      ROOT: '/fixture',
      ledger: new Set(['@molecule/b']),
      ledgerBefore: new Set(),
      commitTrustState: () => ({
        committed: true,
        sha: '1234567',
        reason: 'commit landed; index needs attention',
      }),
      console: {
        log: (value: string) => logs.push(value),
        error: (value: string) => errors.push(value),
      },
    })

    expect(logs).toEqual(['Committed .trust-state.json (1234567); not pushed.'])
    expect(errors).toEqual(['Trust ledger commit warning: commit landed; index needs attention'])
  })
})
