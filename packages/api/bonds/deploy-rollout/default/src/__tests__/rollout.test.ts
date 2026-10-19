/**
 * The grow-then-shrink state machine, driven by a fake provider that models the
 * edge's upstream set and records every call in order.
 */
import { describe, expect, it } from 'vitest'

import type { InstanceProvider, RolloutInstance } from '@molecule/api-deploy-rollout'

import {
  DEFAULT_ROLLOUT_DRAIN_MS,
  describeRolloutResult,
  RolloutAbortedError,
  runGrowThenShrink,
} from '../provider.js'

interface FakeOptions {
  /** Instances whose readiness gate answers false (by id). */
  unready?: string[]
  /** Steps that throw, by `${step}:${id}`. */
  failing?: string[]
  /** Replica ids in creation order. */
  ids?: string[]
  /** Instances already in the edge set when the roll starts. */
  initiallyServing?: string[]
  /** Instances already listed when resume asks. */
  listed?: RolloutInstance[]
}

/** The fake's handles, for assertions. */
interface FakeProviderHandle {
  provider: InstanceProvider<RolloutInstance>
  events: string[]
  serving: Set<string>
  servingSnapshots: number[]
  destroyed: string[]
}

/**
 * A provider that keeps a live "serving" set the way the edge would: an instance
 * serves once joined and stops when it leaves or is destroyed.
 */
const fakeProvider = (options: FakeOptions = {}): FakeProviderHandle => {
  const ids = options.ids ?? ['new-1', 'new-2', 'new-3']
  const events: string[] = []
  const serving = new Set<string>(options.initiallyServing ?? [])
  const servingSnapshots: number[] = []
  const destroyed: string[] = []
  let created = 0
  const fail = (step: string, instance: RolloutInstance): void => {
    if (options.failing?.includes(`${step}:${instance.id}`)) {
      throw new Error(`${step} refused ${instance.id}`)
    }
  }
  const record = (event: string): void => {
    events.push(event)
    servingSnapshots.push(serving.size)
  }
  const provider: InstanceProvider<RolloutInstance> = {
    name: 'fake',
    async create() {
      const instance = { id: ids[created++], upstreamUrl: `https://${ids[created - 1]}.fly.dev` }
      record(`create:${instance.id}`)
      fail('create', instance)
      return instance
    },
    async waitReady(instance) {
      record(`ready:${instance.id}`)
      fail('ready', instance)
      return !options.unready?.includes(instance.id)
    },
    async join(instance) {
      fail('join', instance)
      serving.add(instance.id)
      record(`join:${instance.id}`)
    },
    async leave(instance) {
      fail('leave', instance)
      serving.delete(instance.id)
      record(`leave:${instance.id}`)
    },
    async drain(instance, drainMs) {
      fail('drain', instance)
      record(`drain:${instance.id}:${drainMs}`)
    },
    async destroy(instance) {
      fail('destroy', instance)
      destroyed.push(instance.id)
      serving.delete(instance.id)
      record(`destroy:${instance.id}`)
    },
  }
  if (options.listed) provider.list = async () => options.listed ?? []
  return { provider, events, serving, servingSnapshots, destroyed }
}

const old = (id: string): RolloutInstance => ({ id, upstreamUrl: `https://${id}.fly.dev` })

