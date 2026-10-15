/**
 * The fleet publishes each package after the versions it pins, and never while one of them
 * is missing from npm — the shape that shipped api-agent-transcript-autodetect 1.2.3 pinning
 * three versions npm had refused (2026-10-15).
 */
import { describe, expect, it } from 'vitest'

import { dependencyOrder, exactMoleculeDeps, missingDependency } from '../lib/publish-order.mjs'

const autodetect = {
  name: '@molecule/api-agent-transcript-autodetect',
  version: '1.2.3',
  deps: [
    { name: '@molecule/api-agent-transcript-claude-code', version: '1.0.1' },
    { name: '@molecule/api-agent-transcript-codex', version: '1.0.1' },
  ],
}
const claudeCode = {
  name: '@molecule/api-agent-transcript-claude-code',
  version: '1.0.1',
  deps: [],
}
const codex = { name: '@molecule/api-agent-transcript-codex', version: '1.0.1', deps: [] }

describe('exactMoleculeDeps', () => {
  it('keeps exact @molecule dependencies and optional dependencies only', () => {
    expect(
      exactMoleculeDeps({
        dependencies: { '@molecule/a': '1.0.0', '@molecule/b': '^1.0.0', react: '19.0.0' },
        optionalDependencies: { '@molecule/c': '2.1.0' },
        devDependencies: { '@molecule/d': '1.0.0' },
        peerDependencies: { '@molecule/e': '1.0.0' },
      }),
    ).toEqual([
      { name: '@molecule/c', version: '2.1.0' },
      { name: '@molecule/a', version: '1.0.0' },
    ])
  })
})

describe('dependencyOrder', () => {
  it('puts a package after the queued versions it pins, even when its name sorts first', () => {
    const names = dependencyOrder([autodetect, codex, claudeCode]).map((p) => p.name)
    expect(names).toEqual([
      '@molecule/api-agent-transcript-claude-code',
      '@molecule/api-agent-transcript-codex',
      '@molecule/api-agent-transcript-autodetect',
    ])
  })

  it('ignores a pin at a version other than the queued one', () => {
    const old = { ...autodetect, deps: [{ name: claudeCode.name, version: '1.0.0' }] }
    expect(dependencyOrder([claudeCode, old]).map((p) => p.name)).toEqual([
      old.name,
      claudeCode.name,
    ])
  })

  it('keeps name order through a cycle and loses no package', () => {
    const a = {
      name: '@molecule/a',
      version: '1.0.0',
      deps: [{ name: '@molecule/b', version: '1.0.0' }],
    }
    const b = {
      name: '@molecule/b',
      version: '1.0.0',
      deps: [{ name: '@molecule/a', version: '1.0.0' }],
    }
    expect(dependencyOrder([b, a]).map((p) => p.name)).toEqual(['@molecule/b', '@molecule/a'])
  })
})

describe('missingDependency', () => {
  const queued = new Set([
    '@molecule/api-agent-transcript-claude-code@1.0.1',
    '@molecule/api-agent-transcript-codex@1.0.1',
  ])

  it('blocks a package whose queued dependency npm refused', () => {
    const published = new Set(['@molecule/api-agent-transcript-codex@1.0.1'])
    expect(missingDependency(autodetect, { queued, published, unknown: new Set() })).toEqual({
      name: '@molecule/api-agent-transcript-claude-code',
      version: '1.0.1',
    })
  })

  it('lets it through once every queued dependency is published', () => {
    expect(
      missingDependency(autodetect, { queued, published: queued, unknown: new Set() }),
    ).toBeNull()
  })

  it('blocks on a dependency the registry scan could not read', () => {
    const unknown = new Set(['@molecule/api-agent-transcript-codex@1.0.1'])
    expect(
      missingDependency(autodetect, { queued: new Set(), published: new Set(), unknown }),
    ).toEqual({ name: '@molecule/api-agent-transcript-codex', version: '1.0.1' })
  })

  it('treats a dependency neither queued nor unread as already on npm', () => {
    expect(
      missingDependency(autodetect, {
        queued: new Set(),
        published: new Set(),
        unknown: new Set(),
      }),
    ).toBeNull()
  })
})
