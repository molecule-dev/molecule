/**
 * The fleet publishes each package after the versions it pins — exact
 * dependencies AND required peers, which npm 7+ installs automatically — and
 * never while one of them is missing from npm. The shape that shipped
 * api-agent-transcript-autodetect 1.2.3 pinning three versions npm had refused
 * (2026-10-15), and the one that shipped
 * `@molecule/app-auth-shell-react@3.0.0` requiring `@molecule/app-react ^3.0.0`
 * before app-react@3.0.0 existed (2026-10-28).
 */
import { describe, expect, it } from 'vitest'

import {
  dependencyOrder,
  exactMoleculeDeps,
  missingDependency,
  requiredMoleculePeers,
  requiredPeerCycles,
} from '../lib/publish-order.mjs'

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

// The reported incident, with the manifests' real ranges: app-auth-shell-react
// requires app-react ^3.0.0, and app-react requires app-forms ^2.0.0.
const appForms = { name: '@molecule/app-forms', version: '2.0.0', deps: [], peers: [] }
const appReact = {
  name: '@molecule/app-react',
  version: '3.0.0',
  deps: [],
  peers: [{ name: '@molecule/app-forms', range: '^2.0.0' }],
}
const authShell = {
  name: '@molecule/app-auth-shell-react',
  version: '3.0.0',
  deps: [],
  peers: [{ name: '@molecule/app-react', range: '^3.0.0' }],
}

/**
 * The `name@version` ids of a queue, the way the publisher passes them.
 *
 * @param queue - Queue entries.
 * @returns The ids.
 */
const idsOf = (queue) => new Set(queue.map((p) => `${p.name}@${p.version}`))

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

