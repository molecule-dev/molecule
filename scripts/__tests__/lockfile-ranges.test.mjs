import semver from 'semver'
import { describe, expect, it } from 'vitest'

import { resolveLockPath, unsatisfiedDependencies } from '../lib/lockfile-ranges.mjs'

const satisfies = (version, range) =>
  semver.validRange(range) ? semver.satisfies(version, range, { includePrerelease: true }) : true

// The 2026-11-06 shape: workbox-build's nested fs-extra@9 needs jsonfile ^6, the lock nests none,
// so Node resolves the hoisted jsonfile@4 (no `utils` module).
const broken = {
  '': { name: 'molecule' },
  'node_modules/jsonfile': { version: '4.0.0' },
  'node_modules/universalify': { version: '0.1.2' },
  'node_modules/fs-extra': {
    version: '7.0.1',
    dependencies: { jsonfile: '^4.0.0', universalify: '^0.1.0' },
  },
  'node_modules/workbox-build': { version: '7.4.1', dependencies: { 'fs-extra': '^9.0.1' } },
  'node_modules/workbox-build/node_modules/fs-extra': {
    version: '9.1.0',
    dependencies: { jsonfile: '^6.0.1', universalify: '^2.0.0' },
  },
}

describe('lock dependency ranges', () => {
  it('resolves the way Node does: own node_modules, enclosing ones, then the root', () => {
    expect(resolveLockPath(broken, 'node_modules/workbox-build', 'fs-extra')).toBe(
      'node_modules/workbox-build/node_modules/fs-extra',
    )
    expect(
      resolveLockPath(broken, 'node_modules/workbox-build/node_modules/fs-extra', 'jsonfile'),
    ).toBe('node_modules/jsonfile')
    expect(resolveLockPath(broken, 'packages/app/x', 'missing')).toBeNull()
  })

  it('reports a nested dependency that resolves a hoisted copy of the wrong major', () => {
    expect(unsatisfiedDependencies(broken, satisfies)).toEqual([
      {
        from: 'node_modules/workbox-build/node_modules/fs-extra',
        dep: 'jsonfile',
        range: '^6.0.1',
        at: 'node_modules/jsonfile',
        version: '4.0.0',
      },
      {
        from: 'node_modules/workbox-build/node_modules/fs-extra',
        dep: 'universalify',
        range: '^2.0.0',
        at: 'node_modules/universalify',
        version: '0.1.2',
      },
    ])
  })

  it('accepts the regenerated lock that nests the right copies', () => {
    const fixed = {
      ...broken,
      'node_modules/workbox-build/node_modules/jsonfile': {
        version: '6.2.1',
        dependencies: { universalify: '^2.0.0' },
      },
      'node_modules/workbox-build/node_modules/universalify': { version: '2.0.1' },
    }
    expect(unsatisfiedDependencies(fixed, satisfies)).toEqual([])
  })

  it('holds an overridden edge to the override instead of the original range', () => {
    const lock = {
      'node_modules/engine.io': { version: '6.6.0', dependencies: { ws: '~8.21.0' } },
      'node_modules/ws': { version: '8.22.0' },
      'node_modules/discord.js': { version: '14.0.0', dependencies: { undici: '6.21.0' } },
      'node_modules/undici': { version: '6.29.1' },
    }
    expect(
      unsatisfiedDependencies(lock, satisfies, {
        ws: '8.22.0',
        'discord.js': { undici: '6.29.1' },
      }),
    ).toEqual([])
    // An override the lock does not carry is still a problem.
    expect(unsatisfiedDependencies(lock, satisfies, { ws: '8.23.0' })).toHaveLength(2)
  })

  it('skips workspace links and ranges that are not semver', () => {
    const lock = {
      'packages/app/a': { version: '1.0.0', dependencies: { b: 'file:../b', c: 'npm:d@^2.0.0' } },
      'node_modules/b': { link: true, resolved: 'packages/app/b' },
      'packages/app/b': { version: '0.1.0' },
      'node_modules/c': { version: '1.0.0' },
    }
    expect(unsatisfiedDependencies(lock, satisfies)).toEqual([])
  })
})
