import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearProviders } from '@molecule/api-bond'

import {
  acquireLeadership,
  getProvider,
  hasProvider,
  isLeader,
  leadershipState,
  releaseLeadership,
  setProvider,
} from '../index.js'
import type {
  AcquireLeadershipOptions,
  InstanceLeadershipProvider,
  LeadershipState,
} from '../types.js'

/** A provider double that records the calls the accessors should delegate. */
function makeProvider(): InstanceLeadershipProvider {
  return {
    isLeader: vi.fn(() => true),
    state: vi.fn((): LeadershipState => 'leader'),
    acquire: vi.fn(),
    release: vi.fn(async () => {}),
  }
}

describe('@molecule/api-instance-leadership provider accessors', () => {
  beforeEach(() => {
    clearProviders()
  })

  it('reports no provider before one is bonded', () => {
    expect(hasProvider()).toBe(false)
  })

  it('answers isLeader() false and a follower state with no provider', () => {
    expect(isLeader()).toBe(false)
    expect(leadershipState()).toBe('follower')
  })

  it('throws a naming error when acquire is called with no provider', () => {
    expect(() => acquireLeadership({ onAcquired: () => {} })).toThrow(
      /No instance-leadership provider set/,
    )
  })

  it('bonds a provider and reports it as present', () => {
    setProvider(makeProvider())
    expect(hasProvider()).toBe(true)
  })

  it('delegates leadership facts and acquisition to the bonded provider', () => {
    const provider = makeProvider()
    setProvider(provider)
    const options: AcquireLeadershipOptions = { onAcquired: () => {} }

    expect(getProvider()).toBe(provider)
    expect(isLeader()).toBe(true)
    expect(leadershipState()).toBe('leader')

    acquireLeadership(options)
    expect(provider.acquire).toHaveBeenCalledWith(options)
  })

  it('delegates release to the bonded provider', async () => {
    const provider = makeProvider()
    setProvider(provider)
    await releaseLeadership()
    expect(provider.release).toHaveBeenCalledTimes(1)
  })

  it('makes release a no-op when no provider is bonded', async () => {
    await expect(releaseLeadership()).resolves.toBeUndefined()
  })
})
