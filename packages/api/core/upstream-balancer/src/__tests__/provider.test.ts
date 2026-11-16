/**
 * The upstream-balancer accessors: a provider is optional until bonded, and the
 * convenience functions delegate to it.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  getProvider,
  hasProvider,
  noteUpstreamFailure,
  pickRetryUpstream,
  pickUpstream,
  resetUpstreamBalancerForTest,
  setProvider,
  upstreamDraining,
  upstreamSuspect,
} from '../provider.js'
import type { UpstreamBalancerProvider, UpstreamMember } from '../types.js'

const member: UpstreamMember = { host: 'a.fly.dev', port: 443 }

/**
 * The selection fake answers with the host's primary member. It is a generic
 * function rather than a `vi.fn` because Vitest's `Mock<T>` instantiates a
 * generic function's parameters and return type at the constraint, so a mock
 * cannot stand in for a generic method.
 *
 * @param _host - Unused public host.
 * @param members - The host's upstreams.
 * @returns The member the request would go to.
 */
const pickPrimary = <U extends UpstreamMember>(_host: string, members: readonly U[]): U => {
  return members[0]
}

/**
 * The retry fake answers with the host's primary member, like `pickPrimary`.
 *
 * @param _host - Unused public host.
 * @param _avoid - Unused member the failed attempt addressed.
 * @param members - The host's upstreams.
 * @returns The member for the next attempt.
 */
const pickPrimaryRetry = <U extends UpstreamMember>(
  _host: string,
  _avoid: U,
  members: readonly U[],
): U => {
  return members[0]
}

const fake = (): UpstreamBalancerProvider => ({
  name: 'fake',
  pick: pickPrimary,
  pickRetry: pickPrimaryRetry,
  noteFailure: vi.fn(),
  noteSuccess: vi.fn(),
  isSuspect: vi.fn(() => true),
  markDraining: vi.fn(),
  clearDraining: vi.fn(),
  isDraining: vi.fn(() => false),
  reset: vi.fn(),
})

describe('upstream-balancer accessors', () => {
  it('reports whether a provider is bonded', () => {
    expect(hasProvider()).toBe(false)
  })

  it('throws a naming error when no provider is bonded', () => {
    expect(() => getProvider()).toThrow(/No upstream-balancer provider set/)
  })

  it('delegates every accessor to the bonded provider', () => {
    const provider = fake()
    setProvider(provider)
    expect(pickUpstream('h', [member])).toBe(member)
    expect(pickRetryUpstream('h', member, [member])).toBe(member)
    noteUpstreamFailure(member)
    expect(upstreamSuspect(member)).toBe(true)
    expect(upstreamDraining(member)).toBe(false)
    resetUpstreamBalancerForTest()
    expect(getProvider().name).toBe('fake')
  })
})
