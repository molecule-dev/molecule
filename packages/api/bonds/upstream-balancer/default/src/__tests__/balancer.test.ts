/**
 * The upstream balancer: per-host round-robin, passive failure cooldown,
 * retry-elsewhere and drain-awareness. Ported from the production edge's
 * characterisation suite, plus the drain rule the package adds.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import type { UpstreamMember } from '@molecule/api-upstream-balancer'

import { createProvider, DEFAULT_UPSTREAM_FAILURE_COOLDOWN_MS, upstreamKey } from '../provider.js'

interface Target extends UpstreamMember {
  tls: boolean
  alternates?: Target[]
}

const target = (name: string): Target => ({
  host: `${name}.fly.dev`,
  port: 443,
  tls: true,
})

/** A primary plus `names` as its siblings, flattened the way an edge stores them. */
const membersOf = (primary: string, ...names: string[]): Target[] => [
  target(primary),
  ...names.map(target),
]

describe('pick', () => {
  let clock = 1_000_000
  const now = (): number => clock

  beforeEach(() => {
    clock = 1_000_000
  })

  it('round-robins across the whole set, one member per request', () => {
    const balancer = createProvider({ now })
    const set = membersOf('a', 'b', 'c')
    const picks = [0, 1, 2, 3, 4].map(() => balancer.pick('h', set).host)
    expect(picks).toEqual(['a.fly.dev', 'b.fly.dev', 'c.fly.dev', 'a.fly.dev', 'b.fly.dev'])
  })

  it('keeps its cursor per host', () => {
    const balancer = createProvider({ now })
    const set = membersOf('a', 'b')
    expect(balancer.pick('one', set).host).toBe('a.fly.dev')
    expect(balancer.pick('two', set).host).toBe('a.fly.dev')
    expect(balancer.pick('one', set).host).toBe('b.fly.dev')
  })

  it('returns a single member unchanged, without advancing anything', () => {
    const balancer = createProvider({ now })
    const single = membersOf('a')
    expect(balancer.pick('h', single)).toBe(single[0])
    expect(balancer.pickRetry('h', single[0], single)).toBe(single[0])
  })

  it('skips a member whose last attempt failed, and lets it back after the cooldown', () => {
    const balancer = createProvider({ now })
    const set = membersOf('a', 'b', 'c')
    balancer.noteFailure(target('b'))
    expect(balancer.isSuspect(target('b'))).toBe(true)
    const picks = [0, 1, 2].map(() => balancer.pick('h', set).host)
    expect(picks).toEqual(['a.fly.dev', 'c.fly.dev', 'a.fly.dev'])
    clock += DEFAULT_UPSTREAM_FAILURE_COOLDOWN_MS + 1
    expect(balancer.isSuspect(target('b'))).toBe(false)
    expect([0, 1, 2].map(() => balancer.pick('h', set).host)).toContain('b.fly.dev')
  })

  it('still answers when every member is marked failed', () => {
    const balancer = createProvider({ now })
    const set = membersOf('a', 'b')
    balancer.noteFailure(target('a'))
    balancer.noteFailure(target('b'))
    expect(['a.fly.dev', 'b.fly.dev']).toContain(balancer.pick('h', set).host)
  })

  it('a success clears the failure mark', () => {
    const balancer = createProvider({ now })
    const member = target('a')
    balancer.noteFailure(member)
    expect(balancer.isSuspect(member)).toBe(true)
    balancer.noteSuccess(member)
    expect(balancer.isSuspect(member)).toBe(false)
  })

  it('skips a member the deploy marked as draining', () => {
    const balancer = createProvider({ now })
    const set = membersOf('a', 'b', 'c')
    balancer.markDraining(upstreamKey(target('a')))
    expect(balancer.isDraining(target('a'))).toBe(true)
    expect([0, 1, 2].map(() => balancer.pick('h', set).host)).toEqual([
      'b.fly.dev',
      'c.fly.dev',
      'b.fly.dev',
    ])
    balancer.clearDraining(upstreamKey(target('a')))
    expect(balancer.isDraining(target('a'))).toBe(false)
  })

  it('honours a draining flag carried on the member itself', () => {
    const balancer = createProvider({ now })
    const draining = { ...target('a'), draining: true }
    const set = [draining, target('b')]
    expect([0, 1].map(() => balancer.pick('h', set).host)).toEqual(['b.fly.dev', 'b.fly.dev'])
  })

  it('still answers when every member is draining', () => {
    const balancer = createProvider({ now })
    const set = membersOf('a', 'b')
    balancer.markDraining(upstreamKey(target('a')))
    balancer.markDraining(upstreamKey(target('b')))
    expect(['a.fly.dev', 'b.fly.dev']).toContain(balancer.pick('h', set).host)
  })

  it('prefers a member that is not draining over one that is', () => {
    const balancer = createProvider({ now })
    const set = membersOf('a', 'b', 'c')
    // The cursor starts at a, which is draining: b is the next eligible one.
    balancer.markDraining(upstreamKey(target('a')))
    expect(balancer.pick('h', set).host).toBe('b.fly.dev')
  })
})

describe('pickRetry', () => {
  const balancer = createProvider()

  it('never returns the upstream that just failed', () => {
    const set = membersOf('a', 'b', 'c')
    expect(balancer.pickRetry('h', target('a'), set).host).not.toBe('a.fly.dev')
  })

  it('prefers a member that is not itself marked failed', () => {
    const set = membersOf('a', 'b', 'c')
    balancer.noteFailure(target('b'))
    expect(balancer.pickRetry('h', target('a'), set).host).toBe('c.fly.dev')
    balancer.noteSuccess(target('b'))
  })

  it('has only one choice for a single instance', () => {
    const single = membersOf('a')
    expect(balancer.pickRetry('h', single[0], single).host).toBe('a.fly.dev')
  })
})

describe('reset', () => {
  it('drops cursors, failure marks and draining marks', () => {
    const clock = 1_000_000
    const balancer = createProvider({ now: () => clock })
    const set = membersOf('a', 'b')
    balancer.pick('h', set)
    balancer.noteFailure(target('b'))
    balancer.markDraining(upstreamKey(target('a')))
    balancer.reset()
    expect(balancer.isSuspect(target('b'))).toBe(false)
    expect(balancer.isDraining(target('a'))).toBe(false)
    expect(balancer.pick('h', set).host).toBe('a.fly.dev')
  })
})
