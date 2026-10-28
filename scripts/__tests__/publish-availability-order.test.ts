/**
 * A requirement npm ACKNOWLEDGED but does not serve yet is neither satisfied
 * nor knowably absent. `npm publish` answers the PUT before the registry lists
 * the version (mlcl Release 40614006613 acknowledged 2.1.19 at 01:23:10Z while
 * its packument still 404'd it ten minutes later, 2026-10-28), so a dependent
 * published on that ACK installs nowhere — the ETARGET class the required-peer
 * ordering exists to prevent, entered through the registry's read lag instead
 * of through queue order.
 *
 * These are the owning gate rules, exercised directly. The publisher's actual
 * callsite (ACK → confirmation → gate) is covered by
 * `publish-availability-caller.test.ts`; the two files exist separately so a
 * helper-only correction cannot pass while the producer still trusts the ACK.
 */
import { describe, expect, it } from 'vitest'

import {
  exactMoleculeDeps,
  missingDependency,
  requiredMoleculePeers,
} from '../lib/publish-order.mjs'

/** A package as `discover()` presents it to the gate. */
function publishable(manifest: Record<string, unknown>) {
  return {
    name: manifest.name as string,
    version: manifest.version as string,
    deps: exactMoleculeDeps(manifest),
    peers: requiredMoleculePeers(manifest),
  }
}

/** The version this run uploaded, npm acknowledged, and no read has seen served. */
const ACKED = '@molecule/app-react@3.0.0'
const awaiting = (state: 'pending' | 'unknown') => new Map([[ACKED, state]])

const consumerWithDependency = publishable({
  name: '@molecule/api-storefront',
  version: '2.0.0',
  dependencies: { '@molecule/app-react': '3.0.0' },
})

const consumerWithPeer = publishable({
  name: '@molecule/app-storefront',
  version: '3.0.0',
  peerDependencies: { '@molecule/app-react': '^3.0.0' },
})

describe('an acknowledged version the registry does not serve yet', () => {
  it('blocks an exact dependency with a pending state, not a known absence', () => {
    expect(
      missingDependency(consumerWithDependency, {
        queued: new Set([ACKED]),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', ['2.9.0']]]),
        awaiting: awaiting('pending'),
      }),
    ).toEqual({ name: '@molecule/app-react', version: '3.0.0', why: 'not-served-yet' })
  })

  it('blocks an exact dependency whose confirming read failed as registry-unknown', () => {
    expect(
      missingDependency(consumerWithDependency, {
        queued: new Set([ACKED]),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', null]]),
        awaiting: awaiting('unknown'),
      }),
    ).toEqual({ name: '@molecule/app-react', version: '3.0.0', why: 'registry-unknown' })
  })

  it('blocks a required peer with a pending state, not "not published yet"', () => {
    expect(
      missingDependency(consumerWithPeer, {
        queued: new Set([ACKED]),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', ['2.9.0']]]),
        awaiting: awaiting('pending'),
      }),
    ).toMatchObject({
      kind: 'peer',
      name: '@molecule/app-react',
      range: '^3.0.0',
      version: '3.0.0',
      why: 'not-served-yet',
    })
  })

  it('admits the requirement once a later read sees the version served', () => {
    expect(
      missingDependency(consumerWithDependency, {
        queued: new Set([ACKED]),
        published: new Set(),
        unknown: new Set(),
        // The gate's own confirmation re-read saw it: the bookkeeping set has
        // not caught up, and the install-time question is what npm serves.
        registry: new Map([['@molecule/app-react', ['2.9.0', '3.0.0']]]),
        awaiting: new Map(),
      }),
    ).toBeNull()
    expect(
      missingDependency(consumerWithPeer, {
        queued: new Set([ACKED]),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', ['2.9.0', '3.0.0']]]),
        awaiting: awaiting('pending'),
      }),
    ).toBeNull()
  })
})

describe('the availability rule keeps the accepted behaviour', () => {
  it('lets a compatible served alternative carry the package despite an unserved queued major', () => {
    // ^2.0.0 is served by 2.5.0; the queued 3.0.0 is acknowledged and NOT
    // served. The dependent must progress on the served version and must never
    // be blocked by — or exposed to — the unserved major.
    expect(
      missingDependency(
        { ...consumerWithPeer, peers: [{ name: '@molecule/app-react', range: '^2.0.0' }] },
        {
          queued: new Set([ACKED]),
          published: new Set(),
          unknown: new Set(),
          registry: new Map([['@molecule/app-react', ['2.5.0']]]),
          awaiting: awaiting('pending'),
        },
      ),
    ).toBeNull()
  })

  it('never blocks on an optional peer, even while its queued version is unserved', () => {
    const optional = publishable({
      name: '@molecule/app-optional',
      version: '1.0.0',
      peerDependencies: { '@molecule/app-react': '^3.0.0' },
      peerDependenciesMeta: { '@molecule/app-react': { optional: true } },
    })
    expect(optional.peers).toEqual([])
    expect(
      missingDependency(optional, {
        queued: new Set([ACKED]),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', []]]),
        awaiting: awaiting('pending'),
      }),
    ).toBeNull()
  })

  it('still reports a queued peer nobody acknowledged as a known absence', () => {
    expect(
      missingDependency(consumerWithPeer, {
        queued: new Set([ACKED]),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', ['2.9.0']]]),
      }),
    ).toMatchObject({ why: 'not-published-yet', version: '3.0.0' })
  })

  it('still blocks a queued exact dependency that was never acknowledged', () => {
    expect(
      missingDependency(consumerWithDependency, {
        queued: new Set([ACKED]),
        published: new Set(),
        unknown: new Set(),
        registry: new Map([['@molecule/app-react', ['2.9.0']]]),
      }),
    ).toEqual({ name: '@molecule/app-react', version: '3.0.0' })
  })
})
