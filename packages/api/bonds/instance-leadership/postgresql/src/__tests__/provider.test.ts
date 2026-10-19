import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  AcquireLeadershipOptions,
  InstanceLeadershipProvider,
  LeaderLockSession,
} from '@molecule/api-instance-leadership'

import { createProvider } from '../provider.js'

/** One shared lock — stands in for PostgreSQL's single advisory lock. */
let holder: string | null = null

/** Every session the factories handed out, newest last, per instance name. */
const sessionsByInstance = new Map<string, FakeSession[]>()

/** Every provider created by a test, so afterEach can stop its retry loop. */
const createdProviders: InstanceLeadershipProvider[] = []
/** A fake session that can be told its connection died. */
class FakeSession implements LeaderLockSession {
  private lostHandler: (() => void) | null = null
  /** Set once the fake "connection" is gone; a dead session never locks. */
  dead = false

  /**
   * @param id - This session's identity in the shared lock.
   */
  constructor(private readonly id: string) {}

  /** {@inheritDoc LeaderLockSession.tryLock} */
  async tryLock(): Promise<boolean> {
    if (this.dead) return false
    if (holder === null) {
      holder = this.id
      return true
    }
    return false
  }

  /** {@inheritDoc LeaderLockSession.release} */
  async release(): Promise<void> {
    if (holder === this.id) holder = null
  }

  /** {@inheritDoc LeaderLockSession.onLost} */
  onLost(handler: () => void): void {
    this.lostHandler = handler
  }

  /**
   * Simulate the connection dying: PostgreSQL releases the session's lock and
   * the provider hears about it.
   */
  die(): void {
    this.dead = true
    if (holder === this.id) holder = null
    this.lostHandler?.()
  }
}

/**
 * Create an instance that shares the one lock, recording its sessions.
 *
 * @param name - The instance name (prefixes its session ids).
 * @returns The provider and a function returning its newest session.
 */
function makeInstance(name: string) {
  let next = 0
  sessionsByInstance.set(name, [])
  const provider = createProvider({
    retryMs: 50,
    createSession: async () => {
      const session = new FakeSession(`${name}-session-${next++}`)
      sessionsByInstance.get(name)?.push(session)
      return session
    },
  })
  createdProviders.push(provider)
  const latestSession = (): FakeSession | undefined => sessionsByInstance.get(name)?.at(-1)
  return { provider, latestSession }
}

