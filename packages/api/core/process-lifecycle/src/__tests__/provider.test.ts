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
  registerReadinessCheck,
  registerShutdownHook,
  runShutdownHooks,
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
    const unregister = () => {}
    vi.mocked(provider.registerReadinessCheck).mockReturnValue(unregister)

    const check = { name: 'db', check: () => true }
    expect(registerReadinessCheck(check)).toBe(unregister)
    expect(provider.registerReadinessCheck).toHaveBeenCalledWith(check)
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
})