describe('requiredMoleculePeers', () => {
  it('keeps required @molecule peers, and drops optional and external ones', () => {
    expect(
      requiredMoleculePeers({
        peerDependencies: {
          '@molecule/app-react': '^3.0.0',
          '@molecule/app-ide': '^1.0.1',
          react: '^19.0.0',
        },
        peerDependenciesMeta: { '@molecule/app-ide': { optional: true } },
      }),
    ).toEqual([{ name: '@molecule/app-react', range: '^3.0.0' }])
  })

  it('treats a peer as required unless it is explicitly optional', () => {
    expect(
      requiredMoleculePeers({
        peerDependencies: { '@molecule/a': '>=1.0.0', '@molecule/b': '^2.0.0' },
        peerDependenciesMeta: {
          '@molecule/a': { optional: false },
          '@molecule/b': { optional: true },
        },
      }),
    ).toEqual([{ name: '@molecule/a', range: '>=1.0.0' }])
  })

  it('is empty for a manifest without peers', () => {
    expect(requiredMoleculePeers({ dependencies: { '@molecule/a': '1.0.0' } })).toEqual([])
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

  it('puts a required peer and its own peers first, before name order would', () => {
    expect(dependencyOrder([authShell, appReact, appForms]).map((p) => p.name)).toEqual([
      '@molecule/app-forms',
      '@molecule/app-react',
      '@molecule/app-auth-shell-react',
    ])
  })

  it('lets a package ship before a queued major its range does not accept', () => {
    // The counterexample the fix must not break: a compatible range is not a
    // reason to wait for an unrelated, incompatible new major.
    const shell = { ...authShell, peers: [{ name: '@molecule/app-react', range: '^2.0.0' }] }
    expect(dependencyOrder([shell, appReact]).map((p) => p.name)).toEqual([
      '@molecule/app-auth-shell-react',
      '@molecule/app-react',
    ])
  })

  it('does not wait for a queued version a published version already satisfies', () => {
    const shell = { ...authShell, peers: [{ name: '@molecule/app-react', range: '>=2.0.0' }] }
    const registry = new Map([['@molecule/app-react', ['2.5.0']]])
    expect(dependencyOrder([shell, appReact], { registry }).map((p) => p.name)).toEqual([
      '@molecule/app-auth-shell-react',
      '@molecule/app-react',
    ])
  })

  it('waits for the queued version when the published ones do not satisfy the range', () => {
    const shell = { ...authShell, peers: [{ name: '@molecule/app-react', range: '^3.0.0' }] }
    const registry = new Map([['@molecule/app-react', ['2.9.0']]])
    expect(dependencyOrder([shell, appReact], { registry }).map((p) => p.name)).toEqual([
      '@molecule/app-react',
      '@molecule/app-auth-shell-react',
    ])
  })

  it('ignores a pin at a version other than the queued one', () => {
    const old = { ...autodetect, deps: [{ name: claudeCode.name, version: '1.0.0' }] }
    expect(dependencyOrder([claudeCode, old]).map((p) => p.name)).toEqual([
      old.name,
      claudeCode.name,
    ])
  })

  it('puts held packages last, except before what pins them', () => {
    const other = { name: '@molecule/zz', version: '1.0.0', deps: [] }
    const names = dependencyOrder([autodetect, codex, claudeCode, other], {
      last: new Set([claudeCode.name, codex.name]),
    }).map((p) => p.name)
    expect(names[0]).toBe('@molecule/zz')
    expect(names.indexOf(autodetect.name)).toBeGreaterThan(names.indexOf(claudeCode.name))
    expect(names.indexOf(autodetect.name)).toBeGreaterThan(names.indexOf(codex.name))
  })

  it('keeps a package that requires a held peer after that peer', () => {
    const names = dependencyOrder([authShell, appReact, appForms], {
      last: new Set([appReact.name]),
    }).map((p) => p.name)
    expect(names[0]).toBe('@molecule/app-forms')
    expect(names.indexOf(authShell.name)).toBeGreaterThan(names.indexOf(appReact.name))
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

  it('keeps name order through a required-peer cycle and loses no package', () => {
    const a = {
      name: '@molecule/a',
      version: '3.0.0',
      deps: [],
      peers: [{ name: '@molecule/b', range: '^3.0.0' }],
    }
    const b = {
      name: '@molecule/b',
      version: '3.0.0',
      deps: [],
      peers: [{ name: '@molecule/a', range: '^3.0.0' }],
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

  it('blocks a package whose required peer is only queued, not published yet', () => {
    // app-auth-shell-react@3.0.0 requiring app-react ^3.0.0 while app-react@3.0.0
    // is still in this run's queue: npm would auto-install the peer and fail.
    expect(
      missingDependency(authShell, {
        queued: idsOf([appReact]),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', []]]),
      }),
    ).toEqual({
      kind: 'peer',
      name: '@molecule/app-react',
      range: '^3.0.0',
      why: 'not-published-yet',
      version: '3.0.0',
    })
  })

  it('lets it through once the peer was published this run', () => {
    expect(
      missingDependency(authShell, {
        queued: idsOf([appReact]),
        published: idsOf([appReact]),
        unknown: new Set(),
      }),
    ).toBeNull()
  })

  it('lets it through when the registry already serves a satisfying version', () => {
    expect(
      missingDependency(authShell, {
        queued: new Set(),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', ['3.0.1']]]),
      }),
    ).toBeNull()
  })

  it('does not hold a compatible range behind an unrelated failing new major', () => {
    // app-react@3.0.0 is queued and will fail; a package requiring ^3.0.0 may
    // still ship because 3.0.1 is already on npm, and `^2.0.0` is served by 2.5.0.
    const shell = { ...authShell, peers: [{ name: '@molecule/app-react', range: '^3.0.0' }] }
    expect(
      missingDependency(shell, {
        queued: new Set(['@molecule/app-react@4.0.0']),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', ['3.0.1']]]),
      }),
    ).toBeNull()
    expect(
      missingDependency(
        { ...authShell, peers: [{ name: '@molecule/app-react', range: '^2.0.0' }] },
        {
          queued: new Set(['@molecule/app-react@3.0.0']),
          published: new Set(),
          unknown: new Set(),
          registry: new Map([['@molecule/app-react', ['2.5.0']]]),
        },
      ),
    ).toBeNull()
  })

  it('blocks when no published version satisfies the range and none is queued', () => {
    expect(
      missingDependency(authShell, {
        queued: new Set(),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', ['2.9.0']]]),
      }),
    ).toEqual({
      kind: 'peer',
      name: '@molecule/app-react',
      range: '^3.0.0',
      why: 'no-satisfying-version',
    })
  })

  it('blocks when the peer registry state could not be read', () => {
    // "I could not look" is not "nothing is missing" — the same rule the run
    // applies to an inconclusive scan of a queued package.
    expect(
      missingDependency(authShell, {
        queued: new Set(),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', null]]),
      }),
    ).toEqual({
      kind: 'peer',
      name: '@molecule/app-react',
      range: '^3.0.0',
      why: 'registry-unknown',
    })
    expect(
      missingDependency(authShell, {
        queued: new Set(),
        published: new Set(),
        unknown: new Set(),
      }),
    ).toMatchObject({ why: 'registry-unknown' })
  })

  it('blocks an unparseable range instead of assuming it is satisfied', () => {
    expect(
      missingDependency(
        { ...authShell, peers: [{ name: '@molecule/app-react', range: 'workspace:*' }] },
        {
          queued: new Set(),
          published: new Set(),
          unknown: new Set(),
          registry: new Map([['@molecule/app-react', ['3.0.0']]]),
        },
      ),
    ).toEqual({
      kind: 'peer',
      name: '@molecule/app-react',
      range: 'workspace:*',
      why: 'invalid-range',
    })
  })

  it('checks exact dependencies before peers', () => {
    const both = {
      ...autodetect,
      peers: [{ name: '@molecule/app-react', range: '^3.0.0' }],
    }
    expect(
      missingDependency(both, {
        queued,
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', ['3.0.0']]]),
      }),
    ).toEqual({ name: '@molecule/api-agent-transcript-claude-code', version: '1.0.1' })
  })
})

describe('requiredPeerCycles', () => {
  it('reports two packages that require each other', () => {
    const a = {
      name: '@molecule/a',
      version: '3.0.0',
      peers: [{ name: '@molecule/b', range: '^3.0.0' }],
    }
    const b = {
      name: '@molecule/b',
      version: '3.0.0',
      peers: [{ name: '@molecule/a', range: '^3.0.0' }],
    }
    expect(requiredPeerCycles([b, a])).toEqual([['@molecule/a', '@molecule/b']])
  })

  it('reports a package that requires its own queued version', () => {
    const self = {
      name: '@molecule/self',
      version: '2.0.0',
      peers: [{ name: '@molecule/self', range: '^2.0.0' }],
    }
    expect(requiredPeerCycles([self])).toEqual([['@molecule/self']])
  })

  it('does not report a cycle a published version already satisfies', () => {
    const a = {
      name: '@molecule/a',
      version: '3.0.0',
      peers: [{ name: '@molecule/b', range: '^3.0.0' }],
    }
    const b = {
      name: '@molecule/b',
      version: '3.0.0',
      peers: [{ name: '@molecule/a', range: '>=2.0.0' }],
    }
    const registry = new Map([['@molecule/a', ['2.9.0']]])
    expect(requiredPeerCycles([a, b], { registry })).toEqual([])
  })

  it('reports the cycle only, not the packages waiting behind it', () => {
    const a = {
      name: '@molecule/a',
      version: '3.0.0',
      peers: [{ name: '@molecule/b', range: '^3.0.0' }],
    }
    const b = {
      name: '@molecule/b',
      version: '3.0.0',
      peers: [{ name: '@molecule/a', range: '^3.0.0' }],
    }
    const dependent = {
      name: '@molecule/c',
      version: '3.0.0',
      peers: [{ name: '@molecule/a', range: '^3.0.0' }],
    }
    expect(requiredPeerCycles([dependent, b, a])).toEqual([['@molecule/a', '@molecule/b']])
  })

  it('is empty for an acyclic required-peer chain', () => {
    expect(requiredPeerCycles([authShell, appReact, appForms])).toEqual([])
  })
})

describe('the app-auth-shell-react 3.0.0 incident', () => {
  const queue = [authShell, appReact, appForms].map((p) => ({
    ...p,
    peers: requiredMoleculePeers({
      peerDependencies: Object.fromEntries((p.peers ?? []).map((peer) => [peer.name, peer.range])),
    }),
  }))

  it('publishes the peer chain in dependency order and holds the shell until app-react lands', () => {
    const ordered = dependencyOrder(queue)
    expect(ordered.map((p) => p.name)).toEqual([
      '@molecule/app-forms',
      '@molecule/app-react',
      '@molecule/app-auth-shell-react',
    ])
    const queued = idsOf(ordered)
    const registry = new Map([
      ['@molecule/app-forms', []],
      ['@molecule/app-react', []],
    ])
    expect(
      missingDependency(ordered[2], {
        queued,
        published: idsOf([ordered[1]]),
        unknown: new Set(),
        registry,
      }),
    ).toBeNull()
    expect(
      missingDependency(ordered[2], { queued, published: new Set(), unknown: new Set(), registry }),
    ).toMatchObject({ name: '@molecule/app-react', range: '^3.0.0', why: 'not-published-yet' })
  })
})
