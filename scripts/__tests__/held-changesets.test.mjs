import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  auditHeldChangesets,
  parseHeldRecord,
  withoutHeldPackages,
} from '../lib/held-changesets.mjs'

const GUARD = resolve(import.meta.dirname, '../check-release-changesets.sh')
const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/** Create and commit a minimal .changeset directory for the real shell guard. */
function fixture(record, changesets) {
  const root = mkdtempSync(join(tmpdir(), 'held-changesets-guard-'))
  roots.push(root)
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' })
  git('init', '-q')
  git('config', 'user.email', 'release@example.com')
  git('config', 'user.name', 'Release')
  mkdirSync(join(root, '.changeset'))
  if (record)
    writeFileSync(join(root, '.changeset/held.json'), `${JSON.stringify(record, null, 2)}\n`)
  for (const [file, packages] of Object.entries(changesets)) {
    const path = join(root, '.changeset', file)
    mkdirSync(dirname(path), { recursive: true })
    const frontmatter = packages.map((name) => `"${name}": patch`).join('\n')
    writeFileSync(path, `---\n${frontmatter}\n---\n\nReviewed change.\n`)
  }
  git('add', '.changeset')
  git('commit', '-q', '--allow-empty', '-m', 'fixture')
  return { root, git }
}

/** Execute the workflow's shell entry point against a fixture's committed tree. */
function guard(root) {
  return spawnSync('bash', [GUARD], { cwd: root, encoding: 'utf8' })
}

describe('committed held-changeset guard', () => {
  it('passes with exactly the recorded held changesets', () => {
    const record = { packages: ['@molecule/a'], changesets: ['.changeset/a.md'] }
    const { root } = fixture(record, { 'a.md': ['@molecule/a'] })
    const result = guard(root)
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('1 held changeset')
  })

  it('fails with any unrecorded changeset, even beside valid held ones', () => {
    const record = { packages: ['@molecule/a'], changesets: ['.changeset/a.md'] }
    const { root } = fixture(record, {
      'a.md': ['@molecule/a'],
      'other.md': ['@molecule/other'],
    })
    const result = guard(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('.changeset/other.md')
  })

  it('fails when a recorded changeset names a package outside the hold', () => {
    const record = { packages: ['@molecule/a'], changesets: ['.changeset/mixed.md'] }
    const { root } = fixture(record, { 'mixed.md': ['@molecule/a', '@molecule/other'] })
    const result = guard(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('.changeset/mixed.md')
  })

  it('refuses an unrecorded Unicode changeset that Git quotes in line output', () => {
    const record = { packages: ['@molecule/a'], changesets: ['.changeset/a.md'] }
    const { root } = fixture(record, {
      'a.md': ['@molecule/a'],
      'café.md': ['@molecule/other'],
    })
    const result = guard(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('.changeset/café.md')
  })

  it('retains the old refusal with pending changesets and no hold record', () => {
    const { root } = fixture(null, { 'other.md': ['@molecule/other'] })
    const result = guard(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Versioning is a LOCAL step now')
  })

  it('passes an ordinary release with no pending changesets and no record', () => {
    const { root } = fixture(null, {})
    const result = guard(root)
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('No pending changesets')
  })
})

describe('held record and publish selection', () => {
  it('rejects a stale recorded filename rather than accepting a partial match', () => {
    const record = parseHeldRecord({
      packages: ['@molecule/a'],
      changesets: ['.changeset/a.md', '.changeset/gone.md'],
    })
    expect(
      auditHeldChangesets({
        pending: ['.changeset/a.md'],
        record,
        readPackages: () => ['@molecule/a'],
      }).problems,
    ).toEqual(['.changeset/gone.md is recorded but not present'])
  })

  it('injects publish candidates and removes only held names', () => {
    const record = parseHeldRecord({
      packages: ['@molecule/a'],
      changesets: ['.changeset/a.md'],
    })
    const candidates = [{ name: '@molecule/a' }, { name: '@molecule/b' }]
    expect(withoutHeldPackages(candidates, record)).toEqual([{ name: '@molecule/b' }])
    expect(withoutHeldPackages(candidates, null)).toBe(candidates)
  })

  it('hard-excludes a dispatch review hold even when no record exists', () => {
    const candidates = [{ name: '@molecule/a' }, { name: '@molecule/b' }]
    expect(withoutHeldPackages(candidates, null, new Set(['@molecule/b']))).toEqual([
      { name: '@molecule/a' },
    ])
    const publisher = readFileSync(resolve(import.meta.dirname, '../publish-paced.mjs'), 'utf8')
    expect(publisher).toContain('withoutHeldPackages(discovered, heldRecord, REVIEW_HOLD)')
    const workflow = readFileSync(
      resolve(import.meta.dirname, '../../.github/workflows/release.yml'),
      'utf8',
    )
    expect(workflow).toContain('MOL_REVIEW_HOLD: ${{ inputs.review_hold }}')
  })

  it('rejects malformed records instead of turning them into publish permission', () => {
    expect(() => parseHeldRecord('{"packages":[],"changesets":[]}')).toThrow('non-empty')
    expect(() => parseHeldRecord('{"packages":[],"changesets":[]}')).toThrow(
      'when nothing is held, delete .changeset/held.json',
    )
  })
})
