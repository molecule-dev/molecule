import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { afterEach, expect, it } from 'vitest'

import { aggregateRoot } from '../lib/aggregate-root.mjs'

const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixture(layout) {
  const parent = mkdtempSync(join(tmpdir(), 'molecule-aggregate-'))
  roots.push(parent)
  const aggregate = join(parent, 'aggregate with spaces')
  const repo = join(layout === 'nested' ? aggregate : parent, 'molecule')
  mkdirSync(repo, { recursive: true })
  if (layout !== 'standalone') {
    mkdirSync(aggregate, { recursive: true })
    writeFileSync(join(aggregate, 'package.json'), '{"name":"molecule-workspace"}')
    if (layout === 'sibling') symlinkSync('../molecule', join(aggregate, 'molecule'))
  }
  return { parent, aggregate, repo }
}

it.each(['nested', 'sibling', 'standalone'])(
  'locates the peer root for a %s checkout',
  (layout) => {
    const { parent, aggregate, repo } = fixture(layout)
    expect(aggregateRoot(repo, '')).toBe(layout === 'standalone' ? parent : aggregate)
    if (layout !== 'standalone')
      expect(aggregateRoot(join(aggregate, 'molecule'), '')).toBe(aggregate)
  },
)

it('requires an explicit matching root if multiple aggregates expose the checkout', () => {
  const { parent, aggregate, repo } = fixture('sibling')
  const second = join(parent, 'other')
  mkdirSync(second)
  writeFileSync(join(second, 'package.json'), '{"name":"molecule-workspace"}')
  symlinkSync('../molecule', join(second, 'molecule'))
  expect(() => aggregateRoot(repo, '')).toThrow('Several aggregate checkouts')
  expect(aggregateRoot(repo, second)).toBe(second)
  expect(aggregateRoot(repo, aggregate)).toBe(aggregate)
  expect(() => aggregateRoot(repo, parent)).toThrow('does not expose this Molecule checkout')
})

it.each([false, true])(
  'runs the tracked-import CLI through the alias (preserve main symlinks: %s)',
  (preserve) => {
    const { aggregate, repo } = fixture('sibling')
    // Point the fixture at the actual Molecule script and its installed dependency graph.
    symlinkSync(join(import.meta.dirname, '..'), join(repo, 'scripts'))
    symlinkSync(join(import.meta.dirname, '../../node_modules'), join(repo, 'node_modules'))
    const consumer = join(aggregate, 'consumer')
    mkdirSync(consumer)
    const git = (...args) => {
      const command = spawnSync('git', args, { cwd: consumer, encoding: 'utf8' })
      expect(command.status, command.stderr).toBe(0)
    }
    git('init', '-q')
    git(
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.com',
      'commit',
      '--allow-empty',
      '-qm',
      'base',
    )
    writeFileSync(join(consumer, 'entry.ts'), "import './unstaged.js'\n")
    writeFileSync(join(consumer, 'unstaged.ts'), 'export {}\n')
    git('add', 'entry.ts')
    const command = join(aggregate, 'molecule/scripts/check-tracked-imports.mjs')
    const run = () =>
      spawnSync(
        process.execPath,
        [...(preserve ? ['--preserve-symlinks-main'] : []), command, '--staged'],
        { cwd: consumer, encoding: 'utf8' },
      )
    const refused = run()
    expect(refused.status, refused.stderr).toBe(1)
    expect(refused.stderr).toContain('unstaged.js')
    git('add', 'unstaged.ts')
    const accepted = run()
    expect(accepted.status, accepted.stderr).toBe(0)
    expect(accepted.stdout).toContain('every relative import is committed')
  },
)

it('runs the aggregate pre-push gate when invoked from the real sibling', () => {
  const { aggregate, repo } = fixture('sibling')
  const source = join(import.meta.dirname, '..')
  mkdirSync(join(repo, 'scripts/lib'), { recursive: true })
  mkdirSync(join(aggregate, 'scripts'))
  for (const file of ['aggregate-root.mjs', 'is-main.mjs'])
    copyFileSync(join(source, 'lib', file), join(repo, 'scripts/lib', file))
  writeFileSync(join(repo, 'scripts/trust-new-packages.mjs'), '')
  writeFileSync(
    join(aggregate, 'scripts/refuse-push-during-release.mjs'),
    'console.error("fixture holds the release claim"); process.exitCode = 1\n',
  )
  const result = spawnSync('sh', [join(source, '../.husky/pre-push')], {
    cwd: repo,
    input: 'refs/heads/main fixture refs/heads/main fixture\n',
    encoding: 'utf8',
  })
  expect(result.status, result.stderr).toBe(1)
  expect(result.stderr).toContain('fixture holds the release claim')
})
