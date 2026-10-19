import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProcessLifecycleProvider } from '@molecule/api-process-lifecycle'

import {
  checkHealthcheckConsistency,
  installGracefulShutdown,
  resolveFlipWaitMs,
  resolveHealthcheckDeclaration,
} from '../index.js'

/** A `ClosableServer` double recording the order of the calls that matter. */
function serverDouble(events: Array<{ at: number; what: string }>) {
  return {
    close: () => void events.push({ at: Date.now(), what: 'close' }),
    closeIdleConnections: () => void events.push({ at: Date.now(), what: 'closeIdle' }),
    closeAllConnections: () => void events.push({ at: Date.now(), what: 'closeAll' }),
  }
}

/** A provider double: only the members the shutdown sequence touches. */
function providerDouble(
  overrides: Partial<ProcessLifecycleProvider> = {},
): ProcessLifecycleProvider {
  return {
    startDraining: vi.fn(),
    inFlightRequests: () => 0,
    runDrainHooks: vi.fn(async () => []),
    waitForRequestsToDrain: async () => true,
    runShutdownHooks: vi.fn(async () => ({
      state: 'stopped',
      durationMs: 0,
      inFlightAtStart: 0,
      hooks: [],
    })),
    ...overrides,
  } as unknown as ProcessLifecycleProvider
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('health-check consistency', () => {
  it('returns nothing when the application declares no load-balancer check', () => {
    expect(resolveHealthcheckDeclaration()).toEqual({})
    expect(checkHealthcheckConsistency({ declaration: {}, flipWaitMs: 0 })).toBeNull()
  })

  it('derives the flip window from the declared interval (3 x interval + timeout + margin)', () => {
    const declaration = { intervalMs: 5_000, timeoutMs: 3_000 }
    expect(resolveFlipWaitMs({ declaration })).toBe(20_000)
  })

  it('prefers an explicit window and an explicit environment value', () => {
    const declaration = { intervalMs: 5_000, timeoutMs: 3_000 }
    expect(resolveFlipWaitMs({ declaration, flipWaitMs: 1_000 })).toBe(1_000)

    vi.stubEnv('SHUTDOWN_LB_FLIP_WAIT_MS', '25000')
    expect(resolveFlipWaitMs({ declaration })).toBe(25_000)
  })

  it('warns, naming both numbers and the fix, when the window is too short', () => {
    const warning = checkHealthcheckConsistency({
      declaration: { intervalMs: 5_000, timeoutMs: 3_000 },
      flipWaitMs: 5_000,
    })

    expect(warning).not.toBeNull()
    expect(warning).toContain('every 5000ms')
    expect(warning).toContain('only 5000ms')
    expect(warning).toContain('at least 13000ms')
    expect(warning).toContain('SHUTDOWN_LB_FLIP_WAIT_MS=20000')
  })

  it('accepts a window that covers two failed checks', () => {
    expect(
      checkHealthcheckConsistency({
        declaration: { intervalMs: 5_000, timeoutMs: 3_000 },
        flipWaitMs: 13_000,
      }),
    ).toBeNull()
  })
})

describe('drain hooks and the flip window', () => {
  it('runs the drain hooks before the flip window', async () => {
    const events: Array<{ at: number; what: string }> = []
    const provider = providerDouble({
      runDrainHooks: vi.fn(async () => {
        events.push({ at: Date.now(), what: 'drainHooks' })
        return []
      }),
    })
    const exit = vi.fn()

    const handle = installGracefulShutdown({
      server: serverDouble(events),
      provider,
      flipWaitMs: 50,
      drainTimeoutMs: 10,
      signals: [],
      exit,
    })
    await handle.stop('SIGTERM')

    const drainAt = events.find((event) => event.what === 'drainHooks')?.at ?? 0
    const closeAt = events.find((event) => event.what === 'close')?.at ?? 0
    expect(closeAt - drainAt).toBeGreaterThanOrEqual(40)
    expect(exit).toHaveBeenCalledWith(0)
  })

  it('still holds the flip window when a drain hook throws', async () => {
    const events: Array<{ at: number; what: string }> = []
    const provider = providerDouble({
      runDrainHooks: vi.fn(async () => {
        events.push({ at: Date.now(), what: 'drainHooks' })
        throw new Error('checkpoint failed')
      }),
    })
    const exit = vi.fn()

    const handle = installGracefulShutdown({
      server: serverDouble(events),
      provider,
      flipWaitMs: 50,
      drainTimeoutMs: 10,
      signals: [],
      exit,
    })
    await handle.stop('SIGTERM')

    const drainAt = events.find((event) => event.what === 'drainHooks')?.at ?? 0
    const closeAt = events.find((event) => event.what === 'close')?.at ?? 0
    // The window ran even though the prologue failed, and the shutdown completed.
    expect(closeAt - drainAt).toBeGreaterThanOrEqual(40)
    expect(exit).toHaveBeenCalledWith(0)
  })

  it('reaps idle keep-alive sockets only after the flip window', async () => {
    const events: Array<{ at: number; what: string }> = []
    const exit = vi.fn()

    const handle = installGracefulShutdown({
      server: serverDouble(events),
      provider: providerDouble(),
      flipWaitMs: 40,
      drainTimeoutMs: 10,
      signals: [],
      exit,
    })
    const startedAt = Date.now()
    await handle.stop('SIGTERM')

    const idle = events.find((event) => event.what === 'closeIdle')
    expect(idle).toBeDefined()
    expect((idle?.at ?? 0) - startedAt).toBeGreaterThanOrEqual(30)
  })
})
