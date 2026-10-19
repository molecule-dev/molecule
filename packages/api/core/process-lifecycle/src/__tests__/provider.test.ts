import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearProviders } from '@molecule/api-bond'

import {
  beginRequest,
  getProvider,
  hasProvider,
  inFlightRequests,
  isDraining,
  isLive,
  isReady,
  isWarm,
  registerDrainHook,
  registerLivenessCheck,
  registerReadinessCheck,
  registerShutdownHook,
  registerWarmupStep,
  resetRegistrationsForTests,
  runDrainHooks,
  runShutdownHooks,
  runWarmup,
  setProvider,
  startDraining,
} from '../index.js'
import type { ProcessLifecycleProvider, ReadinessReport } from '../types.js'

/** A provider double that records the calls the accessors should delegate. */
function makeProvider(): ProcessLifecycleProvider {
  const readyReport: ReadinessReport = {
    ready: true,
    state: 'ready',
    draining: false,
    warm: true,
    inFlightRequests: 2,
    checks: [],
  }
  return {
    state: vi.fn(() => 'ready'),
    markReady: vi.fn(),
    isDraining: vi.fn(() => true),
    startDraining: vi.fn(),
    beginRequest: vi.fn(() => () => {}),
    inFlightRequests: vi.fn(() => 2),
    waitForRequestsToDrain: vi.fn(async () => true),
    registerReadinessCheck: vi.fn(() => () => {}),
    registerLivenessCheck: vi.fn(() => () => {}),
    registerShutdownHook: vi.fn(() => () => {}),
    registerWarmupStep: vi.fn(() => () => {}),
    runWarmup: vi.fn(async () => ({ ok: true, durationMs: 1, steps: [] })),
    isWarm: vi.fn(() => true),
    registerDrainHook: vi.fn(() => () => {}),
    runDrainHooks: vi.fn(async () => []),
    isReady: vi.fn(async () => readyReport),
    isLive: vi.fn(async () => ({ live: true, state: 'ready' as const, uptimeMs: 1, checks: [] })),
    runShutdownHooks: vi.fn(async () => ({
      state: 'stopped' as const,
      durationMs: 1,
      inFlightAtStart: 0,
      hooks: [],
    })),
  }
}

describe('@molecule/api-process-lifecycle provider accessors', () => {
  beforeEach(() => {
    clearProviders()
    resetRegistrationsForTests()
  })

  it('reports no provider before one is bonded', () => {
    expect(hasProvider()).toBe(false)
  })

  it('throws a naming error when no provider is bonded', () => {
    expect(() => getProvider()).toThrow(/No process-lifecycle provider set/)
  })

  it('bonds a provider and reports it as present', () => {
    setProvider(makeProvider())
    expect(hasProvider()).toBe(true)
  })

  it('delegates registerReadinessCheck to the bonded provider', () => {
    const provider = makeProvider()
    setProvider(provider)
    const unregister = vi.fn()
    vi.mocked(provider.registerReadinessCheck).mockReturnValue(unregister)

    const check = { name: 'db', check: () => true }
    const remove = registerReadinessCheck(check)
    expect(provider.registerReadinessCheck).toHaveBeenCalledWith(check)

    // The accessor returns its own remover, which cancels the registration and
    // calls the provider's remover exactly once.
    remove()
    expect(unregister).toHaveBeenCalledTimes(1)
    remove()
    expect(unregister).toHaveBeenCalledTimes(1)
  })

  it('delegates registerShutdownHook to the bonded provider', () => {
    const provider = makeProvider()
    setProvider(provider)

    const hook = { name: 'pool', run: () => {} }
    registerShutdownHook(hook)
    expect(provider.registerShutdownHook).toHaveBeenCalledWith(hook)
  })

  it('delegates isReady / isLive / isDraining / startDraining', async () => {
    const provider = makeProvider()
    setProvider(provider)

    expect((await isReady()).ready).toBe(true)
    expect((await isLive()).live).toBe(true)
    expect(isDraining()).toBe(true)
    startDraining('SIGTERM')

    expect(provider.isDraining).toHaveBeenCalled()
    expect(provider.startDraining).toHaveBeenCalledWith('SIGTERM')
  })

  it('delegates request tracking and shutdown hooks', async () => {
    const provider = makeProvider()
    setProvider(provider)

    const release = beginRequest()
    expect(typeof release).toBe('function')
    expect(inFlightRequests()).toBe(2)
    expect((await runShutdownHooks('SIGTERM')).state).toBe('stopped')

    expect(provider.beginRequest).toHaveBeenCalled()
    expect(provider.inFlightRequests).toHaveBeenCalled()
    expect(provider.runShutdownHooks).toHaveBeenCalledWith('SIGTERM')
  })

  it('queues a registration made before any provider is bonded, then applies it', () => {
    const check = { name: 'database', check: () => true }
    const unregister = registerReadinessCheck(check)
    expect(typeof unregister).toBe('function')

    const provider = makeProvider()
    setProvider(provider)

    expect(provider.registerReadinessCheck).toHaveBeenCalledWith(check)
  })

  it('delegates warm-up steps and drain hooks to the bonded provider', async () => {
    const provider = makeProvider()
    setProvider(provider)

    const step = { name: 'module-graph', run: () => {} }
    const drain = { name: 'checkpoint', run: () => {} }
    registerWarmupStep(step)
    registerDrainHook(drain)
    expect((await runWarmup()).ok).toBe(true)
    expect(isWarm()).toBe(true)
    expect(await runDrainHooks('SIGTERM')).toEqual([])

    expect(provider.registerWarmupStep).toHaveBeenCalledWith(step)
    expect(provider.registerDrainHook).toHaveBeenCalledWith(drain)
    expect(provider.runWarmup).toHaveBeenCalled()
    expect(provider.isWarm).toHaveBeenCalled()
    expect(provider.runDrainHooks).toHaveBeenCalledWith('SIGTERM')
  })

  it('queues warm-up steps and drain hooks registered before any provider is bonded', () => {
    const step = { name: 'module-graph', run: () => {} }
    const drain = { name: 'checkpoint', run: () => {} }
    registerWarmupStep(step)
    registerDrainHook(drain)

    const provider = makeProvider()
    setProvider(provider)

    expect(provider.registerWarmupStep).toHaveBeenCalledWith(step)
    expect(provider.registerDrainHook).toHaveBeenCalledWith(drain)
  })

  it('queues liveness checks and shutdown hooks the same way', () => {
    const liveness = { name: 'event-loop', check: () => true }
    const hook = { name: 'database-pool', run: () => {} }
    registerLivenessCheck(liveness)
    registerShutdownHook(hook)

    const provider = makeProvider()
    setProvider(provider)

    expect(provider.registerLivenessCheck).toHaveBeenCalledWith(liveness)
    expect(provider.registerShutdownHook).toHaveBeenCalledWith(hook)
  })

  it('applies a queued registration to a provider bonded later and honors unregister', () => {
    const hook = { name: 'database-pool', run: () => {} }
    const unregister = registerShutdownHook(hook)

    const first = makeProvider()
    setProvider(first)
    expect(first.registerShutdownHook).toHaveBeenCalledTimes(1)

    unregister()
    // A replacement provider never receives the cancelled registration.
    const second = makeProvider()
    setProvider(second)
    expect(second.registerShutdownHook).not.toHaveBeenCalled()
  })
})