/** Wait until `cond` is true (poll), bounded so a regression fails fast. */
async function waitUntil(cond: () => boolean, timeoutMs = 3_000): Promise<void> {
  const start = Date.now()
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitUntil timed out')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

afterEach(async () => {
  // Stop every retry loop a test left running, or an abandoned leader keeps
  // contending on the shared fake lock and poisons the following tests.
  await Promise.all(createdProviders.splice(0).map((provider) => provider.release()))
  holder = null
  sessionsByInstance.clear()
})

describe('@molecule/api-instance-leadership-postgresql provider', () => {
  it('acquires the lock and runs onAcquired exactly once', async () => {
    const { provider } = makeInstance('a')
    const onAcquired = vi.fn()
    provider.acquire({ onAcquired })
    await waitUntil(() => provider.isLeader())
    expect(onAcquired).toHaveBeenCalledTimes(1)
    expect(provider.state()).toBe('leader')

    // Idempotent: a second acquire while leading does nothing.
    provider.acquire({ onAcquired })
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(onAcquired).toHaveBeenCalledTimes(1)

    await provider.release()
    expect(provider.state()).toBe('stopped')
    expect(holder).toBeNull()
  })

  it('two simulated instances elect exactly one leader', async () => {
    const first = makeInstance('one')
    const second = makeInstance('two')
    const firstAcquired = vi.fn()
    const secondAcquired = vi.fn()

    first.provider.acquire({ onAcquired: firstAcquired })
    second.provider.acquire({ onAcquired: secondAcquired })

    await waitUntil(() => first.provider.isLeader() || second.provider.isLeader())
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(first.provider.isLeader()).not.toBe(second.provider.isLeader())
    expect([firstAcquired, secondAcquired].filter((fn) => fn.mock.calls.length > 0)).toHaveLength(1)

    await first.provider.release()
    await second.provider.release()
  })

  it('a follower takes over seconds after the leader dies', async () => {
    holder = 'other-machine'
    const { provider, latestSession } = makeInstance('follower')
    const onAcquired = vi.fn()
    provider.acquire({ onAcquired })

    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(provider.isLeader()).toBe(false)
    expect(onAcquired).not.toHaveBeenCalled()
    expect(latestSession()).toBeDefined()

    // The other Machine's connection ends → PostgreSQL frees the lock.
    holder = null
    await waitUntil(() => provider.isLeader())
    expect(onAcquired).toHaveBeenCalledTimes(1)

    await provider.release()
  })

  it('a leader that loses its connection stops its loops and may lead again', async () => {
    const { provider, latestSession } = makeInstance('leader')
    const onAcquired = vi.fn()
    const onLost = vi.fn()
    provider.acquire({ onAcquired, onLost })
    await waitUntil(() => provider.isLeader())
    expect(onAcquired).toHaveBeenCalledTimes(1)

    latestSession()?.die()
    expect(provider.isLeader()).toBe(false)
    await waitUntil(() => onLost.mock.calls.length === 1)
    expect(onLost).toHaveBeenCalledTimes(1)

    // The retry opens a fresh session and wins the now-free lock again.
    await waitUntil(() => provider.isLeader())
    expect(onAcquired).toHaveBeenCalledTimes(2)

    await provider.release()
  })

  it('a follower whose session dies reconnects without claiming leadership', async () => {
    holder = 'other-machine'
    const { provider, latestSession } = makeInstance('follower')
    const onAcquired = vi.fn()
    const onLost = vi.fn()
    provider.acquire({ onAcquired, onLost })

    await new Promise((resolve) => setTimeout(resolve, 120))
    latestSession()?.die()

    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(provider.isLeader()).toBe(false)
    expect(onLost).not.toHaveBeenCalled()

    holder = null
    await waitUntil(() => provider.isLeader())
    expect(onAcquired).toHaveBeenCalledTimes(1)

    await provider.release()
  })

  it('keeps retrying when the store is unreachable, then acquires', async () => {
    let attempts = 0
    const provider = createProvider({
      retryMs: 50,
      createSession: async () => {
        attempts += 1
        if (attempts < 3) throw new Error('connect ECONNREFUSED')
        return new FakeSession('recovered')
      },
    })
    createdProviders.push(provider)
    const onAcquired = vi.fn()
    provider.acquire({ onAcquired })

    await waitUntil(() => provider.isLeader(), 5_000)
    expect(attempts).toBeGreaterThanOrEqual(3)
    expect(onAcquired).toHaveBeenCalledTimes(1)

    await provider.release()
  })

  it('release is a no-op after release, and acquire after release does nothing', async () => {
    const { provider } = makeInstance('released')
    const onAcquired = vi.fn()
    provider.acquire({ onAcquired })
    await waitUntil(() => provider.isLeader())
    await provider.release()

    provider.acquire({ onAcquired })
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(provider.isLeader()).toBe(false)
    expect(provider.state()).toBe('stopped')
    expect(onAcquired).toHaveBeenCalledTimes(1)
  })

  it('stops acquiring after release even with a retry scheduled', async () => {
    holder = 'other-machine'
    const { provider } = makeInstance('stop')
    const onAcquired: AcquireLeadershipOptions['onAcquired'] = vi.fn()
    provider.acquire({ onAcquired })
    await new Promise((resolve) => setTimeout(resolve, 120))

    holder = null
    await provider.release()
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(provider.isLeader()).toBe(false)
    expect(onAcquired).not.toHaveBeenCalled()
  })
})
