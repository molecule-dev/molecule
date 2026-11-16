/**
 * The deploy-rollout accessors: a provider is optional until bonded, and the
 * convenience functions delegate to it.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  getProvider,
  hasProvider,
  runInPlaceRollout,
  runRollout,
  setProvider,
} from '../provider.js'
import type { DeployRolloutProvider, RolloutOptions, RolloutOutcome } from '../types.js'

/**
 * A completed outcome that created, upstreamed, retired and failed nothing.
 * Typed over `never` because it mentions no instance, so it satisfies
 * `RolloutOutcome<I>` for whatever instance type the provider's generic `run`
 * was called with.
 */
const emptyOutcome: RolloutOutcome<never> = {
  status: 'completed',
  created: [],
  upstreams: [],
  retired: [],
  failures: [],
  rolledBack: [],
  rollbackFailures: [],
}

const fake = (): DeployRolloutProvider => ({
  name: 'fake',
  run: vi.fn(async () => emptyOutcome),
  runInPlace: vi.fn(async () => ({ applied: [], instances: [] })),
})

describe('deploy-rollout accessors', () => {
  it('reports whether a provider is bonded', () => {
    expect(hasProvider()).toBe(false)
  })

  it('throws a naming error when no provider is bonded', () => {
    expect(() => getProvider()).toThrow(/No deploy-rollout provider set/)
  })

  it('delegates run and runInPlace to the bonded provider', async () => {
    const provider = fake()
    setProvider(provider)
    expect(hasProvider()).toBe(true)
    const options: RolloutOptions = {
      provider: {
        create: vi.fn(),
        waitReady: vi.fn(),
        join: vi.fn(),
        leave: vi.fn(),
        drain: vi.fn(),
        destroy: vi.fn(),
      },
    }
    await runRollout(options)
    expect(provider.run).toHaveBeenCalledWith(options)
    await runInPlaceRollout({ machines: [{ id: 'a' }] })
    expect(provider.runInPlace).toHaveBeenCalled()
    expect(getProvider().name).toBe('fake')
  })
})