describe('runGrowThenShrink', () => {
  it('creates every new instance and gates it READY before any old one is touched', async () => {
    const fake = fakeProvider({ initiallyServing: ['old-1', 'old-2'] })
    const current = [old('old-1'), old('old-2')]
    const result = await runGrowThenShrink({
      current,
      provider: fake.provider,
      // The caller already created and joined its primary.
      policy: { replicas: 3, drainMs: 1_000 },
    })

    expect(fake.events).toEqual([
      'create:new-1',
      'ready:new-1',
      'join:new-1',
      'create:new-2',
      'ready:new-2',
      'join:new-2',
      'leave:old-1',
      'drain:old-1:1000',
      'destroy:old-1',
      'leave:old-2',
      'drain:old-2:1000',
      'destroy:old-2',
    ])
    expect(result.upstreams.map((i) => i.id)).toEqual(['new-1', 'new-2'])
    expect(result.retired.map((i) => i.id)).toEqual(['old-1', 'old-2'])
    expect(result.failures).toEqual([])
  })

  it('aborts on a failed readiness gate, destroys what it created, and keeps the old set serving', async () => {
    const fake = fakeProvider({ unready: ['new-2'] })
    const current = [old('old-1'), old('old-2')]

    await expect(
      runGrowThenShrink({ current, provider: fake.provider, policy: { replicas: 3 } }),
    ).rejects.toBeInstanceOf(RolloutAbortedError)

    // new-1 was healthy and joined, then removed again; new-2 never joined.
    expect(fake.events).toContain('leave:new-1')
    expect(fake.destroyed.sort()).toEqual(['new-1', 'new-2'])
    // Not one old instance was touched.
    expect(fake.events.some((e) => e.includes('old-'))).toBe(false)
  })

  it('aborts on a create failure and keeps the old set serving', async () => {
    const fake = fakeProvider({ failing: ['create:new-2'] })
    const current = [old('old-1')]
    await expect(
      runGrowThenShrink({ current, provider: fake.provider, policy: { replicas: 3 } }),
    ).rejects.toMatchObject({ role: 'create' })
    expect(fake.events.some((e) => e.includes('old-'))).toBe(false)
    expect(fake.destroyed).toContain('new-1')
  })

  it('aborts when cancelled between replicas', async () => {
    const fake = fakeProvider()
    let checks = 0
    await expect(
      runGrowThenShrink({
        current: [old('old-1')],
        provider: fake.provider,
        policy: { replicas: 3 },
        isCancelled: () => {
          checks++
          return checks > 1
        },
      }),
    ).rejects.toMatchObject({ role: 'cancelled' })
    expect(fake.events.some((e) => e.includes('old-'))).toBe(false)
  })

  it('never leaves the edge set empty while retiring, even when a drain or destroy fails', async () => {
    const fake = fakeProvider({
      failing: ['drain:old-1', 'destroy:old-2'],
      initiallyServing: ['old-1', 'old-2'],
    })
    const current = [old('old-1'), old('old-2')]

    const result = await runGrowThenShrink({
      current,
      provider: fake.provider,
      policy: { replicas: 3, drainMs: 500 },
    })

    // Both new instances joined before the first old one left, so after every
    // single event the edge still had at least one upstream.
    expect(Math.min(...fake.servingSnapshots)).toBeGreaterThan(0)
    expect(fake.serving.has('new-1')).toBe(true)
    expect(fake.serving.has('new-2')).toBe(true)
    expect(fake.serving.has('old-1')).toBe(false)
    // A failed drain did not stop the destroy of that instance…
    expect(fake.destroyed).toContain('old-1')
    // …and a failed destroy did not stop the roll: the next old one was reached.
    expect(fake.events).toContain('drain:old-2:500')
    expect(result.failures.map((f) => `${f.step}:${f.instance.id}`)).toEqual([
      'drain:old-1',
      'destroy:old-2',
    ])
  })

  it('does nothing at all when the new set is one instance', async () => {
    const fake = fakeProvider()
    const result = await runGrowThenShrink({
      policy: { replicas: 1 },
      current: [old('old-1')],
      provider: fake.provider,
    })
    expect(fake.events).toEqual([])
    expect(result).toMatchObject({ status: 'completed', upstreams: [], retired: [], failures: [] })
  })

  it('uses the documented drain default', async () => {
    const fake = fakeProvider()
    await runGrowThenShrink({
      policy: { replicas: 2 },
      current: [old('old-1')],
      provider: fake.provider,
    })
    expect(fake.events).toContain(`drain:old-1:${DEFAULT_ROLLOUT_DRAIN_MS}`)
  })

  it('refuses to retire below the capacity floor', async () => {
    const fake = fakeProvider({ initiallyServing: ['old-1', 'old-2'] })
    const current = [old('old-1'), old('old-2')]
    // replicas 2 means ONE new instance is created here (the caller's primary is
    // the other). A floor of 3 can never be met by that set.
    const error = await runGrowThenShrink({
      policy: { replicas: 2, minHealthy: 3 },
      current,
      provider: fake.provider,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(RolloutAbortedError)
    expect(error as RolloutAbortedError).toMatchObject({ role: 'capacity' })
    // Nothing was touched: the capacity check runs before the first leave.
    expect(fake.events.some((event) => event.startsWith('leave:old'))).toBe(false)
    expect(fake.events.some((event) => event.startsWith('drain:old'))).toBe(false)
    expect(fake.events.some((event) => event.startsWith('join:'))).toBe(true)
  })

  it('soaks a joined instance for the full window before moving on', async () => {
    const events: string[] = []
    let clock = 0
    const instances = ['new-1', 'new-2', 'new-3']
    let created = 0
    const provider: InstanceProvider<RolloutInstance> = {
      name: 'soaking',
      async create() {
        const instance = { id: instances[created++] }
        events.push(`create:${instance.id}@${clock}`)
        return instance
      },
      async waitReady(instance) {
        events.push(`ready:${instance.id}`)
        return true
      },
      async isServing() {
        return true
      },
      async join(instance) {
        events.push(`join:${instance.id}`)
      },
      async leave() {},
      async drain() {},
      async destroy() {},
    }

    await runGrowThenShrink({
      policy: { replicas: 4, soakMs: 30_000, soakProbeMs: 2_000 },
      current: [old('old-1')],
      provider,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms
      },
    })

    // The second create happened only after the first instance had soaked for
    // the whole 30 s window; the third after another 30 s.
    expect(events[0]).toBe('create:new-1@0')
    const secondCreate = events.find((event) => event.startsWith('create:new-2'))
    const thirdCreate = events.find((event) => event.startsWith('create:new-3'))
    expect(secondCreate).toBe('create:new-2@30000')
    expect(thirdCreate).toBe('create:new-3@60000')
  })

  it('resumes idempotently: a completed rollout is a no-op', async () => {
    const listed = [old('a'), old('b')]
    const fake = fakeProvider({ listed, initiallyServing: ['a', 'b'] })
    const result = await runGrowThenShrink({
      policy: { replicas: 2 },
      current: [],
      provider: { ...fake.provider, isServing: async () => true },
    })
    expect(result.upstreams.map((instance) => instance.id)).toEqual(['a', 'b'])
    expect(fake.events).toEqual([])
  })

  it('does not call a larger set complete: extra instances are still rolled', async () => {
    const listed = [old('a'), old('b'), old('c')]
    const fake = fakeProvider({ listed, initiallyServing: ['a', 'b', 'c'] })
    const result = await runGrowThenShrink({
      policy: { replicas: 2 },
      current: [old('old-1')],
      provider: { ...fake.provider, isServing: async () => true },
    })
    // Three instances is not the target two, so the roll runs instead of
    // declaring itself complete; the old one is retired.
    expect(fake.events).toContain('leave:old-1')
    expect(result.upstreams.map((instance) => instance.id)).toEqual(['new-1'])
  })

  it('rolls anyway when listing the current instances fails', async () => {
    const fake = fakeProvider()
    const provider: InstanceProvider<RolloutInstance> = {
      ...fake.provider,
      list: async () => {
        throw new Error('listing unavailable')
      },
    }
    const result = await runGrowThenShrink({
      policy: { replicas: 2 },
      current: [old('old-1')],
      provider,
    })
    expect(result.upstreams.map((instance) => instance.id)).toEqual(['new-1'])
  })
})

describe('describeRolloutResult', () => {
  it('says nothing for a single-instance deploy', () => {
    expect(describeRolloutResult({ retired: [] }, 1)).toBeNull()
  })

  it('states the count and what happened to the old copies', () => {
    const line = describeRolloutResult({ retired: [old('old-1'), old('old-2')] }, 2)
    expect(line).toBe(
      'Running 2 copies of this app. Replaced 2 old copies one at a time; each was told to finish its requests first.',
    )
  })
})
